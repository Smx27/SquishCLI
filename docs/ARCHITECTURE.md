# SquishCLI Architecture

This document describes the clean architecture approach for SquishCLI.

## Goals

- Performance-first file compression for CLI environments
- Maintainable modular codebase
- Easy extension for future formats and strategies

## High-Level Design

```text
CLI Input
   ↓
Command Layer (parse + validate)
   ↓
Core Engine (orchestrate + route)
   ↓
Compression Services (image/pdf)
   ↓
File Output + Stats + Logs
```

## Layers

### 1) Command Layer (`src/commands`)

Responsibilities:
- Register commands/options using `cac`
- Parse user flags and normalize options
- Trigger engine workflows

Non-responsibilities:
- No codec-specific compression logic

### 2) Core Layer (`src/core`)

Responsibilities:
- Decide workflow (single vs batch)
- Detect file types and route to services
- Handle target-size iteration and convergence
- Manage concurrency for folder operations

### 3) Services Layer (`src/services`)

Responsibilities:
- Encapsulate compression implementations
- Image service uses `sharp`
- PDF service uses Ghostscript via child process

Service contracts should be typed and return structured results.

### 4) Utility Layer (`src/utils`)

Responsibilities:
- Parse/format file sizes
- File type detection
- Path normalization and directory handling
- Logging utilities

### 5) Types & Config (`src/types`, `src/config`)

Responsibilities:
- Shared interfaces and enums
- Preset strategy definitions
- Config loading and merge precedence

## Data Flow

1. Parse options and resolve defaults.
2. Build compression jobs (single file or batch).
3. Detect format and select service.
4. Execute compression.
5. If target size defined, iterate until convergence/limit.
6. Persist output and print stats.

## Smart Compression Loop (Concept)

- Start with preset baseline.
- Measure output size after each attempt.
- Adjust quality/compression parameters toward target.
- Use bounded attempts to avoid infinite loops.
- Stop at quality floor and return best attempt.

## Scalability & Performance Notes

- Concurrency-limited batch processing prevents resource saturation.
- Stream and file-based operations reduce memory pressure.
- Avoid sync FS calls in runtime hot paths.
- Keep expensive metadata reads minimal.

## Error Handling Model

- Argument/config errors: fail fast with actionable message.
- Unsupported files: skip with warning in batch mode.
- External dependency failures (Ghostscript): typed errors with remediation hints.

## Extensibility

To add a new format:

1. Add type detection in `src/utils/file-detect.ts`.
2. Implement service in `src/services`.
3. Register routing in `src/core/compression-engine.ts`.
4. Add docs/examples and tests.
