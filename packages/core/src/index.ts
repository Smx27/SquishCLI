export { runCompressionEngine, buildCompressionJobs } from "./core/compression-engine";
export type {
  CompressionPreset,
  CompressionResult,
  CompressionJob,
  TargetSize,
  SupportedFileType,
  ImageFormat
} from "./types/compression";
export { PRESETS } from "./config/presets";
export { targetSizeToBytes, parseTargetSize, formatBytes, getFileSizeBytes } from "./utils/file-size";
export { detectSupportedFileType } from "./utils/file-detect";
export { buildDefaultOutputPath, buildOutputPathInDir } from "./utils/path";

export { optimizeRepositoryAssets } from "./core/repository-optimizer";
export type { OptimizeRepositoryAssetsOptions, OptimizeRepositoryAssetsResult, FileOptimizationStatus, OptimizationTotals, SkippedReason } from "./core/repository-optimizer";
