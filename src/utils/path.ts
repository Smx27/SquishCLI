import path from "node:path";

/**
 * Builds a default output path with a `.squished` suffix in the same directory.
 */
export function buildDefaultOutputPath(inputPath: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.squished${parsed.ext}`);
}

/**
 * Joins output directory with original basename.
 */
export function buildOutputPathInDir(inputPath: string, outputDir: string): string {
  return path.join(outputDir, path.basename(inputPath));
}
