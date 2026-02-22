import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseInputs } from "./inputs";

const KEYS = [
  "GITHUB_WORKSPACE",
  "INPUT_PATH",
  "INPUT_PRESET",
  "INPUT_TARGET_SIZE",
  "INPUT_COMMIT",
  "INPUT_ARTIFACT",
  "INPUT_MAX_SIZE",
  "INPUT_DRY_RUN",
  "INPUT_INCLUDE_GLOB",
  "INPUT_EXCLUDE_GLOB"
] as const;

afterEach(() => {
  for (const key of KEYS) {
    delete process.env[key];
  }
});

describe("parseInputs", () => {
  it("parses valid input payload", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "squish-action-inputs-"));

    try {
      process.env.GITHUB_WORKSPACE = workspace;
      process.env.INPUT_PATH = "./assets";
      process.env.INPUT_PRESET = "medium";
      process.env.INPUT_TARGET_SIZE = "200kb";
      process.env.INPUT_COMMIT = "false";
      process.env.INPUT_ARTIFACT = "squish-output";
      process.env.INPUT_MAX_SIZE = "500kb";
      process.env.INPUT_DRY_RUN = "false";
      process.env.INPUT_INCLUDE_GLOB = "**/*.png,**/*.pdf";
      process.env.INPUT_EXCLUDE_GLOB = "node_modules/**";

      const parsed = parseInputs();
      expect(parsed.inputPath).toBe(join(workspace, "assets"));
      expect(parsed.preset).toBe("medium");
      expect(parsed.targetSize?.unit).toBe("kb");
      expect(parsed.targetSize?.value).toBe(200);
      expect(parsed.maxSize?.value).toBe(500);
      expect(parsed.includeGlobs).toEqual(["**/*.png", "**/*.pdf"]);
      expect(parsed.excludeGlobs).toEqual(["node_modules/**"]);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it("rejects commit in dry-run mode", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "squish-action-inputs-"));

    try {
      process.env.GITHUB_WORKSPACE = workspace;
      process.env.INPUT_PATH = ".";
      process.env.INPUT_PRESET = "medium";
      process.env.INPUT_TARGET_SIZE = "200kb";
      process.env.INPUT_COMMIT = "true";
      process.env.INPUT_ARTIFACT = "squish-output";
      process.env.INPUT_MAX_SIZE = "1mb";
      process.env.INPUT_DRY_RUN = "true";
      process.env.INPUT_INCLUDE_GLOB = "**/*.png";
      process.env.INPUT_EXCLUDE_GLOB = "dist/**";

      expect(() => parseInputs()).toThrow('"commit" cannot be true when "dry-run" is true');
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it("rejects path traversal outside workspace", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "squish-action-inputs-"));

    try {
      process.env.GITHUB_WORKSPACE = workspace;
      process.env.INPUT_PATH = "../outside";
      process.env.INPUT_PRESET = "low";
      process.env.INPUT_TARGET_SIZE = "";
      process.env.INPUT_COMMIT = "false";
      process.env.INPUT_ARTIFACT = "squish-output";
      process.env.INPUT_MAX_SIZE = "1mb";
      process.env.INPUT_DRY_RUN = "false";
      process.env.INPUT_INCLUDE_GLOB = "**/*.png";
      process.env.INPUT_EXCLUDE_GLOB = "dist/**";

      expect(() => parseInputs()).toThrow("resolves outside GITHUB_WORKSPACE");
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
