import { mkdtemp, rename, rm } from "node:fs/promises";
import { join, parse } from "node:path";
import { tmpdir } from "node:os";
import { compressImage } from "../services/image-compressor.service";
import { compressPdf } from "../services/pdf-compressor.service";
import { detectSupportedFileType } from "../utils/file-detect";
import { buildDefaultOutputPath, buildOutputPathInDir } from "../utils/path";
import { logWarn } from "../utils/logger";
import type { CompressionJob, CompressionPreset, CompressionResult } from "../types/compression";

const MAX_TARGET_ATTEMPTS = 6;
const QUALITY_FLOOR = 25;

/**
 * Orchestrates routing of files to type-specific compression services.
 */
export async function runCompressionEngine(
  inputPaths: string[],
  preset: CompressionPreset,
  outputDir?: string
): Promise<CompressionResult[]> {
  const jobs = buildCompressionJobs(inputPaths, preset, outputDir);
  const results: CompressionResult[] = [];

  for (const job of jobs) {
    results.push(await compressJob(job));
  }

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

/**
 * Converts raw input paths into routable jobs for the engine.
 */
export function buildCompressionJobs(
  inputPaths: string[],
  preset: CompressionPreset,
  outputDir?: string
): CompressionJob[] {
  const jobs: CompressionJob[] = [];

  for (const inputPath of inputPaths) {
    const fileType = detectSupportedFileType(inputPath);

    if (!fileType) {
      logWarn(`Skipping unsupported file type: ${inputPath}`);
      continue;
    }

    jobs.push({
      inputPath,
      outputPath: outputDir ? buildOutputPathInDir(inputPath, outputDir) : undefined,
      fileType,
      preset
    });
  }

  return jobs;
}
