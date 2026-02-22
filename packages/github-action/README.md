# Squish CLI GitHub Action

Use the Squish GitHub Action to optimize repository assets (images and PDFs) in CI using Squish presets, optional size targets, optional budget checks, artifact uploads, and optional auto-commit behavior.

> Release tag usage example: `uses: owner/squishcli@v2`

## Purpose

This action is designed for teams that want a repeatable, policy-driven optimization step in GitHub Actions.

- Scans a file or directory inside `GITHUB_WORKSPACE`.
- Optimizes supported image formats and PDFs.
- Supports compression presets (`low`, `medium`, `high`, `extreme`) and optional `target-size` for image tuning.
- Can overwrite source files and auto-commit optimization results.
- Can upload optimized outputs as a build artifact.
- Publishes outputs and a job summary for downstream checks.

## Feature matrix

| Capability | Status | Notes |
| --- | --- | --- |
| Image compression | ✅ | Handled by Squish core image pipeline. |
| PDF compression | ✅ | Requires `gs` (Ghostscript) on the runner for successful PDF optimization. |
| Include / exclude glob filtering | ✅ | `include-glob` and `exclude-glob` support comma or newline separated values. |
| Dry-run reporting | ✅ | `dry-run: true` reports counts/outputs without writing files. |
| Commit optimized files | ✅ | `commit: true` applies generated files and creates an automated commit. |
| Artifact upload | ✅ | `artifact` uploads optimized outputs from transient output paths. |
| PR comment summary | ✅ | Posts comment only on `pull_request` events when token and permissions allow. |
| Max-size budget reporting | ✅ | `max-size` computes `budget-violations` output; does not fail by itself. |

## Required permissions

Set only what your workflow needs.

### Minimum baseline

For checkout and read operations:

```yaml
permissions:
  contents: read
```

### Commit mode (`commit: true`)

Commit mode needs write permission to push updates:

```yaml
permissions:
  contents: write
```

### PR comment support

PR comments use the Issues API (`issues.createComment`) on `pull_request` events. Grant comment scopes when you want PR summaries:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

## Inputs

All action inputs are required by metadata and should be provided explicitly (use empty strings when optional behavior is not needed).

| Input | Required | Default | Description | Example |
| --- | --- | --- | --- | --- |
| `path` | Yes | _none_ | File or directory path to scan (must resolve inside `GITHUB_WORKSPACE`). | `assets` |
| `preset` | Yes | _none_ | Compression preset: `low`, `medium`, `high`, `extreme`. | `high` |
| `target-size` | Yes | `""` | Optional image target size (`200kb`, `1mb`, `512b`). | `350kb` |
| `commit` | Yes | _none_ | Boolean string `true`/`false`. Cannot be `true` when `dry-run` is `true`. | `false` |
| `artifact` | Yes | `""` | Optional artifact name for compressed outputs. Invalid with `dry-run: true`. | `squish-output` |
| `max-size` | Yes | `""` | Optional post-optimization per-file budget for `budget-violations`. | `400kb` |
| `dry-run` | Yes | _none_ | Boolean string `true`/`false`. Skips writes and artifact/commit operations. | `false` |
| `include-glob` | Yes | `""` | Optional comma/newline include patterns. | `**/*.png,**/*.jpg` |
| `exclude-glob` | Yes | `""` | Optional comma/newline exclude patterns. | `**/node_modules/**` |

## Outputs

| Output | Description | Example |
| --- | --- | --- |
| `files-scanned` | Number of eligible files considered for optimization or dry-run processing. | `24` |
| `files-optimized` | Number of files successfully optimized. | `18` |
| `bytes-before` | Aggregate input size across optimized files. | `10485760` |
| `bytes-after` | Aggregate output size across optimized files. | `7340032` |
| `bytes-saved` | `bytes-before - bytes-after` (non-negative). | `3145728` |
| `savings-percent` | Savings percentage formatted to two decimals. | `30.00` |
| `budget-violations` | Count of optimized files that exceed `max-size` (if configured). | `2` |

## Workflow examples

### 1) `push` example (artifact mode)

```yaml
name: squish-on-push

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Squish optimize (artifact only)
        id: squish
        uses: owner/squishcli@v2
        with:
          path: assets
          preset: medium
          target-size: ""
          commit: "false"
          artifact: squish-assets
          max-size: 500kb
          dry-run: "false"
          include-glob: |
            **/*.png
            **/*.jpg
            **/*.jpeg
            **/*.webp
            **/*.pdf
          exclude-glob: |
            **/node_modules/**
            **/.git/**
```

### 2) `pull_request` example (comment + report)

```yaml
name: squish-on-pr

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Squish analyze PR assets
        id: squish
        uses: owner/squishcli@v2
        with:
          path: .
          preset: high
          target-size: ""
          commit: "false"
          artifact: ""
          max-size: 750kb
          dry-run: "false"
          include-glob: |
            docs/**/*.png
            docs/**/*.jpg
            docs/**/*.pdf
          exclude-glob: |
            **/vendor/**
```

### 3) `workflow_dispatch` example (commit mode)

```yaml
name: squish-manual

on:
  workflow_dispatch:
    inputs:
      preset:
        description: Squish preset
        type: choice
        options: [low, medium, high, extreme]
        default: medium

permissions:
  contents: write

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Squish optimize and commit
        uses: owner/squishcli@v2
        with:
          path: assets
          preset: ${{ inputs.preset }}
          target-size: ""
          commit: "true"
          artifact: ""
          max-size: ""
          dry-run: "false"
          include-glob: ""
          exclude-glob: ""
```

## Ghostscript dependency (PDF behavior)

PDF compression relies on `gs` (Ghostscript) being available in `PATH` on the runner.

- When Ghostscript is available and succeeds, PDFs are optimized like other supported assets.
- When Ghostscript is missing or execution fails, PDF jobs are marked failed and surfaced in action logs/failures.
- Typical fallback/error messages include:
  - `Ghostscript execution error: ...` (for spawn/runtime errors, including missing binary).
  - `Ghostscript failed (code X). stderr: ... stdout: ...` (for non-zero Ghostscript exits).

Recommended runner setup for Ubuntu:

```yaml
- name: Install Ghostscript
  run: sudo apt-get update && sudo apt-get install -y ghostscript
```

## Security notes

- **Minimize token scope**: grant the smallest permission set required for your selected mode (`contents: read` for analyze-only, `contents: write` for commit mode, PR comment scopes only when needed).
- **Avoid recursive commit loops**: the action includes loop guards by skipping auto-commit when the actor is `squish-bot` or when the latest commit subject already includes `[skip squish]`.
- **Path safety**: `path` and glob validation reject workspace escapes (absolute traversal/out-of-workspace resolution).

## Release usage examples

Prefer immutable releases/tags over branch refs for production pipelines:

```yaml
- uses: owner/squishcli@v2
```

```yaml
- uses: owner/squishcli@v2.1.3
```

