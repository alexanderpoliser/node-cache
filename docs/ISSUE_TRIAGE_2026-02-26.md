# Issue triage (snapshot: 2026-02-26)

Source: https://github.com/node-cache/node-cache/issues (open issues at triage time).

## Priority model
- P0: confirmed bug/regression with data loss, crashes, or wrong API semantics.
- P1: high-value bug or feature request with broad impact.
- P2: docs/questions/usability requests.
- P3: stale/noise/not actionable right now.

## P0 (immediate)
- #330 - Setting undefined as value returns null: https://github.com/node-cache/node-cache/issues/330
  - Status in this fork: fixed.
- #329 - expired/removed key can throw `Cannot read properties of undefined (reading 'v')`: https://github.com/node-cache/node-cache/issues/329
  - Status in this fork: fixed.
- #313 - recursive `expired` calls with `deleteOnExpire:false` can stack overflow: https://github.com/node-cache/node-cache/issues/313
  - Status in this fork: fixed.
- #327 - outdated dependencies in package: https://github.com/node-cache/node-cache/issues/327
  - Status in this fork: partially addressed with direct dependency/tooling updates.

## P1 (next release cycle)
- #273 - TS generic typing improvements: https://github.com/node-cache/node-cache/issues/273
- #272 - `update()` API request: https://github.com/node-cache/node-cache/issues/272
- #232 - optional eviction policy when full: https://github.com/node-cache/node-cache/issues/232
- #262 - concurrent request behavior: https://github.com/node-cache/node-cache/issues/262
- #295 - performance with large JSON payloads: https://github.com/node-cache/node-cache/issues/295
- #286 - performance complaint/validation: https://github.com/node-cache/node-cache/issues/286
- #229 - housekeeping performance: https://github.com/node-cache/node-cache/issues/229
- #163 - expired event behavior/docs confusion: https://github.com/node-cache/node-cache/issues/163

## P2 (docs/support backlog)
- #328, #319, #251 - maintenance/release communication: https://github.com/node-cache/node-cache/issues/328
- #322, #312, #311, #310, #306, #299, #293 - usage and architecture questions.
- #291, #290, #285, #277, #276, #255, #245, #242, #225, #224, #219, #226 - API/docs clarifications and feature asks.
- #70, #69 - documentation and modernization requests.

## P3 (stale/not actionable)
- #321 - low-signal report (`L`): https://github.com/node-cache/node-cache/issues/321
- #307 - generic bug report without reproduction: https://github.com/node-cache/node-cache/issues/307

## Notes
- Many old open issues are support questions that should be migrated to Discussions or answered via FAQ docs.
- Next triage should close/label stale support tickets older than 12 months.
