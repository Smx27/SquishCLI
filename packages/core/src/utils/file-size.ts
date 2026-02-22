import { stat } from "node:fs/promises";
import type { TargetSize } from "../types/compression";

/**
 * Converts a {@link TargetSize} to bytes.
 */
export function targetSizeToBytes(targetSize: TargetSize): number {
  const multipliers = { b: 1, kb: 1024, mb: 1024 * 1024 } as const;
  return Math.round(targetSize.value * multipliers[targetSize.unit]);
}


/**
 * Parses a size string (e.g. `200kb`) into a {@link TargetSize}.
 */
export function parseTargetSize(value?: string): TargetSize | undefined {
  if (!value) return undefined;

  const match = value.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb)$/);
  if (!match) return undefined;

  return {
    value: Number(match[1]),
    unit: match[2] as TargetSize["unit"]
  };
}
/**
 * Reads file size from disk and returns bytes.
 */
export async function getFileSizeBytes(filePath: string): Promise<number> {
  const fileStats = await stat(filePath);
  return fileStats.size;
}

/**
 * Formats bytes into a readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
