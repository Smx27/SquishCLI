import type { CompressionPreset } from "../types/compression";

/**
 * Built-in compression presets exposed to CLI users.
 */
export const PRESETS: Record<string, CompressionPreset> = {
  low: { name: "low", quality: 82, resolutionScale: 1, format: "original" },
  medium: { name: "medium", quality: 72, resolutionScale: 0.9, format: "original" },
  high: { name: "high", quality: 60, resolutionScale: 0.8, format: "original" },
  extreme: { name: "extreme", quality: 45, resolutionScale: 0.7, format: "webp" }
};
