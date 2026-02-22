import * as core from "@actions/core";
import { appendFile } from "node:fs/promises";
import type { CompressionResult } from "@squish/core";

export interface BudgetStats {
  maxSizeBytes?: number;
  violations: Array<{ inputPath: string; sizeBytes: number }>;
}

function summarize(results: CompressionResult[], filesScanned: number, budget?: BudgetStats) {
  const optimized = results.filter((result) => result.success);
  const bytesBefore = optimized.reduce((sum, result) => sum + (result.originalSizeBytes ?? 0), 0);
  const bytesAfter = optimized.reduce((sum, result) => sum + (result.compressedSizeBytes ?? 0), 0);
  const bytesSaved = Math.max(0, bytesBefore - bytesAfter);
  const savingsPercent = bytesBefore > 0 ? ((bytesSaved / bytesBefore) * 100).toFixed(2) : "0.00";
  const topBudgetViolations = (budget?.violations ?? []).slice(0, 5);

  return {
    filesScanned,
    filesOptimized: optimized.length,
    bytesBefore,
    bytesAfter,
    bytesSaved,
    savingsPercent,
    budgetViolations: budget?.violations.length ?? 0,
    budgetThresholdBytes: budget?.maxSizeBytes,
    topBudgetViolations
  };
}

function formatViolation(item: { inputPath: string; sizeBytes: number }): string {
  return `${item.inputPath} (${item.sizeBytes} bytes)`;
}

export async function publishRunReport(
  results: CompressionResult[],
  filesScanned: number,
  budget?: BudgetStats
): Promise<void> {
  const report = summarize(results, filesScanned, budget);

  core.setOutput("files-scanned", report.filesScanned.toString());
  core.setOutput("files-optimized", report.filesOptimized.toString());
  core.setOutput("bytes-before", report.bytesBefore.toString());
  core.setOutput("bytes-after", report.bytesAfter.toString());
  core.setOutput("bytes-saved", report.bytesSaved.toString());
  core.setOutput("savings-percent", report.savingsPercent);
  core.setOutput("budget-violations", report.budgetViolations.toString());
  core.setOutput("budget-threshold-bytes", report.budgetThresholdBytes?.toString() ?? "");
  core.setOutput(
    "budget-worst-offenders",
    report.topBudgetViolations.map((item) => formatViolation(item)).join("; ")
  );

  core.info(
    `files=${report.filesScanned}, optimized=${report.filesOptimized}, saved=${report.bytesSaved} bytes (${report.savingsPercent}%), budget_violations=${report.budgetViolations}.`
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
    `- Budget threshold (bytes): **${report.budgetThresholdBytes ?? "n/a"}**`,
    `- Budget violations: **${report.budgetViolations}**`,
    report.topBudgetViolations.length > 0
      ? `- Worst offenders: ${report.topBudgetViolations.map((item) => `\`${formatViolation(item)}\``).join(", ")}`
      : "- Worst offenders: _none_",
    ""
  ].join("\n");

  await appendFile(summaryPath, markdown, "utf8");
}
