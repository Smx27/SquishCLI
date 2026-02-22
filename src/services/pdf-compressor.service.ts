import { copyFile } from "node:fs/promises";
import { getFileSizeBytes } from "../utils/file-size";
import { buildDefaultOutputPath } from "../utils/path";
import type { CompressionJob, CompressionResult } from "../types/compression";

/**
 * Compresses PDF files.
 *
 * Current implementation performs a safe passthrough copy as a baseline.
 */
export async function compressPdf(job: CompressionJob): Promise<CompressionResult> {
  const outputPath = job.outputPath ?? buildDefaultOutputPath(job.inputPath);

  try {
    const originalSizeBytes = await getFileSizeBytes(job.inputPath);
    await copyFile(job.inputPath, outputPath);
    const compressedSizeBytes = await getFileSizeBytes(outputPath);

    return {
      inputPath: job.inputPath,
      outputPath,
      success: true,
      originalSizeBytes,
      compressedSizeBytes
    };
  } catch (error) {
    return {
      inputPath: job.inputPath,
      outputPath,
      success: false,
      error: error instanceof Error ? error.message : "Unknown PDF compression error"
    };
  }
}
