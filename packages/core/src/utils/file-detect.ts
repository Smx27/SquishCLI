import { extname } from "node:path";
import type { SupportedFileType } from "../types/compression";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const PDF_MIME_TYPES = new Set(["application/pdf"]);

/**
 * Determines supported file type by extension and optional MIME type.
 */
export function detectSupportedFileType(filePath: string, mimeType?: string): SupportedFileType | null {
  const extension = extname(filePath).toLowerCase();
  const normalizedMime = mimeType?.trim().toLowerCase();

  if (PDF_EXTENSIONS.has(extension) || (normalizedMime && PDF_MIME_TYPES.has(normalizedMime))) {
    return "pdf";
  }

  if (IMAGE_EXTENSIONS.has(extension) || (normalizedMime && IMAGE_MIME_TYPES.has(normalizedMime))) {
    return "image";
  }

  return null;
}
