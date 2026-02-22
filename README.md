# SquishCLI

A fast CLI for compressing images and PDFs with presets, target size controls, folder traversal, and watch mode.

## Install

### Prerequisites

- [Bun](https://bun.sh) (runtime + package manager)
- **Ghostscript** for PDF compression (`gs` must be available in `PATH`)

Install dependencies:

```bash
bun install
```

Run locally:

```bash
bun run ./bin/squish.ts --help
```

## CLI Usage

```bash
squish compress <input> [options]
```

`<input>` can be a file or directory. Directories are traversed recursively and only supported files are queued.

### Options

- `--size <value>` Target output size (`200kb`, `1mb`, etc.)
- `--preset <low|medium|high|extreme>` Compression profile
- `-o, --output <dir>` Output directory
- `--watch` Watch files and recompress on change
- `--concurrency <num>` Number of parallel jobs

### Examples

```bash
# Compress one image using default (medium) preset
squish compress ./assets/photo.jpg

# Compress directory recursively with high preset
squish compress ./assets --preset high

# Try to hit an approximate target size
squish compress ./assets/banner.png --size 200kb

# Write compressed files into a dedicated folder
squish compress ./assets -o ./compressed

# Watch a folder and recompress modified files
squish compress ./assets --preset medium --watch
```

## Presets

| Preset   | Quality | Resolution Scale | Output Format |
|----------|---------|------------------|---------------|
| low      | 82      | 1.0              | original      |
| medium   | 72      | 0.9              | original      |
| high     | 60      | 0.8              | original      |
| extreme  | 45      | 0.7              | webp          |

## Config file

Create `squish.config.json` in your working directory:

```json
{
  "preset": "high",
  "size": "1mb",
  "output": "./compressed",
  "concurrency": 6
}
```

Precedence order is:

1. CLI flags
2. `squish.config.json`
3. internal defaults

## Bun single-binary build

Build a standalone executable:

```bash
bun run bundle
```

Output binary:

```text
dist/squish
```

You can then run:

```bash
./dist/squish --help
```
