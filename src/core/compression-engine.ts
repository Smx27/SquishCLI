import { compressImage } from "../services/image-compressor.service";
import { compressPdf } from "../services/pdf-compressor.service";
import { detectSupportedFileType } from "../utils/file-detect";
import { buildOutputPathInDir } from "../utils/path";
import { logWarn } from "../utils/logger";
import type { CompressionJob, CompressionPreset, CompressionResult } from "../types/compression";

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
    if (job.fileType === "image") {
      results.push(await compressImage(job));
      continue;
    }

    if (job.fileType === "pdf") {
      results.push(await compressPdf(job));
    }
  }

  return results;
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
