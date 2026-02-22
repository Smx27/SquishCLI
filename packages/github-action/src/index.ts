import * as core from "@actions/core";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  PRESETS,
  buildCompressionJobs,
  runCompressionEngine,
  targetSizeToBytes,
  type CompressionResult,
  type TargetSize
} from "@squish/core";

interface ActionInputs {
  inputPath: string;
  preset: keyof typeof PRESETS;
  targetSize?: TargetSize;
  commit: boolean;
  artifactPath?: string;
  maxSize?: TargetSize;
  dryRun: boolean;
  includeGlobs: string[];
  excludeGlobs: string[];
}

function parseTargetSize(value: string): TargetSize | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  const match = normalized.match(/^(\d+(?:\.\d+)?)(b|kb|mb)$/);
  if (!match) {
    throw new Error(`Invalid size value \"${value}\". Expected formats like 200kb, 1mb, 512b.`);
  }

  return {
    value: Number(match[1]),
    unit: match[2] as TargetSize["unit"]
  };
}

function parseListInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseInputs(): ActionInputs {
  const presetInput = core.getInput("preset", { required: true }).trim().toLowerCase();

  if (!(presetInput in PRESETS)) {
    throw new Error(`Invalid preset \"${presetInput}\". Allowed: ${Object.keys(PRESETS).join(", ")}.`);
  }

  return {
    inputPath: core.getInput("path", { required: true }),
    preset: presetInput as keyof typeof PRESETS,
    targetSize: parseTargetSize(core.getInput("target-size", { required: true })),
    commit: core.getBooleanInput("commit", { required: true }),
    artifactPath: core.getInput("artifact", { required: true }).trim() || undefined,
    maxSize: parseTargetSize(core.getInput("max-size", { required: true })),
    dryRun: core.getBooleanInput("dry-run", { required: true }),
    includeGlobs: parseListInput(core.getInput("include-glob", { required: true })),
    excludeGlobs: parseListInput(core.getInput("exclude-glob", { required: true }))
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

function setOutputs(results: CompressionResult[], filesScanned: number, maxSizeBytes?: number): void {
  const optimized = results.filter((result) => result.success);
  const bytesBefore = optimized.reduce((sum, result) => sum + (result.originalSizeBytes ?? 0), 0);
  const bytesAfter = optimized.reduce((sum, result) => sum + (result.compressedSizeBytes ?? 0), 0);
  const bytesSaved = Math.max(0, bytesBefore - bytesAfter);
  const savingsPercent = bytesBefore > 0 ? ((bytesSaved / bytesBefore) * 100).toFixed(2) : "0.00";
  const budgetViolations =
    maxSizeBytes === undefined
      ? 0
      : optimized.filter((result) => (result.compressedSizeBytes ?? 0) > maxSizeBytes).length;

  core.setOutput("files-scanned", filesScanned.toString());
  core.setOutput("files-optimized", optimized.length.toString());
  core.setOutput("bytes-before", bytesBefore.toString());
  core.setOutput("bytes-after", bytesAfter.toString());
  core.setOutput("bytes-saved", bytesSaved.toString());
  core.setOutput("savings-percent", savingsPercent);
  core.setOutput("budget-violations", budgetViolations.toString());
}

async function writeArtifact(artifactPath: string, payload: unknown): Promise<void> {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, JSON.stringify(payload, null, 2));
}

async function maybeCommitResults(results: CompressionResult[]): Promise<void> {
  for (const result of results) {
    if (!result.success || result.outputPath === result.inputPath) continue;
    await cp(result.outputPath, result.inputPath, { force: true });
    await rm(result.outputPath, { force: true });
  }
}

async function run(): Promise<void> {
  try {
    const inputs = parseInputs();
    const preset = PRESETS[inputs.preset];
    const resolvedPreset =
      inputs.targetSize === undefined ? preset : { ...preset, targetSizeBytes: targetSizeToBytes(inputs.targetSize) };

    const rootPath = resolve(inputs.inputPath);
    const allJobs = await buildCompressionJobs([rootPath], resolvedPreset);
    const filteredJobs = allJobs.filter((job) => {
      const includeMatch = inputs.includeGlobs.length === 0 || matchesAny(job.inputPath, inputs.includeGlobs);
      const excludeMatch = matchesAny(job.inputPath, inputs.excludeGlobs);
      return includeMatch && !excludeMatch;
    });

    core.info(`Discovered ${allJobs.length} supported files; ${filteredJobs.length} matched include/exclude filters.`);

    if (inputs.dryRun) {
      setOutputs([], filteredJobs.length, inputs.maxSize ? targetSizeToBytes(inputs.maxSize) : undefined);
      if (inputs.artifactPath) {
        await writeArtifact(resolve(inputs.artifactPath), { mode: "dry-run", files: filteredJobs.map((job) => job.inputPath) });
      }
      return;
    }

    const results = await runCompressionEngine(filteredJobs.map((job) => job.inputPath), resolvedPreset, {
      onProgress: ({ completed, total, result }) => {
        core.info(`[${completed}/${total}] ${result.inputPath}: ${result.success ? "ok" : "failed"}`);
      }
    });

    if (inputs.commit) {
      await maybeCommitResults(results);
    }

    const maxSizeBytes = inputs.maxSize ? targetSizeToBytes(inputs.maxSize) : undefined;
    setOutputs(results, filteredJobs.length, maxSizeBytes);

    if (inputs.artifactPath) {
      await writeArtifact(resolve(inputs.artifactPath), {
        filesScanned: filteredJobs.length,
        results,
        maxSizeBytes,
        generatedAt: new Date().toISOString()
      });
    }

    const failures = results.filter((result) => !result.success);
    if (failures.length > 0) {
      failures.forEach((failure) => core.error(`${failure.inputPath}: ${failure.error ?? "unknown error"}`));
      core.setFailed(`${failures.length} compression job(s) failed.`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : "Unexpected github action error.");
  }
}

void run();
