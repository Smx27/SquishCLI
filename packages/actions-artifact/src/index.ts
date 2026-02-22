import { cp, mkdir } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

export class DefaultArtifactClient {
  async uploadArtifact(name: string, files: string[], rootDirectory: string): Promise<{ id: number; size: number }> {
    const artifactRoot = join(process.cwd(), ".artifacts", name || "squish-output");
    await mkdir(artifactRoot, { recursive: true });

    for (const file of files) {
      const rel = relative(rootDirectory, file);
      const destination = join(artifactRoot, rel.startsWith("..") ? basename(file) : rel);
      await mkdir(dirname(destination), { recursive: true });
      await cp(file, destination, { force: true });
    }

    return { id: Date.now(), size: files.length };
  }
}
