import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uploadCompressedArtifact } from "./artifact.service";

describe("uploadCompressedArtifact", () => {
  it("uploads only successful outputs within root directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "squish-artifact-test-"));
    const external = await mkdtemp(join(tmpdir(), "squish-artifact-ext-"));

    try {
      await mkdir(join(root, "nested"), { recursive: true });
      const goodOutput = join(root, "nested", "image.squish.jpg");
      const outsideOutput = join(external, "outside.squish.jpg");
      await writeFile(goodOutput, "ok");
      await writeFile(outsideOutput, "nope");

      const previousCwd = process.cwd();
      process.chdir(root);
      try {
        await uploadCompressedArtifact(
          "bundle",
          [
            { inputPath: "a.jpg", outputPath: goodOutput, success: true },
            { inputPath: "b.jpg", outputPath: outsideOutput, success: true },
            { inputPath: "c.jpg", outputPath: join(root, "failed.jpg"), success: false }
          ],
          root
        );
      } finally {
        process.chdir(previousCwd);
      }

      expect(existsSync(join(root, ".artifacts", "bundle", "nested", "image.squish.jpg"))).toBeTrue();
      expect(existsSync(join(root, ".artifacts", "bundle", "outside.squish.jpg"))).toBeFalse();
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });
});
