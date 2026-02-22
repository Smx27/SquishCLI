import chalk from "chalk";

export function logInfo(message: string): void {
  console.log(chalk.cyan(`[squish] ${message}`));
}

export function logSuccess(message: string): void {
  console.log(chalk.green(`[squish] ${message}`));
}

export function logWarn(message: string): void {
  console.warn(chalk.yellow(`[squish] WARN: ${message}`));
}

export function logError(message: string): void {
  console.error(chalk.red(`[squish] ERROR: ${message}`));
}
