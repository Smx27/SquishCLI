# Contributing to SquishCLI

Thanks for your interest in contributing! 🎉

## Ground Rules

- Keep changes focused and atomic.
- Follow clean architecture boundaries.
- Maintain strict TypeScript quality.
- Update docs with behavior changes.

## Development Setup

```bash
git clone <repo-url>
cd SquishCLI
bun install
bun run dev -- --help
```

## Branch & Commit Style

Recommended commit style (Conventional Commits):

- `feat: add webp fallback in extreme preset`
- `fix: handle invalid size unit parsing`
- `docs: expand troubleshooting for ghostscript`

## Pull Request Checklist

- [ ] Code builds successfully
- [ ] Type checks pass
- [ ] Tests pass (if present)
- [ ] Docs updated
- [ ] No breaking changes without migration notes

## Reporting Bugs

Please include:

- Reproduction steps
- Sample command used
- Expected vs actual result
- Platform details (OS/Bun/version)

## Feature Requests

Provide:

- Problem statement
- Proposed CLI/API shape
- Performance and DX impact
