import { readFile } from "node:fs/promises";
import path from "node:path";
import { PRESETS, parseTargetSize, targetSizeToBytes } from "@squish/core";
import type { CompressionPreset, TargetSize } from "@squish/core";

export interface UserConfig {
  preset?: string;
  size?: TargetSize;
  output?: string;
  concurrency?: number;
}

export interface ResolvedCompressionConfig {
  preset: CompressionPreset;
  outputDir?: string;
  concurrency: number;
}

const DEFAULT_CONCURRENCY = 4;

export async function readUserConfig(configPath = "squish.config.json"): Promise<UserConfig> {
  const absolutePath = path.resolve(configPath);

  try {
    const raw = await readFile(absolutePath, "utf-8");
    const parsed = JSON.parse(raw) as {
      preset?: string;
      size?: string;
      output?: string;
      concurrency?: number;
    };

    return {
      preset: parsed.preset,
      size: parseTargetSize(parsed.size),
      output: parsed.output,
      concurrency: parsed.concurrency
    };
  } catch {
    return {};
  }
}

/**
 * Resolves preset/output/concurrency with precedence: CLI > config file > defaults.
 */
export function resolveCompressionConfig(
  cli: { preset?: string; size?: TargetSize; output?: string; concurrency?: number },
  fileConfig: UserConfig
): ResolvedCompressionConfig {
  const presetName = cli.preset ?? fileConfig.preset ?? "medium";
  const selected = PRESETS[presetName] ?? PRESETS.medium;
  const targetSize = cli.size ?? fileConfig.size;

  const concurrencyInput = cli.concurrency ?? fileConfig.concurrency ?? DEFAULT_CONCURRENCY;
  const concurrency = Number.isFinite(concurrencyInput) ? Math.max(1, Math.floor(concurrencyInput)) : DEFAULT_CONCURRENCY;

  return {
    preset: targetSize ? { ...selected, targetSizeBytes: targetSizeToBytes(targetSize) } : selected,
    outputDir: cli.output ?? fileConfig.output,
    concurrency
  };
}

export { parseTargetSize } from "@squish/core";
