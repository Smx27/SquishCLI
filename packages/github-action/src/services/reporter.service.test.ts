import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishRunReport } from "./reporter.service";

describe("publishRunReport", () => {
  it("writes outputs and markdown summary", async () => {
    const root = await mkdtemp(join(tmpdir(), "squish-reporter-test-"));
    const outputPath = join(root, "out.txt");
    const summaryPath = join(root, "summary.md");

    process.env.GITHUB_OUTPUT = outputPath;
    process.env.GITHUB_STEP_SUMMARY = summaryPath;

    try {
      await publishRunReport(
        [
          {
            inputPath: "a.jpg",
            outputPath: "a.squish.jpg",
            success: true,
            originalSizeBytes: 1000,
            compressedSizeBytes: 300,
            reductionPercent: 70
          },
          {
            inputPath: "b.jpg",
            outputPath: "b.squish.jpg",
            success: true,
            originalSizeBytes: 1000,
            compressedSizeBytes: 600,
            reductionPercent: 40
          }
        ],
        2,
        500
      );

      const output = await readFile(outputPath, "utf8");
      const summary = await readFile(summaryPath, "utf8");

      expect(output).toContain("files-scanned=2");
      expect(output).toContain("files-optimized=2");
      expect(output).toContain("bytes-saved=1100");
      expect(output).toContain("budget-violations=1");
      expect(summary).toContain("## Squish Optimization Report");
      expect(summary).toContain("Budget violations: **1**");
    } finally {
      delete process.env.GITHUB_OUTPUT;
      delete process.env.GITHUB_STEP_SUMMARY;
      await rm(root, { recursive: true, force: true });
    }
  });
});
