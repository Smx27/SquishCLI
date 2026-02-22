import { appendFileSync } from "node:fs";

interface InputOptions {
  required?: boolean;
  trimWhitespace?: boolean;
}

function normalizeKey(name: string): string {
  return `INPUT_${name.replace(/ /g, "_").replace(/-/g, "_").toUpperCase()}`;
}

export function getInput(name: string, options: InputOptions = {}): string {
  const key = normalizeKey(name);
  const raw = process.env[key] ?? "";
  const trim = options.trimWhitespace ?? true;
  const value = trim ? raw.trim() : raw;

  if (options.required && value.length === 0) {
    throw new Error(`Input required and not supplied: ${name}`);
  }

  return value;
}

export function getBooleanInput(name: string, options: InputOptions = {}): boolean {
  const value = getInput(name, options).toLowerCase();

  if (value === "true") return true;
  if (value === "false") return false;

  throw new TypeError(`Input does not meet YAML 1.2 \"Core Schema\" boolean specification: ${name}`);
}

export function setOutput(name: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT;

  if (outputPath) {
    appendFileSync(outputPath, `${name}=${value}\n`, "utf8");
    return;
  }

  process.stdout.write(`::set-output name=${name}::${value}\n`);
}

export function info(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function error(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function setFailed(message: string): void {
  error(message);
  process.exitCode = 1;
}
