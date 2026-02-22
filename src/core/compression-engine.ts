import { mkdtemp, rename, rm, readdir, stat } from "node:fs/promises";
import { join, parse, resolve } from "node:path";
import { tmpdir } from "node:os";
import pLimit from "p-limit";
import { compressImage } from "../services/image-compressor.service";
import { compressPdf } from "../services/pdf-compressor.service";
import { detectSupportedFileType } from "../utils/file-detect";
import { buildDefaultOutputPath, buildOutputPathInDir } from "../utils/path";
import { logWarn } from "../utils/logger";
import type { CompressionJob, CompressionPreset, CompressionResult } from "../types/compression";

const MAX_TARGET_ATTEMPTS = 6;
const QUALITY_FLOOR = 25;

export interface EngineOptions {
  outputDir?: string;
  concurrency?: number;
  onProgress?: (event: { completed: number; total: number; result: CompressionResult }) => void;
}

export async function runCompressionEngine(
  inputPaths: string[],
  preset: CompressionPreset,
  options: EngineOptions = {}
): Promise<CompressionResult[]> {
  const jobs = await buildCompressionJobs(inputPaths, preset, options.outputDir);
  const results: CompressionResult[] = [];
  const limit = pLimit(Math.max(1, options.concurrency ?? 4));
  let completed = 0;

  await Promise.all(
    jobs.map((job) =>
      limit(async () => {
        const result = await compressJob(job);
        results.push(result);
        completed += 1;
        options.onProgress?.({ completed, total: jobs.length, result });
      })
    )
  );

  return results;
}

async function compressJob(job: CompressionJob): Promise<CompressionResult> {
  if (!job.preset.targetSizeBytes || job.fileType !== "image") {
    return job.fileType === "image" ? compressImage(job) : compressPdf(job);
  }

  return compressToTargetSize(job);
}

async function compressToTargetSize(job: CompressionJob): Promise<CompressionResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "squish-target-"));
  const preferredOutput = job.outputPath ?? buildDefaultOutputPath(job.inputPath);
  const requestedTarget = job.preset.targetSizeBytes ?? 0;

  let bestResult: CompressionResult | null = null;
  let low = QUALITY_FLOOR;
  let high = Math.max(job.preset.quality, QUALITY_FLOOR + 1);
  let attempts = 0;

  try {
    while (attempts < MAX_TARGET_ATTEMPTS && low <= high) {
      const quality = Math.max(QUALITY_FLOOR, Math.floor((low + high) / 2));
      const parsed = parse(job.inputPath);
      const attemptOutput = join(tempDir, `${parsed.name}.q${quality}${parsed.ext || ".tmp"}`);
      const attemptJob: CompressionJob = {
        ...job,
        outputPath: attemptOutput,
        qualityOverride: quality
      };

      const result = await compressImage(attemptJob);
      attempts += 1;

      if (!result.success || result.compressedSizeBytes === undefined) {
        return result;
      }

      if (!bestResult || (bestResult.compressedSizeBytes ?? Number.MAX_SAFE_INTEGER) > result.compressedSizeBytes) {
        bestResult = result;
      }

      if (result.compressedSizeBytes <= requestedTarget) {
        bestResult = result;
        low = quality + 1;
      } else {
        high = quality - 1;
      }

      if (quality <= QUALITY_FLOOR && result.compressedSizeBytes > requestedTarget) {
        break;
      }
    }

    if (!bestResult) {
      return {
        inputPath: job.inputPath,
        outputPath: preferredOutput,
        success: false,
        error: "Unable to produce compression attempt for target-size optimization."
      };
    }

    const finalOutputPath = preferredOutput;
    if (finalOutputPath !== bestResult.outputPath) {
      await rename(bestResult.outputPath, finalOutputPath);
    }

    return {
      ...bestResult,
      outputPath: finalOutputPath
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function buildCompressionJobs(
  inputPaths: string[],
  preset: CompressionPreset,
  outputDir?: string
): Promise<CompressionJob[]> {
  const jobs: CompressionJob[] = [];

  for (const inputPath of inputPaths) {
    const discoveredFiles = await collectFiles(resolve(inputPath));

    for (const filePath of discoveredFiles) {
      const fileType = detectSupportedFileType(filePath);

      if (!fileType) {
        logWarn(`Skipping unsupported file type: ${filePath}`);
        continue;
      }

      jobs.push({
        inputPath: filePath,
        outputPath: outputDir ? buildOutputPathInDir(filePath, outputDir) : undefined,
        fileType,
        preset
      });
    }
  }

  return jobs;
}

async function collectFiles(inputPath: string): Promise<string[]> {
  try {
    const stats = await stat(inputPath);
    if (stats.isFile()) {
      return [inputPath];
    }

    if (!stats.isDirectory()) {
      logWarn(`Skipping non-file path: ${inputPath}`);
      return [];
    }

    const entries = await readdir(inputPath, { withFileTypes: true });
    const nestedFiles = await Promise.all(
      entries.map((entry) => collectFiles(join(inputPath, entry.name)))
    );

    return nestedFiles.flat();
  } catch {
    logWarn(`Skipping invalid path: ${inputPath}`);
    return [];
  }
}
