import type { SupportedFileType } from "../types/compression";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tiff"]);

/**
 * Determines supported file type by extension.
 */
export function detectSupportedFileType(filePath: string): SupportedFileType | null {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return "pdf";
  }

  for (const extension of IMAGE_EXTENSIONS) {
    if (lower.endsWith(extension)) {
      return "image";
    }
  }

  return null;
}
