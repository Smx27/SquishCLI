# Configuration Reference

SquishCLI supports configuration through `squish.config.json`.

## File Location

Default lookup path:

```text
./squish.config.json
```

You can override via CLI:

```bash
squish ./assets --config ./config/squish.prod.json
```

## Config Schema

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

## Fields

- `preset` (`"low" | "medium" | "high" | "extreme"`)
  - Default compression behavior.

- `size` (`string`)
  - Human-readable target size like `200kb`, `1mb`, `2.5mb`.

- `output` (`string`)
  - Output directory path.

- `concurrency` (`number`)
  - Parallel compression count for batch mode.

- `watch` (`boolean`)
  - Enable watch mode for auto-recompression.

- `extreme.autoConvertToWebP` (`boolean`)
  - Allows conversion to WebP when compression strategy supports it.

## Priority & Precedence

Values are resolved in this order:

1. CLI flags
2. Config file
3. Built-in defaults

## Examples

### Balanced default for projects

```json
{
  "preset": "medium",
  "output": "./compressed",
  "concurrency": 4
}
```

### Strict size for upload pipelines

```json
{
  "size": "250kb",
  "preset": "high",
  "output": "./upload-ready"
}
```

### Extreme for static web assets

```json
{
  "preset": "extreme",
  "extreme": {
    "autoConvertToWebP": true
  }
}
```

## Validation Guidelines

- Reject negative/zero concurrency.
- Reject malformed size units.
- Warn on unknown keys (forward compatibility policy can vary by implementation).
