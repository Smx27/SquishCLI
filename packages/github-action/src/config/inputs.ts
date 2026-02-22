import path from "node:path";
import * as core from "@actions/core";
import { PRESETS, parseTargetSize, type TargetSize } from "@squish/core";

export interface ActionInputs {
  inputPath: string;
  preset: keyof typeof PRESETS;
  targetSize?: TargetSize;
  commit: boolean;
  artifactName?: string;
  maxSize?: TargetSize;
  dryRun: boolean;
  includeGlobs: string[];
  excludeGlobs: string[];
}

function parseListInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBooleanInput(name: string, rawValue: string): boolean {
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`Invalid boolean for \"${name}\": \"${rawValue}\". Use true or false.`);
}

function parsePresetInput(rawValue: string): keyof typeof PRESETS {
  const normalized = rawValue.trim().toLowerCase();
  if (normalized in PRESETS) {
    return normalized as keyof typeof PRESETS;
  }

  throw new Error(`Invalid preset \"${rawValue}\". Allowed presets: ${Object.keys(PRESETS).join(", ")}.`);
}

function parseOptionalTargetSize(name: string, rawValue: string): TargetSize | undefined {
  const trimmed = rawValue.trim();
  if (!trimmed) return undefined;

  const parsed = parseTargetSize(trimmed);
  if (!parsed) {
    throw new Error(`Invalid ${name} \"${rawValue}\". Expected formats like 200kb, 1mb, 512b.`);
  }

  return parsed;
}

function validateGlobInput(name: string, patterns: string[]): void {
  for (const pattern of patterns) {
    if (pattern.includes("\0")) {
      throw new Error(`Invalid ${name} pattern \"${pattern}\": null bytes are not allowed.`);
    }

    const normalized = pattern.replace(/\\/g, "/");
    if (normalized.startsWith("/")) {
      throw new Error(`Invalid ${name} pattern \"${pattern}\": absolute patterns are not allowed.`);
    }

    const segments = normalized.split("/").filter(Boolean);
    if (segments.includes("..")) {
      throw new Error(
        `Invalid ${name} pattern \"${pattern}\": parent directory traversal (..) is not allowed.`
      );
    }
  }
}

function validateInputPathWithinWorkspace(inputPath: string, workspace: string): string {
  const resolvedWorkspace = path.resolve(workspace);
  const resolvedInputPath = path.resolve(resolvedWorkspace, inputPath);
  const relativePath = path.relative(resolvedWorkspace, resolvedInputPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      `Input path \"${inputPath}\" resolves outside GITHUB_WORKSPACE (\"${resolvedWorkspace}\"). Use a path within the workspace.`
    );
  }

  return resolvedInputPath;
}

function validateInputCombinations(inputs: ActionInputs): void {
  if (inputs.dryRun && inputs.commit) {
    throw new Error('Invalid inputs: "commit" cannot be true when "dry-run" is true.');
  }

  if (inputs.dryRun && inputs.artifactName) {
    throw new Error('Invalid inputs: "artifact" cannot be set when "dry-run" is true.');
  }
}

export function parseInputs(): ActionInputs {
  const workspace = process.env.GITHUB_WORKSPACE?.trim();
  if (!workspace) {
    throw new Error("Missing GITHUB_WORKSPACE environment variable. This action must run inside a GitHub workspace.");
  }

  const inputPathRaw = core.getInput("path", { required: true });
  const includeGlobs = parseListInput(core.getInput("include-glob", { required: true }));
  const excludeGlobs = parseListInput(core.getInput("exclude-glob", { required: true }));

  validateGlobInput("include-glob", includeGlobs);
  validateGlobInput("exclude-glob", excludeGlobs);

  const inputs: ActionInputs = {
    inputPath: validateInputPathWithinWorkspace(inputPathRaw, workspace),
    preset: parsePresetInput(core.getInput("preset", { required: true })),
    targetSize: parseOptionalTargetSize("target-size", core.getInput("target-size", { required: true })),
    commit: parseBooleanInput("commit", core.getInput("commit", { required: true })),
    artifactName: core.getInput("artifact", { required: true }).trim() || undefined,
    maxSize: parseOptionalTargetSize("max-size", core.getInput("max-size", { required: true })),
    dryRun: parseBooleanInput("dry-run", core.getInput("dry-run", { required: true })),
    includeGlobs,
    excludeGlobs
  };

  validateInputCombinations(inputs);

  return inputs;
}
