# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [6.0.0] - 2026-02-28

### Breaking Changes

- **Node.js minimum raised to 20 LTS.** Versions below 20 are no longer supported. CI tests Node 20, 22, and 24.
- **`enableLegacyCallbacks` removed.** Callback-style API (deprecated since v5.0.0) is no longer available.
- **Production source rewritten in TypeScript.** The CoffeeScript source is retained in `_src/` for reference but is no longer the build target. The production entry point is now `dist/node-cache.js` compiled from `src/node-cache.ts`.

### Bug Fixes

- **`set()` no longer throws `ECACHEFULL` when updating an existing key** at `maxKeys` capacity. Previously, updating an existing key incorrectly consumed a capacity slot.
- **`flushStats()` no longer breaks `maxKeys` enforcement.** Key counting (`_keyCount`) is now independent of statistics tracking, so resetting stats does not reset the key counter.
- **Type definitions fixed:** removed dead `errorOnMissing` option, added missing `e: boolean` field to `WrappedValue`, fixed `fetch()` overloads to accept raw values, removed bogus `getTtl` boolean overload.

### New Features

- **`enableStats` option** (default: `true`). Set to `false` to skip hit/miss/key statistics tracking. Performance impact is workload-dependent and should be benchmarked in your environment.
- **`fetch()` accepts raw values** in addition to factory functions: `cache.fetch(key, ttl, value)`.

### Performance

- **TTL expiry rewritten from O(n) linear scan to O(log n) min-heap.** Local benchmark runs show a median speedup around 6.22x at 100K keys (range 3.76x-8.16x).
- **Stats bypass is workload-dependent.** In local runs, `enableStats=false` was slightly lower in median throughput (`0.95x`) than `enableStats=true`, while p95 latency remained similar.
- **Benchmark suite added.** Run `npm run bench` and `npm run bench:heap` to reproduce.

### Packaging

- Production entry point moved from `lib/node_cache.js` (CoffeeScript-compiled) to `dist/node-cache.js` (TypeScript-compiled).
- Type definitions are now generated from TypeScript source rather than hand-maintained.
- Added `prepare` npm lifecycle script (`npm run build`) for pre-publish builds.
- Package size (`npm pack --dry-run`): 14 files, tarball ~11.7 KB (unpacked ~38.1 KB).

### Internal

- Full TypeScript rewrite of all 15 public methods and 5 events with identical behavior (validated by 178 tests running on both CoffeeScript and TypeScript paths).
- 39 API contract tests added to enforce method signatures, return types, error codes, and event contracts.
- CI updated: `npm run build`, `npm test`, and `npm run test:ts` are hard gates.
- Dev dependency updates: coffeescript 2.7, mocha 11.3, nyc 17, typescript 5.9.

## [5.1.2] - 2020-07-01

- Type definition for `.take()` and typo fixes.
- Error when setting a value in a JS environment without `Buffer` in global scope.

## [5.1.1] - 2020-06-06

- Various bug fixes and improvements.

## [5.1.0] - 2019-12-08

- Added `.take()` method.
- Added `.flushStats()` method.

## [5.0.0] - 2019-10-23

- Removed lodash dependency.
- Added `.has(key)` and `.mset([{key, val, ttl}])` methods.
- Callbacks deprecated (available via `enableLegacyCallbacks` option).
