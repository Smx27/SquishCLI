import { cp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CompressionResult } from "@squish/core";

const execFileAsync = promisify(execFile);
const LOOP_MARKER = "[skip squish]";

async function runGit(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { encoding: "utf8" });
  return stdout.trim();
}

function successfulTranscodedFiles(results: CompressionResult[]): CompressionResult[] {
  return results.filter((result) => result.success && result.outputPath !== result.inputPath);
}

async function hasLoopMarkerInLastCommit(): Promise<boolean> {
  try {
    const subject = await runGit(["log", "-1", "--pretty=%s"]);
    return subject.includes(LOOP_MARKER);
  } catch {
    return false;
  }
}

export async function applyOptimizedFiles(results: CompressionResult[]): Promise<string[]> {
  const copied: string[] = [];

  for (const result of successfulTranscodedFiles(results)) {
    await cp(result.outputPath, result.inputPath, { force: true });
    await rm(result.outputPath, { force: true });
    copied.push(result.inputPath);
  }

  return copied;
}

export async function autoCommitOptimizedFiles(changedCandidates: string[]): Promise<{ committed: boolean; files: string[] }> {
  if (changedCandidates.length === 0) {
    return { committed: false, files: [] };
  }

  if (process.env.GITHUB_ACTOR === "squish-bot" || (await hasLoopMarkerInLastCommit())) {
    return { committed: false, files: [] };
  }

  await runGit(["config", "user.name", "squish[bot]"]);
  await runGit(["config", "user.email", "squish-bot@users.noreply.github.com"]);

  const status = await runGit(["status", "--porcelain", "--", ...changedCandidates]);
  const changedFiles = status
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3));

  if (changedFiles.length === 0) {
    return { committed: false, files: [] };
  }

  await runGit(["add", "--", ...changedFiles]);
  await runGit(["commit", "-m", `chore: apply squish optimizations ${LOOP_MARKER}`]);

  return { committed: true, files: changedFiles };
}
