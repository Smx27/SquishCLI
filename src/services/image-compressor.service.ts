import sharp from "sharp";
import { copyFile } from "node:fs/promises";
import { getFileSizeBytes } from "../utils/file-size";
import { buildDefaultOutputPath } from "../utils/path";
import type { CompressionJob, CompressionResult } from "../types/compression";

/**
 * Compresses image files using sharp with quality from the job preset.
 */
export async function compressImage(job: CompressionJob): Promise<CompressionResult> {
  const outputPath = job.outputPath ?? buildDefaultOutputPath(job.inputPath);

  try {
    const originalSizeBytes = await getFileSizeBytes(job.inputPath);
    const quality = Math.max(1, Math.min(100, job.preset.quality));
    const lower = job.inputPath.toLowerCase();

    if (lower.endsWith(".png")) {
      await sharp(job.inputPath).png({ quality }).toFile(outputPath);
    } else if (lower.endsWith(".webp")) {
      await sharp(job.inputPath).webp({ quality }).toFile(outputPath);
    } else if (lower.endsWith(".avif")) {
      await sharp(job.inputPath).avif({ quality }).toFile(outputPath);
    } else {
      await sharp(job.inputPath).jpeg({ quality }).toFile(outputPath);
    }

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
      error: error instanceof Error ? error.message : "Unknown image compression error"
    };
  }
}

/**
 * Fallback copy utility when image transformation is not required.
 */
export async function passthroughImage(inputPath: string, outputPath: string): Promise<void> {
  await copyFile(inputPath, outputPath);
}
