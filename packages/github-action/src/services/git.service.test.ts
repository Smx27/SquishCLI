import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { applyOptimizedFiles, autoCommitOptimizedFiles } from "./git.service";

const execFileAsync = promisify(execFile);

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, encoding: "utf8" });
  return stdout.trim();
}

describe("git.service", () => {
  it("applies optimized files back to source paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "squish-git-apply-"));
    try {
      const source = join(root, "image.jpg");
      const optimized = join(root, "image.squish.jpg");
      await writeFile(source, "old");
      await writeFile(optimized, "new");

      const changed = await applyOptimizedFiles([
        { inputPath: source, outputPath: optimized, success: true },
        { inputPath: source, outputPath: source, success: true }
      ]);

      expect(changed).toEqual([source]);
      expect(await readFile(source, "utf8")).toBe("new");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("auto commits changed files and skips loop-marked history", async () => {
    const root = await mkdtemp(join(tmpdir(), "squish-git-commit-"));
    const prev = process.cwd();
    process.chdir(root);

    try {
      await mkdir(join(root, "assets"), { recursive: true });
      await runGit(root, ["init"]);
      await runGit(root, ["config", "user.name", "tester"]);
      await runGit(root, ["config", "user.email", "tester@example.com"]);

      const file = join(root, "assets", "a.jpg");
      await writeFile(file, "v1");
      await runGit(root, ["add", "."]);
      await runGit(root, ["commit", "-m", "initial"]);

      await writeFile(file, "v2");
      const committed = await autoCommitOptimizedFiles([file]);
      expect(committed.committed).toBeTrue();
      expect(committed.files).toEqual(["assets/a.jpg"]);

      await writeFile(file, "v3");
      const skipped = await autoCommitOptimizedFiles([file]);
      expect(skipped.committed).toBeFalse();
    } finally {
      process.chdir(prev);
      await rm(root, { recursive: true, force: true });
    }
  });
});
