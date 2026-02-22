# Troubleshooting

## 1) `Ghostscript not found` when compressing PDFs

### Symptoms
- PDF compression fails immediately
- Error mentions `gs` command missing

### Fix
- Install Ghostscript for your OS
- Confirm with:
  ```bash
  gs --version
  ```
- Ensure executable is available in your `PATH`

---

## 2) `sharp` installation/build errors

### Symptoms
- Install fails on native module setup
- Runtime fails on image operations

### Fix
- Reinstall dependencies:
  ```bash
  rm -rf node_modules bun.lockb
  bun install
  ```
- Ensure your OS/CPU combo is supported by sharp prebuilt binaries
- On CI, verify system libraries if using non-standard environments

---

## 3) Output files not where expected

### Symptoms
- Files appear in unexpected folder

### Fix
- Use explicit output path:
  ```bash
  squish ./assets -o ./dist
  ```
- Check whether input is file vs folder
- Prefer absolute paths in scripts for deterministic output

---

## 4) Very small target size not reached

### Symptoms
- `--size` result larger than requested target

### Why this happens
- Codec and content constraints can prevent exact target match
- Quality floor reached before target can be met

### Fix
- Try `--preset extreme`
- Increase target size slightly
- For images, allow conversion-friendly formats where supported

---

## 5) Slow batch compression

### Fixes
- Tune concurrency:
  ```bash
  squish ./assets --concurrency 4
  ```
- Avoid very high concurrency on low-memory machines
- Prefer preset-based compression when strict target size is unnecessary

---

## 6) Windows path and quoting issues

### Fix
Use quotes around paths with spaces:

```bash
squish "C:\\My Files\\image one.png" -o "C:\\out folder"
```

---

## 7) Need more logs for debugging

### Fix
- Run single-file compression first to isolate issue
- Capture command output in CI logs
- Keep a reproducible sample input for issue reports

---

## Still stuck?

Open an issue with:

- OS and architecture
- Bun version
- SquishCLI version
- Full command used
- Relevant logs/error messages
