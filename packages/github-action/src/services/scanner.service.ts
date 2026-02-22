import * as core from "@actions/core";
import { PRESETS, type TargetSize } from "@squish/core";

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

function parseTargetSize(value: string): TargetSize | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  const match = normalized.match(/^(\d+(?:\.\d+)?)(b|kb|mb)$/);
  if (!match) {
    throw new Error(`Invalid size value "${value}". Expected formats like 200kb, 1mb, 512b.`);
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

export function parseInputs(): ActionInputs {
  const presetInput = core.getInput("preset", { required: true }).trim().toLowerCase();

  if (!(presetInput in PRESETS)) {
    throw new Error(`Invalid preset "${presetInput}". Allowed: ${Object.keys(PRESETS).join(", ")}.`);
  }

  return {
    inputPath: core.getInput("path", { required: true }),
    preset: presetInput as keyof typeof PRESETS,
    targetSize: parseTargetSize(core.getInput("target-size", { required: true })),
    commit: core.getBooleanInput("commit", { required: true }),
    artifactName: core.getInput("artifact", { required: true }).trim() || undefined,
    maxSize: parseTargetSize(core.getInput("max-size", { required: true })),
    dryRun: core.getBooleanInput("dry-run", { required: true }),
    includeGlobs: parseListInput(core.getInput("include-glob", { required: true })),
    excludeGlobs: parseListInput(core.getInput("exclude-glob", { required: true }))
  };
}
