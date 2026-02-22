# GitHub Action Release & Maintenance Guide

This guide defines how maintainers publish `@squish/github-action`, manage tags, and keep Marketplace metadata up to date.

## 1) Release tag convention

Use both immutable and moving tags:

- **Immutable tag**: `v2.0.0` (never moved after creation).
- **Moving major tag**: `v2` (updated to point at the latest stable `v2.x.y` release).

Recommended policy:

1. Create and push an immutable tag for each release (`vX.Y.Z`).
2. Move the major tag (`vX`) to that same commit.
3. Keep examples in docs/workflows using major tag (`@v2`) for easier patch/minor adoption.
4. Recommend production users pin immutable tags when strict reproducibility is required.

## 2) Bundle freshness CI and branch protection

The repository includes the workflow **Action Bundle Freshness** with job **verify-bundle**.

It checks that:

- `packages/github-action/action.yml` points to `dist/index.js`.
- Rebuilding the action does not change `packages/github-action/dist/index.js`.

### Branch protection requirement

In GitHub branch protection for `main`, add this required status check:

- `Action Bundle Freshness / verify-bundle`

This prevents merges when source and committed bundle drift.

## 3) Publishing checklist (maintainers)

1. Ensure action changes are recorded in `packages/github-action/CHANGELOG.md`.
2. Run local validation:
   - `bun run --cwd packages/github-action build`
   - `git diff -- packages/github-action/dist/index.js`
3. Merge to `main` only after **Action Bundle Freshness** passes.
4. Create release commit/tag:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
5. Move major tag:
   - `git tag -fa vX -m "Move vX to vX.Y.Z"`
   - `git push origin vX --force`
6. Create GitHub release notes using template:
   - `.github/release-notes/github-action-template.md`

## 4) Marketplace metadata updates

When action-facing behavior changes, review and update metadata sources:

- `packages/github-action/action.yml` (name/description/inputs/outputs/runs).
- `packages/github-action/README.md` (usage examples, permissions, feature matrix).
- Repository topics/description and release notes in GitHub UI.

Keep `action.yml` and README synchronized so Marketplace presentation matches runtime behavior.
