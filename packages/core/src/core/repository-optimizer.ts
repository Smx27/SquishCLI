import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PRESETS } from "../config/presets";
import { runCompressionEngine } from "./compression-engine";
import { targetSizeToBytes } from "../utils/file-size";
import { detectSupportedFileType } from "../utils/file-detect";
import type {
  CompressionPreset,
  CompressionResult,
  SupportedFileType,
  TargetSize
} from "../types/compression";

export type SkippedReason =
  | "invalid_path"
  | "unsupported_type"
  | "excluded_by_glob"
  | "not_included_by_glob"
  | "file_budget_exceeded"
  | "already_within_target_size"
  | "already_within_max_size";

export interface OptimizeRepositoryAssetsOptions {
  inputPaths: string[];
  preset: keyof typeof PRESETS | CompressionPreset;
  targetSize?: TargetSize;
  includeGlobs?: string[];
  excludeGlobs?: string[];
  dryRun?: boolean;
  concurrency?: number;
  maxFileBudget?: number;
  maxSizeBytes?: number;
  outputDir?: string;
  onProgress?: (event: { completed: number; total: number; result: CompressionResult }) => void;
}

export interface FileOptimizationStatus {
  inputPath: string;
  fileType?: SupportedFileType;
  status: "optimized" | "failed" | "skipped" | "dry-run";
  skippedReason?: SkippedReason;
  outputPath?: string;
  originalSizeBytes?: number;
  compressedSizeBytes?: number;
  reductionPercent?: number;
  error?: string;
}

export interface OptimizationTotals {
  discovered: number;
  eligible: number;
  optimized: number;
  failed: number;
  skipped: number;
  dryRun: number;
  bytesBefore: number;
  bytesAfter: number;
  bytesSaved: number;
}

export interface OptimizeRepositoryAssetsResult {
  preset: CompressionPreset;
  files: FileOptimizationStatus[];
  totals: OptimizationTotals;
  errors: Array<{ inputPath: string; error: string }>;
}

export async function optimizeRepositoryAssets(
  options: OptimizeRepositoryAssetsOptions
): Promise<OptimizeRepositoryAssetsResult> {
  const includeGlobs = options.includeGlobs ?? [];
  const excludeGlobs = options.excludeGlobs ?? [];
  const resolvedPreset = resolvePreset(options.preset, options.targetSize);

  const discovered = await collectDiscoveredFiles(options.inputPaths);
  const files: FileOptimizationStatus[] = [];
  const eligibleFiles: Array<{ inputPath: string; fileType: SupportedFileType; sizeBytes: number }> = [];

  for (const item of discovered) {
    if (item.error) {
      files.push({ inputPath: item.inputPath, status: "skipped", skippedReason: "invalid_path", error: item.error });
      continue;
    }

    const detectedType = detectSupportedFileType(item.inputPath);
    if (!detectedType) {
      files.push({ inputPath: item.inputPath, status: "skipped", skippedReason: "unsupported_type" });
      continue;
    }

    if (includeGlobs.length > 0 && !matchesAny(item.inputPath, includeGlobs)) {
      files.push({ inputPath: item.inputPath, fileType: detectedType, status: "skipped", skippedReason: "not_included_by_glob" });
      continue;
    }

    if (matchesAny(item.inputPath, excludeGlobs)) {
      files.push({ inputPath: item.inputPath, fileType: detectedType, status: "skipped", skippedReason: "excluded_by_glob" });
      continue;
    }

    const sizeBytes = item.sizeBytes ?? 0;
    if (resolvedPreset.targetSizeBytes !== undefined && sizeBytes <= resolvedPreset.targetSizeBytes) {
      files.push({
        inputPath: item.inputPath,
        fileType: detectedType,
        status: "skipped",
        skippedReason: "already_within_target_size",
        originalSizeBytes: sizeBytes,
        compressedSizeBytes: sizeBytes,
        reductionPercent: 0
      });
      continue;
    }

    if (options.maxSizeBytes !== undefined && sizeBytes <= options.maxSizeBytes) {
      files.push({
        inputPath: item.inputPath,
        fileType: detectedType,
        status: "skipped",
        skippedReason: "already_within_max_size",
        originalSizeBytes: sizeBytes,
        compressedSizeBytes: sizeBytes,
        reductionPercent: 0
      });
      continue;
    }

    eligibleFiles.push({ inputPath: item.inputPath, fileType: detectedType, sizeBytes });
  }

  const fileBudget = options.maxFileBudget;
  const processable =
    fileBudget === undefined || fileBudget < 0 ? eligibleFiles : eligibleFiles.slice(0, fileBudget);
  const budgetOverflow =
    fileBudget === undefined || fileBudget < 0 ? [] : eligibleFiles.slice(Math.max(0, fileBudget));

  for (const overflow of budgetOverflow) {
    files.push({
      inputPath: overflow.inputPath,
      fileType: overflow.fileType,
      status: "skipped",
      skippedReason: "file_budget_exceeded"
    });
  }

  if (options.dryRun) {
    for (const item of processable) {
      files.push({
        inputPath: item.inputPath,
        fileType: item.fileType,
        status: "dry-run",
        originalSizeBytes: item.sizeBytes,
        compressedSizeBytes: item.sizeBytes
      });
    }

    return buildResult(files, resolvedPreset);
  }

  const compressionResults = await runCompressionEngine(
    processable.map((item) => item.inputPath),
    resolvedPreset,
    {
      outputDir: options.outputDir,
      concurrency: options.concurrency,
      onProgress: options.onProgress
    }
  );

  for (const result of compressionResults) {
    files.push({
      inputPath: result.inputPath,
      status: result.success ? "optimized" : "failed",
      outputPath: result.outputPath,
      originalSizeBytes: result.originalSizeBytes,
      compressedSizeBytes: result.compressedSizeBytes,
      reductionPercent: result.reductionPercent,
      error: result.error
    });
  }

  return buildResult(files, resolvedPreset);
}

