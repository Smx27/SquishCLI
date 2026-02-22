import { relative, resolve } from "node:path";
import { DefaultArtifactClient } from "@actions/artifact";
import type { CompressionResult } from "@squish/core";

export async function uploadCompressedArtifact(
  artifactName: string,
  results: CompressionResult[],
  rootDir = process.cwd()
): Promise<void> {
  const successfulOutputs = results
    .filter((result) => result.success)
    .map((result) => resolve(result.outputPath))
    .filter((outputPath) => relative(rootDir, outputPath) && !relative(rootDir, outputPath).startsWith(".."));

  if (successfulOutputs.length === 0) {
    return;
  }

  const artifactClient = new DefaultArtifactClient();
  await artifactClient.uploadArtifact(artifactName, successfulOutputs, rootDir, {
    compressionLevel: 6
  });
}
