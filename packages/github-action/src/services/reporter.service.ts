import * as core from "@actions/core";
import { appendFile } from "node:fs/promises";
import type { CompressionResult } from "@squish/core";

function summarize(results: CompressionResult[], filesScanned: number, maxSizeBytes?: number) {
  const optimized = results.filter((result) => result.success);
  const bytesBefore = optimized.reduce((sum, result) => sum + (result.originalSizeBytes ?? 0), 0);
  const bytesAfter = optimized.reduce((sum, result) => sum + (result.compressedSizeBytes ?? 0), 0);
  const bytesSaved = Math.max(0, bytesBefore - bytesAfter);
  const savingsPercent = bytesBefore > 0 ? ((bytesSaved / bytesBefore) * 100).toFixed(2) : "0.00";
  const budgetViolations =
    maxSizeBytes === undefined
      ? 0
      : optimized.filter((result) => (result.compressedSizeBytes ?? 0) > maxSizeBytes).length;

  return {
    filesScanned,
    filesOptimized: optimized.length,
    bytesBefore,
    bytesAfter,
    bytesSaved,
    savingsPercent,
    budgetViolations
  };
}

export async function publishRunReport(results: CompressionResult[], filesScanned: number, maxSizeBytes?: number): Promise<void> {
  const report = summarize(results, filesScanned, maxSizeBytes);

  core.setOutput("files-scanned", report.filesScanned.toString());
  core.setOutput("files-optimized", report.filesOptimized.toString());
  core.setOutput("bytes-before", report.bytesBefore.toString());
  core.setOutput("bytes-after", report.bytesAfter.toString());
  core.setOutput("bytes-saved", report.bytesSaved.toString());
  core.setOutput("savings-percent", report.savingsPercent);
  core.setOutput("budget-violations", report.budgetViolations.toString());

  core.info(
    `files=${report.filesScanned}, optimized=${report.filesOptimized}, saved=${report.bytesSaved} bytes (${report.savingsPercent}%).`
  );

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const markdown = [
    "## Squish Optimization Report",
    "",
    `- Files scanned: **${report.filesScanned}**`,
    `- Files optimized: **${report.filesOptimized}**`,
    `- Bytes before: **${report.bytesBefore}**`,
    `- Bytes after: **${report.bytesAfter}**`,
    `- Bytes saved: **${report.bytesSaved}**`,
    `- Savings: **${report.savingsPercent}%**`,
    `- Budget violations: **${report.budgetViolations}**`,
    ""
  ].join("\n");

  await appendFile(summaryPath, markdown, "utf8");
}