function resolvePreset(preset: keyof typeof PRESETS | CompressionPreset, targetSize?: TargetSize): CompressionPreset {
  const basePreset = typeof preset === "string" ? PRESETS[preset] : preset;
  if (!basePreset) {
    throw new Error(`Unknown compression preset: ${String(preset)}`);
  }

  if (!targetSize) {
    return basePreset;
  }

  return {
    ...basePreset,
    targetSizeBytes: targetSizeToBytes(targetSize)
  };
}

function buildResult(files: FileOptimizationStatus[], preset: CompressionPreset): OptimizeRepositoryAssetsResult {
  const optimizedFiles = files.filter((item) => item.status === "optimized");
  const bytesBefore = optimizedFiles.reduce((sum, item) => sum + (item.originalSizeBytes ?? 0), 0);
  const bytesAfter = optimizedFiles.reduce((sum, item) => sum + (item.compressedSizeBytes ?? 0), 0);

  return {
    preset,
    files,
    totals: {
      discovered: files.length,
      eligible: files.filter((item) => item.status === "optimized" || item.status === "failed" || item.status === "dry-run").length,
      optimized: files.filter((item) => item.status === "optimized").length,
      failed: files.filter((item) => item.status === "failed").length,
      skipped: files.filter((item) => item.status === "skipped").length,
      dryRun: files.filter((item) => item.status === "dry-run").length,
      bytesBefore,
      bytesAfter,
      bytesSaved: Math.max(0, bytesBefore - bytesAfter)
    },
    errors: files
      .filter((item) => item.status === "failed" || (item.status === "skipped" && Boolean(item.error)))
      .map((item) => ({ inputPath: item.inputPath, error: item.error ?? "Unknown error" }))
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/");
  const tokenized = normalized
    .split("**")
    .map((part) => part.split("*").map(escapeRegex).join("[^/]*"))
    .join(".*");
  return new RegExp(`^${tokenized}$`);
}

function matchesAny(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const normalizedPath = filePath.replace(/\\/g, "/");
  return patterns.some((pattern) => globToRegex(pattern).test(normalizedPath));
}

async function collectDiscoveredFiles(
  inputPaths: string[]
): Promise<Array<{ inputPath: string; sizeBytes?: number; error?: string }>> {
  const collected = await Promise.all(inputPaths.map((inputPath) => collectFiles(resolve(inputPath))));
  return collected.flat();
}

async function collectFiles(
  inputPath: string
): Promise<Array<{ inputPath: string; sizeBytes?: number; error?: string }>> {
  try {
    const stats = await stat(inputPath);
    if (stats.isFile()) {
      return [{ inputPath, sizeBytes: stats.size }];
    }

    if (!stats.isDirectory()) {
      return [{ inputPath, error: "Path is neither a file nor directory." }];
    }

    const entries = await readdir(inputPath, { withFileTypes: true });
    const nestedFiles = await Promise.all(entries.map((entry) => collectFiles(join(inputPath, entry.name))));
    return nestedFiles.flat();
  } catch {
    return [{ inputPath, error: "Path does not exist or is not accessible." }];
  }
}
