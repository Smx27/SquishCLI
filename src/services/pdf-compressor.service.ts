import { spawn } from "node:child_process";
import { getFileSizeBytes } from "../utils/file-size";
import { buildDefaultOutputPath } from "../utils/path";
import type { CompressionJob, CompressionResult } from "../types/compression";

const GHOSTSCRIPT_PROFILE_MAP: Record<string, string> = {
  low: "/prepress",
  medium: "/printer",
  high: "/ebook",
  extreme: "/screen"
};

interface GhostscriptExecutionResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runGhostscript(inputPath: string, outputPath: string, profile: string): Promise<GhostscriptExecutionResult> {
  return new Promise((resolve, reject) => {
    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${profile}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    const child = spawn("gs", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Compresses PDF files with Ghostscript profiles mapped from the selected preset.
 */
export async function compressPdf(job: CompressionJob): Promise<CompressionResult> {
  const outputPath = job.outputPath ?? buildDefaultOutputPath(job.inputPath);

  try {
    const originalSizeBytes = await getFileSizeBytes(job.inputPath);
    const profile = GHOSTSCRIPT_PROFILE_MAP[job.preset.name] ?? GHOSTSCRIPT_PROFILE_MAP.medium;
    const gsResult = await runGhostscript(job.inputPath, outputPath, profile);

    if (gsResult.code !== 0) {
      return {
        inputPath: job.inputPath,
        outputPath,
        success: false,
        error: `Ghostscript failed (code ${gsResult.code ?? "unknown"}). stderr: ${gsResult.stderr || "<empty>"}. stdout: ${gsResult.stdout || "<empty>"}`
      };
    }

    const compressedSizeBytes = await getFileSizeBytes(outputPath);
    const reductionPercent = Number((((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100).toFixed(2));

    return {
      inputPath: job.inputPath,
      outputPath,
      success: true,
      originalSizeBytes,
      compressedSizeBytes,
      reductionPercent
    };
  } catch (error) {
    return {
      inputPath: job.inputPath,
      outputPath,
      success: false,
      error: error instanceof Error ? `Ghostscript execution error: ${error.message}` : "Unknown PDF compression error"
    };
  }
}
