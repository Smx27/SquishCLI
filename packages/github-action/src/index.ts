import * as core from "@actions/core";
import { commentOnPullRequest } from "./services/pr-comment.service";
import { uploadCompressedArtifact } from "./services/artifact.service";
import { applyOptimizedFiles, autoCommitOptimizedFiles } from "./services/git.service";
import { parseInputs } from "./config/inputs";
import { runCompression } from "./services/compression.service";
import { publishRunReport } from "./services/reporter.service";

async function run(): Promise<void> {
  try {
    const inputs = parseInputs();
    const runResult = await runCompression(inputs);

    core.info(
      `Discovered ${runResult.optimization.totals.discovered} files; eligible ${runResult.optimization.totals.eligible}; skipped ${runResult.optimization.totals.skipped}.`
    );

    if (inputs.dryRun) {
      await publishRunReport([], runResult.filesScanned, runResult.maxSizeBytes);
      return;
    }

    if (inputs.commit) {
      const changedCandidates = await applyOptimizedFiles(runResult.results);
      const commitResult = await autoCommitOptimizedFiles(changedCandidates);
      if (commitResult.committed) {
        core.info(`Committed ${commitResult.files.length} optimized file(s).`);
      } else {
        core.info("No optimized file changes to commit, or commit skipped due to loop guard.");
      }
    }

    if (inputs.artifactName) {
      await uploadCompressedArtifact(inputs.artifactName, runResult.results);
    }

    await publishRunReport(runResult.results, runResult.filesScanned, runResult.maxSizeBytes);

    const prCommented = await commentOnPullRequest(
      `Squish optimized **${runResult.optimization.totals.optimized}** file(s) and saved **${runResult.optimization.totals.bytesSaved}** bytes.`
    );
    if (prCommented) {
      core.info("Posted PR comment with Squish summary.");
    }

    if (runResult.optimization.totals.failed > 0) {
      runResult.optimization.errors.forEach((failure) => core.error(`${failure.inputPath}: ${failure.error}`));
      core.setFailed(`${runResult.optimization.totals.failed} compression job(s) failed.`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : "Unexpected github action error.");
  }
}

void run();
