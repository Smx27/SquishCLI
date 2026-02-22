/**
 * Writes an informational log message.
 */
export function logInfo(message: string): void {
  console.log(`[squish] ${message}`);
}

/**
 * Writes a warning log message.
 */
export function logWarn(message: string): void {
  console.warn(`[squish] WARN: ${message}`);
}

/**
 * Writes an error log message.
 */
export function logError(message: string): void {
  console.error(`[squish] ERROR: ${message}`);
}
