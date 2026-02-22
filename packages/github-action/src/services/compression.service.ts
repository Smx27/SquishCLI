import { resolve } from "node:path";
import {
  optimizeRepositoryAssets,
  type CompressionResult,
  type OptimizeRepositoryAssetsResult,
  type TargetSize
} from "@squish/core";
import type { ActionInputs } from "./scanner.service";

export interface CompressionRunResult {
  optimization: OptimizeRepositoryAssetsResult;
  results: CompressionResult[];
  filesScanned: number;
  maxSizeBytes?: number;
}

export async function runCompression(inputs: ActionInputs): Promise<CompressionRunResult> {
  const optimization = await optimizeRepositoryAssets({
    inputPaths: [resolve(inputs.inputPath)],
    preset: inputs.preset,
    targetSize: inputs.targetSize,
    includeGlobs: inputs.includeGlobs,
    excludeGlobs: inputs.excludeGlobs,
    dryRun: inputs.dryRun,
    onProgress: ({ completed, total, result }) => {
      process.stdout.write(`[${completed}/${total}] ${result.inputPath}: ${result.success ? "ok" : "failed"}\n`);
    }
  });

  const results: CompressionResult[] = optimization.files
    .filter((file) => file.status === "optimized" || file.status === "failed")
    .map((file) => ({
      inputPath: file.inputPath,
      outputPath: file.outputPath ?? file.inputPath,
      success: file.status === "optimized",
      originalSizeBytes: file.originalSizeBytes,
      compressedSizeBytes: file.compressedSizeBytes,
      reductionPercent: file.reductionPercent,
      error: file.error
    }));

  return {
    optimization,
    results,
    filesScanned: optimization.totals.eligible,
    maxSizeBytes: inputs.maxSize ? targetSizeToBytes(inputs.maxSize) : undefined
  };
}

function targetSizeToBytes(target: TargetSize): number {
  if (target.unit === "b") return target.value;
  if (target.unit === "kb") return Math.round(target.value * 1024);
  return Math.round(target.value * 1024 * 1024);
}
