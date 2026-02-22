import { cac } from "cac";
import chokidar from "chokidar";
import ora from "ora";
import { basename, resolve } from "node:path";
import { parseTargetSize, readUserConfig, resolveCompressionConfig } from "../config/load-config";
import { runCompressionEngine } from "../core/compression-engine";
import { formatBytes } from "../utils/file-size";
import { logError, logInfo, logSuccess, logWarn } from "../utils/logger";

interface CommandFlags {
  size?: string;
  preset?: string;
  output?: string;
  watch?: boolean;
  concurrency?: number;
}

export async function runCompressCommand(argv: string[]): Promise<void> {
  const cli = cac("squish");

  cli
    .command("compress <input>", "Compress a file or recursively process a folder")
    .option("--size <value>", "Target size like 200kb or 1mb")
    .option("--preset <name>", "Compression preset: low|medium|high|extreme")
    .option("-o, --output <dir>", "Output directory")
    .option("--watch", "Watch input path for changes and recompress")
    .option("--concurrency <num>", "Parallel jobs (default: 4)", { default: 4 })
    .action(async (input: string, flags: CommandFlags) => {
      const configFile = await readUserConfig();
      const resolved = resolveCompressionConfig(
        {
          preset: flags.preset,
          size: parseTargetSize(flags.size),
          output: flags.output,
          concurrency: flags.concurrency ? Number(flags.concurrency) : undefined
        },
        configFile
      );

      if (flags.size && !parseTargetSize(flags.size)) {
        logError("Invalid --size value. Example: 200kb or 1mb.");
        return;
      }

      const runOnce = async (): Promise<void> => {
        const spinner = ora("Preparing jobs...").start();
        const results = await runCompressionEngine([resolve(input)], resolved.preset, {
          outputDir: resolved.outputDir,
          concurrency: resolved.concurrency,
          onProgress: ({ completed, total, result }) => {
            spinner.text = `Compressing ${completed}/${total}: ${basename(result.inputPath)}`;
          }
        });

        spinner.stop();

        if (results.length === 0) {
          logWarn("No supported files were discovered.");
          return;
        }

        for (const result of results) {
          if (!result.success) {
            logError(`${result.inputPath} -> ${result.error ?? "Compression failed"}`);
            continue;
          }

          const original = result.originalSizeBytes ? formatBytes(result.originalSizeBytes) : "n/a";
          const compressed = result.compressedSizeBytes ? formatBytes(result.compressedSizeBytes) : "n/a";
          const savings = result.reductionPercent !== undefined ? `${result.reductionPercent}%` : "n/a";
          logSuccess(`${basename(result.inputPath)} ${original} -> ${compressed} (${savings})`);
        }

        const successCount = results.filter((result) => result.success).length;
        logInfo(`Completed ${successCount}/${results.length} job(s).`);
      };

      await runOnce();

      if (flags.watch) {
        logInfo(`Watching ${resolve(input)} for changes...`);
        const watcher = chokidar.watch(resolve(input), { ignoreInitial: true });
        watcher.on("add", () => void runOnce());
        watcher.on("change", () => void runOnce());
      }
    });

  cli.help();
  cli.version("0.1.0");
  cli.parse(argv, { run: true });
}
