import { PRESETS } from "./presets";
import { targetSizeToBytes } from "../utils/file-size";
import type { CompressionPreset, TargetSize } from "../types/compression";

/**
 * Resolves a preset name and applies optional target size override.
 */
export function loadCompressionPreset(presetName: string, targetSize?: TargetSize): CompressionPreset {
  const selected = PRESETS[presetName] ?? PRESETS.balanced;
  if (!targetSize) {
    return selected;
  }

  return {
    ...selected,
    targetSizeBytes: targetSizeToBytes(targetSize)
  };
}
