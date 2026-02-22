import sharp from "sharp";
import { parse, join } from "node:path";
import { getFileSizeBytes } from "../utils/file-size";
import { buildDefaultOutputPath } from "../utils/path";
import type { CompressionJob, CompressionResult } from "../types/compression";

function resolveOutputPath(job: CompressionJob): string {
  const fallback = job.outputPath ?? buildDefaultOutputPath(job.inputPath);

  if (job.preset.format !== "webp") {
    return fallback;
  }

  const parsed = parse(fallback);
  if (parsed.ext.toLowerCase() === ".webp") {
    return fallback;
  }

  return join(parsed.dir, `${parsed.name}.webp`);
}

/**
 * Compresses image files using sharp with quality and resize strategy from the job preset.
 */
export async function compressImage(job: CompressionJob): Promise<CompressionResult> {
  const outputPath = resolveOutputPath(job);

  try {
    const originalSizeBytes = await getFileSizeBytes(job.inputPath);
    const quality = Math.max(1, Math.min(100, job.qualityOverride ?? job.preset.quality));

    let pipeline = sharp(job.inputPath, { failOn: "none" });

    if (job.preset.resolutionScale && job.preset.resolutionScale < 1) {
      const metadata = await pipeline.metadata();
      if (metadata.width || metadata.height) {
        const width = metadata.width ? Math.max(1, Math.round(metadata.width * job.preset.resolutionScale)) : undefined;
        const height = metadata.height
          ? Math.max(1, Math.round(metadata.height * job.preset.resolutionScale))
          : undefined;
        pipeline = pipeline.resize({ width, height, fit: "inside", withoutEnlargement: true });
      }
    }

    const inputExtension = parse(job.inputPath).ext.toLowerCase();
    const forceWebp = job.preset.format === "webp";

    if (forceWebp || inputExtension === ".webp") {
      await pipeline.webp({ quality, effort: 6 }).toFile(outputPath);
    } else if (inputExtension === ".png") {
      await pipeline.png({ quality, compressionLevel: 9, palette: true }).toFile(outputPath);
    } else {
      await pipeline.jpeg({ quality, mozjpeg: true }).toFile(outputPath);
    }

    const compressedSizeBytes = await getFileSizeBytes(outputPath);
    const reductionPercent = originalSizeBytes
      ? Number((((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100).toFixed(2))
      : undefined;

    return {
      inputPath: job.inputPath,
      outputPath,
      success: true,
      originalSizeBytes,
      compressedSizeBytes,
      reductionPercent
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
