import type { CompressionPreset } from "../types/compression";

/**
 * Built-in compression presets exposed to CLI users.
 */
export const PRESETS: Record<string, CompressionPreset> = {
  light: { name: "light", quality: 85 },
  balanced: { name: "balanced", quality: 70 },
  aggressive: { name: "aggressive", quality: 50 }
};
