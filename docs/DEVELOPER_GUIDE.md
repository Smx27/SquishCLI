# Developer Guide

This guide explains how to set up SquishCLI locally, how development flows work, and how to validate changes before publishing.

## 1) Local Setup

### Prerequisites

- Bun >= 1.0
- Ghostscript (for PDF compression testing)
- Git

### Clone and install

```bash
git clone <repo-url>
cd SquishCLI
bun install
```

### Run in development mode

```bash
bun run dev -- --help
```

---

## 2) Scripts

Common scripts (exact names depend on `package.json` implementation):

- `bun run dev` — run CLI in development
- `bun run typecheck` — TypeScript strict checking
- `bun run lint` — lint sources
- `bun run build` — compile/build project artifacts
- `bun run build:binary` — compile single executable via Bun
- `bun run test` — run automated tests

---

## 3) Recommended Project Structure

```text
bin/
  squish.ts                  # CLI entrypoint (shebang)
src/
  commands/                  # CLI command registration and parsing
  core/                      # Compression engine and orchestration
  services/                  # Image/PDF compression implementations
  utils/                     # Utility helpers (size, detection, logging)
  config/                    # Preset + config loading
  types/                     # Shared TypeScript types/interfaces
docs/
  *.md                       # User/developer documentation
```

---

## 4) Architecture Overview

- **Command Layer (`src/commands`)**
  - Parses CLI input and resolves runtime options.
  - Should avoid business logic.

- **Core Layer (`src/core`)**
  - Orchestrates workflows (single/batch, routing by file type).
  - Owns smart target-size loops and retries.

- **Service Layer (`src/services`)**
  - Contains format-specific compression logic.
  - `sharp` for images, Ghostscript process for PDFs.

- **Utility Layer (`src/utils`)**
  - Pure reusable helpers: path handling, size parsing, logs.

- **Config Layer (`src/config`)**
  - Loads and validates `squish.config.json`.
  - Merges defaults/config/CLI options by precedence.

---

## 5) Development Principles

- Use strict TypeScript typing for all public APIs.
- Prefer async I/O over sync APIs.
- Avoid blocking event loop in hot paths.
- Keep functions single-purpose and testable.
- Validate user input early with actionable error messages.
- Preserve deterministic output for automation scripts.

---

## 6) Working with Compression Logic

### Image compression (`sharp`)

- Apply preset defaults first.
- For `--size`, run bounded iterative attempts.
- Optionally convert to WebP for extreme profile.
- Avoid loading unnecessary metadata when not needed.

### PDF compression (Ghostscript)

- Spawn child process with safe argument escaping.
- Capture `stderr`/`stdout` for diagnostics.
- Return typed result objects instead of throwing raw errors only.

---

## 7) Testing Strategy

- Unit-test pure utilities (`size parsing`, `file type detection`, `config merge`).
- Integration-test CLI command behavior with fixture files.
- Include large-file smoke tests where feasible.
- Verify cross-platform path compatibility.

Example checks:

```bash
bun run typecheck
bun run test
bun run build
```

---

## 8) Release Flow (Suggested)

1. Update docs + changelog.
2. Run typecheck/lint/tests/build.
3. Bump version using semver.
4. Tag release.
5. Publish:
   ```bash
   npm publish
   ```
6. Validate install in clean environment:
   ```bash
   npm i -g squishcli
   squish --version
   ```

---

## 9) Troubleshooting for Contributors

- Ghostscript not found → ensure binary exists in PATH.
- Native module issues (`sharp`) → reinstall dependencies and check platform support.
- Unexpected output path behavior → test with absolute and relative paths.

For user-facing issues, also reference: [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).
