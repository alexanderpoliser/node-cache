# Release Policy

## Versioning
This fork uses semantic versioning (SemVer): `MAJOR.MINOR.PATCH`.

- PATCH: bug fixes, test/docs updates, non-breaking dependency updates.
- MINOR: backward-compatible features and opt-in behavior.
- MAJOR: breaking API/type/behavior changes.

## Release cadence
- Patch releases: as needed for regressions/security.
- Minor releases: batched, roughly monthly when there is enough validated scope.
- Major releases: scheduled and announced in advance.

## Release checklist
1. Triage open issues and assign priorities.
2. Ensure `npm run build` and `npm test` pass in CI.
3. Update changelog/release notes with migration notes when needed.
4. Tag release (`vX.Y.Z`) and publish package/artifacts.

## Backport policy
- Critical fixes may be backported to the latest previous minor when low risk.
- Features are not backported.

## Dependency policy
- Keep direct dependencies current.
- Review transitive vulnerabilities periodically.
- Prefer non-breaking updates unless security requires otherwise.
