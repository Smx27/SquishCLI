import type { CompressionPreset, TargetSize } from "@squish/core";

/**
 * Parsed CLI flags normalized into a single object for command handlers.
 */
export interface CliOptions {
  /** Input files or globs supplied through positional arguments. */
  input: string[];
  /** Name of a built-in preset to use. */
  presetName: string;
  /** Optional target size override from the command line. */
  targetSize?: TargetSize;
  /** Optional explicit output directory. */
  outputDir?: string;
}

/**
 * Context passed from command parsing to the compression engine.
 */
export interface CliContext {
  /** Normalized options parsed from argv. */
  options: CliOptions;
  /** Resolved preset after lookup and optional overrides. */
  preset: CompressionPreset;
}
