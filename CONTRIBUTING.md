# Contributing

Thanks for contributing to this fork of `node-cache`.

## Scope
- This fork prioritizes correctness, predictable behavior, and backward compatibility for the sync API.
- Security fixes and bug fixes are prioritized over new features.

## Before opening a PR
1. Open or reference an issue with reproduction steps.
2. Keep PRs focused (one concern per PR).
3. Add or update tests for behavior changes.
4. Run locally:
   - `npm ci`
   - `npm run build`
   - `npm test`

## Commit and PR expectations
- Use clear commit messages (imperative mood).
- Include a short risk section in the PR description.
- Mention whether the change is breaking (`BREAKING CHANGE:`) or not.

## Compatibility policy
- Runtime target: active Node.js LTS lines supported by CI.
- Public API changes require docs and typings updates in the same PR.

## Issue triage labels (recommended)
- `priority:P0` critical bug/regression
- `priority:P1` high-impact
- `priority:P2` docs/support
- `type:bug`, `type:feature`, `type:docs`, `type:question`

## Code of conduct
- Be respectful and evidence-driven. Reproducible reports get fastest turnaround.
