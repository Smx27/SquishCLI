import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { optimizeRepositoryAssets } from "./repository-optimizer";

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "squish-core-test-"));
  await mkdir(join(root, "assets"), { recursive: true });
  await writeFile(join(root, "assets", "photo.jpg"), "fake-image");
  await writeFile(join(root, "assets", "doc.pdf"), "fake-pdf");
  await writeFile(join(root, "assets", "notes.txt"), "unsupported");
  return root;
}

describe("optimizeRepositoryAssets", () => {
  it("supports dry-run with include/exclude filtering and unsupported detection", async () => {
    const root = await createWorkspace();

    try {
      const result = await optimizeRepositoryAssets({
        inputPaths: [join(root, "assets")],
        preset: "medium",
        dryRun: true,
        includeGlobs: ["**/*.jpg", "**/*.pdf"],
        excludeGlobs: ["**/*.pdf"]
      });

      expect(result.totals.discovered).toBe(3);
      expect(result.totals.dryRun).toBe(1);
      expect(result.totals.skipped).toBe(2);

      const dryRunFile = result.files.find((file) => file.status === "dry-run");
      expect(dryRunFile?.inputPath.endsWith("photo.jpg")).toBeTrue();

      const excluded = result.files.find((file) => file.inputPath.endsWith("doc.pdf"));
      expect(excluded?.skippedReason).toBe("excluded_by_glob");

      const unsupported = result.files.find((file) => file.inputPath.endsWith("notes.txt"));
      expect(unsupported?.skippedReason).toBe("unsupported_type");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("enforces file budget in dry-run mode", async () => {
    const root = await createWorkspace();

    try {
      const result = await optimizeRepositoryAssets({
        inputPaths: [join(root, "assets")],
        preset: "low",
        dryRun: true,
        maxFileBudget: 1
      });

      expect(result.totals.dryRun).toBe(1);
      const budgetSkipped = result.files.filter((file) => file.skippedReason === "file_budget_exceeded");
      expect(budgetSkipped.length).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("marks missing input paths as invalid", async () => {
    const result = await optimizeRepositoryAssets({
      inputPaths: ["/path/that/does/not/exist"],
      preset: "high",
      dryRun: true
    });

    expect(result.totals.skipped).toBe(1);
    expect(result.files[0]?.skippedReason).toBe("invalid_path");
    expect(result.errors[0]?.error).toContain("Path does not exist");
  });
});
