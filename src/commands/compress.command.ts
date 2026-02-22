import { cac } from "cac";
import { loadCompressionPreset } from "../config/load-config";
import { runCompressionEngine } from "../core/compression-engine";
import { logError, logInfo } from "../utils/logger";
import type { CliContext, CliOptions } from "../types/cli";
import type { TargetSize } from "../types/compression";

/**
 * Runs the compress command by parsing CLI arguments and passing normalized context to the engine.
 */
export async function runCompressCommand(argv: string[]): Promise<void> {
  const cli = cac("squish");

  cli
    .command("compress [...input]", "Compress supported files (images and PDFs)")
    .option("-p, --preset <name>", "Compression preset", { default: "medium" })
    .option("-t, --target <value>", "Target size like 300kb or 1mb")
    .option("-o, --output <dir>", "Output directory")
    .action(async (input: string[], flags: { preset: string; target?: string; output?: string }) => {
      const options: CliOptions = {
        input: input ?? [],
        presetName: flags.preset,
        targetSize: parseTargetSize(flags.target),
        outputDir: flags.output
      };

      const context: CliContext = {
        options,
        preset: loadCompressionPreset(options.presetName, options.targetSize)
      };

      if (context.options.input.length === 0) {
        logError("No input files provided.");
        return;
      }

      const results = await runCompressionEngine(context.options.input, context.preset, context.options.outputDir);
      const successCount = results.filter((result) => result.success).length;

      logInfo(`Completed ${successCount}/${results.length} compression job(s).`);
    });

  cli.help();
  cli.version("0.1.0");
  cli.parse(argv, { run: true });
}

/**
 * Parses a human-friendly target string into structured {@link TargetSize}.
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
