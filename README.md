# SquishCLI

> Fast, production-grade file compression CLI built with **Bun + TypeScript**.

SquishCLI helps you compress images and PDFs with smart defaults, target-size optimization, and batch workflows that are easy to automate in CI/CD.

---

## Why SquishCLI?

- 🚀 **Fast runtime** powered by Bun
- 🧠 **Smart compression loop** to approach a target size (e.g. `200kb`, `1mb`)
- 🗂️ **Batch processing** for folders
- 🔍 **Automatic file type detection**
- 🎛️ **Presets** for quick quality/size trade-offs
- 📦 **NPM global CLI** + Bun single-binary support

---

## Features

### MVP
- Compress images (`.jpg`, `.jpeg`, `.png`, `.webp`)
- Compress PDFs (via Ghostscript)
- Single file or full folder input
- `--size` target mode (e.g. `200kb`, `1mb`)
- `--preset` mode (`low`, `medium`, `high`, `extreme`)
- Output file stats after compression
- Output directory support (`-o`, `--output`)

### Advanced
- Smart iterative compression strategy
- Batch compression with configurable concurrency
- Colored terminal output + progress indicators
- Robust invalid-file handling
- Cross-platform compatibility (Windows / macOS / Linux)
- Config file support (`squish.config.json`)
- Optional watch mode (if enabled)

---

## Installation

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Node-compatible environment for npm global installs
- **Ghostscript** (required for PDF compression)

#### Ghostscript installation

- **macOS (Homebrew):**
  ```bash
  brew install ghostscript
  ```

- **Ubuntu/Debian:**
  ```bash
  sudo apt-get update && sudo apt-get install -y ghostscript
  ```

- **Windows (winget):**
  ```bash
  winget install ArtifexSoftware.GhostScript
  ```

Verify installation:
```bash
gs --version
```

---

### Install from npm

```bash
npm install -g squishcli
```

Then run:
```bash
squish --help
```

### Run via Bun (project/dev)

```bash
bun install
bun run dev -- --help
```

---

## Quick Start

```bash
# Compress a single image (default preset)
squish file.jpg

# Compress with target size
squish image.png --size 200kb

# Compress PDF using aggressive preset
squish document.pdf --preset high

# Compress an entire folder
squish ./assets --preset medium

# Write output to custom folder
squish file.jpg -o ./dist
```

---

## CLI Usage

```bash
squish <input> [options]
```

### Arguments

- `input` — file path or folder path to compress

### Options

- `--size <value>`
  - Target output size (e.g. `150kb`, `1mb`, `2.5mb`)
  - Cannot be used with incompatible file formats
- `--preset <level>`
  - One of: `low`, `medium`, `high`, `extreme`
- `-o, --output <dir>`
  - Output directory for compressed files
- `--concurrency <n>`
  - Number of files compressed in parallel during batch mode
- `--config <path>`
  - Custom config file path (default: `./squish.config.json`)
- `--watch`
  - Re-compress on file changes (if watch mode is enabled in build)
- `--no-color`
  - Disable ANSI color output
- `-h, --help`
  - Show help
- `-v, --version`
  - Show version

---

## Compression Presets

| Preset  | Strategy | Typical Usage |
|---------|----------|---------------|
| `low` | Minimal quality loss, light compression | Portfolios, image-heavy docs where quality matters |
| `medium` | Balanced quality and size | Default for most workflows |
| `high` | Aggressive compression | Websites, email attachments, quick optimization |
| `extreme` | Maximum size reduction, quality trade-off | Archival/transfers with strict size limits |

> In `extreme`, images may be converted to WebP when beneficial (based on implementation/config).

---

## Target Size Behavior (`--size`)

When you provide `--size`, SquishCLI performs iterative compression to approach the target output size.

### How it works

1. Detect file type and pick base strategy.
2. Apply preset defaults (if provided).
3. Run iterative quality/compression adjustments.
4. Stop when:
   - target size is met, or
   - max iterations reached, or
   - quality floor reached.

### Important notes

- Exact byte-perfect target matching is not always possible due to codec behavior.
- Very small targets may produce visible quality degradation.
- For PDFs, Ghostscript profiles are mapped to presets and optimization levels.

---

## Batch Compression

When input is a folder:

- SquishCLI scans supported file types
- Compresses files concurrently
- Preserves relative folder structure in output (if configured)
- Prints per-file and summary stats

Example:
```bash
squish ./assets --preset medium --concurrency 4 -o ./dist
```

---

## Configuration File

Create `squish.config.json` in your project root:

```json
{
  "preset": "medium",
  "size": "500kb",
  "output": "./dist",
  "concurrency": 4,
  "watch": false,
  "extreme": {
    "autoConvertToWebP": true
  }
}
```

### Priority order

1. CLI flags (highest priority)
2. `squish.config.json`
3. Built-in defaults

Full details: [`docs/CONFIGURATION.md`](./docs/CONFIGURATION.md)

---

## Output & Logging

For each file, SquishCLI reports:

- Input path
- Output path
- Original size
- Compressed size
- Reduction percentage
- Compression mode used (preset/target)

Summary includes total files, total size saved, and elapsed time.

---

## Exit Codes

- `0` — Success
- `1` — General runtime error
- `2` — Invalid input/arguments
- `3` — Missing dependency (e.g., Ghostscript not found for PDF)

---

## Performance Tips

- Use folder compression with tuned `--concurrency` for best throughput.
- Prefer `--preset medium` for speed/quality balance.
- Use `--size` only when strict limits are required.
- On constrained systems, reduce concurrency to avoid memory pressure.

---

## Cross-Platform Notes

- Paths with spaces are supported when quoted:
  ```bash
  squish "./My Assets/image one.png" -o "./out folder"
  ```
- Ghostscript executable may vary by platform; ensure it is available on `PATH`.

---

## Bun Single Binary Build (for maintainers)

```bash
bun run build:binary
```

This compiles SquishCLI into a standalone executable (platform-specific).

---

## Documentation Index

- [Developer Guide](./docs/DEVELOPER_GUIDE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Configuration Reference](./docs/CONFIGURATION.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Contributing](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

---

## Contributing

Contributions are welcome! Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first.

---

## License

MIT — see [`LICENSE`](./LICENSE).
