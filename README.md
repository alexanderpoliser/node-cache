![Logo](./logo/logo.png)

[![GitHub issues](https://img.shields.io/github/issues/alexanderpoliser/node-cache)](https://github.com/alexanderpoliser/node-cache/issues)

# node-cache (maintained fork)

A simple, fast, in-memory caching module for Node.js with `set`, `get`, and `delete` methods. Works like memcached but runs entirely in-process. Keys support automatic expiration via TTL.

> **This is an actively maintained fork** of the original [node-cache](https://github.com/node-cache/node-cache) by [@mpneuried](https://github.com/mpneuried). The original project is no longer maintained. This fork continues development with bug fixes, a full TypeScript rewrite, and performance improvements while keeping the public API fully backward-compatible.

## What's different from the original

This fork (v6.0.0) includes the following improvements over the last published original (v5.1.2):

- **TypeScript rewrite** -- Full rewrite from CoffeeScript to TypeScript. Type definitions are now generated from source, not hand-maintained.
- **Bug fixes** -- `set()` no longer throws `ECACHEFULL` when updating an existing key at `maxKeys` capacity. `flushStats()` no longer breaks `maxKeys` enforcement.
- **Performance** -- TTL expiry rewritten from O(n) linear scan to O(log n) min-heap (~4x-8x faster at 100K keys in local runs). New `enableStats` option allows stats to be disabled when beneficial (measure in your workload).
- **Security** -- Reduced dev dependency vulnerabilities from **20 to 2** by removing grunt, coveralls, and upgrading the entire toolchain. Production dependencies have 0 known vulnerabilities. Total package count cut from 910 to 362.
- **Modern Node.js** -- Minimum Node.js version raised to 20 LTS. CI tested on Node 20, 22, and 24.
- **Removed legacy** -- `enableLegacyCallbacks` option removed (deprecated since v5.0.0).

The public API (15 methods + 5 events) is **unchanged**. `require("node-cache")` is a drop-in replacement.

### Security comparison

| | Original (v5.1.2) | This fork (v6.0.0) |
|---|---|---|
| Production vulnerabilities | 0 | 0 |
| Dev vulnerabilities | **20** (2 critical, 12 high, 3 moderate, 3 low) | **2** (mocha transitive only) |
| Total packages (incl. transitive) | 910 | 362 |
| Grunt (vulnerable toolchain) | Required | Removed |
| Coveralls (deprecated) | Required | Removed |

The original v5.1.2 ships with vulnerable versions of `minimatch`, `form-data`, `qs`, `tough-cookie`, `debug`, `js-yaml`, `diff`, and others via its grunt/coveralls/mocha dependency tree. This fork eliminated all but 2 (both `serialize-javascript` inside mocha, dev-only).

### Performance comparison

| Benchmark | Original | This fork | Improvement |
|---|---|---|---|
| TTL expiry check (100K keys) | linear scan | min-heap | **~4x-8x faster** in local runs |
| set+get with `enableStats: false` | N/A (always on) | optional stats tracking | improvement is workload-dependent |
| useClones=false vs true | Same option | Same option | **~3x faster** in local runs |
| set+get (strings) | -- | ~2.4M-3.6M ops/s | local range |
| set+get (objects, cloned) | -- | ~489K-606K ops/s | local range |
| del | -- | ~1.7M-2.0M ops/s | local range |

See `CHANGELOG.md` for full details.

## Install

```bash
npm install node-cache --save
```

## Quick start

```js
const NodeCache = require( "node-cache" );
const myCache = new NodeCache();

// set a key with 100 second TTL
myCache.set( "myKey", { name: "foo" }, 100 );

// retrieve it
const value = myCache.get( "myKey" );
// { name: "foo" }
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `stdTTL` | `0` | Default TTL in seconds for every key. `0` = unlimited. |
| `checkperiod` | `600` | Interval in seconds for automatic expired-key cleanup. `0` = no periodic check. |
| `useClones` | `true` | If `true`, returns cloned copies of cached values. If `false`, returns references (faster, but mutations affect the cache). |
| `deleteOnExpire` | `true` | If `true`, expired keys are deleted automatically. If `false`, they remain and you should handle them via the `expired` event. |
| `enableStats` | `true` | If `true`, tracks hit/miss/size statistics. Set to `false` to skip stat updates for reduced overhead. `maxKeys` works regardless. |
| `maxKeys` | `-1` | Maximum number of keys allowed. `-1` = unlimited. Throws `ECACHEFULL` when exceeded. |

```js
const myCache = new NodeCache( { stdTTL: 100, checkperiod: 120 } );
```

Keys can be `string` or `number` (cast to string internally). Other types throw an error.

## API

### set

`myCache.set( key, value, [ ttl ] )`

Sets a key-value pair. Optional TTL in seconds. Returns `true` on success.

```js
myCache.set( "myKey", { my: "Special", variable: 42 }, 10000 );
// true
```

> If the key expires based on its TTL, it is deleted entirely from the internal data object.

### mset

`myCache.mset( [ { key, val, ttl? }, ... ] )`

Sets multiple key-value pairs at once. Returns `true` on success.

```js
myCache.mset([
	{ key: "myKey", val: obj, ttl: 10000 },
	{ key: "myKey2", val: obj2 },
]);
```

### get

`myCache.get( key )`

Returns the cached value, or `undefined` if not found or expired.

```js
const value = myCache.get( "myKey" );
if ( value === undefined ) {
	// handle miss
}
```

### mget

`myCache.mget( [ key1, key2, ... ] )`

Returns an object of found key-value pairs. Missing or expired keys are omitted.

```js
const values = myCache.mget( [ "myKeyA", "myKeyB" ] );
// { "myKeyA": ..., "myKeyB": ... }
```

### take

`myCache.take( key )`

Gets the cached value and deletes the key. Equivalent to `get(key)` + `del(key)`. Useful for single-use values like OTPs.

```js
myCache.set( "otp", "123456" );
const otp = myCache.take( "otp" ); // "123456", key is now deleted
```

### del

`myCache.del( key )` or `myCache.del( [ key1, key2, ... ] )`

Deletes one or more keys. Returns the number of deleted entries.

```js
myCache.del( "A" );       // 1
myCache.del( [ "B", "C" ] ); // 2
```

### ttl

`myCache.ttl( key, [ ttl ] )`

Redefines the TTL of a key. Returns `true` if the key exists, `false` otherwise. If `ttl` is omitted, the default TTL is used. A `ttl < 0` deletes the key.

```js
myCache.ttl( "existentKey", 100 ); // true
myCache.ttl( "missingKey", 100 );  // false
```

### getTtl

`myCache.getTtl( key )`

Returns the expiration timestamp (ms) for a key, `0` if no TTL is set, or `undefined` if the key doesn't exist.

```js
myCache.getTtl( "myKey" );     // 1456000600000
myCache.getTtl( "noTtlKey" );  // 0
myCache.getTtl( "missing" );   // undefined
```

### keys

`myCache.keys()`

Returns an array of all existing keys.

```js
myCache.keys(); // [ "all", "my", "keys" ]
```

### has

`myCache.has( key )`

Returns `true` if the key exists in the cache, `false` otherwise.

```js
myCache.has( "myKey" ); // true or false
```

### getStats

`myCache.getStats()`

Returns cache statistics.

```js
myCache.getStats();
// { keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }
```

### flushAll

`myCache.flushAll()`

Deletes all cached data and resets statistics.

### flushStats

`myCache.flushStats()`

Resets hit/miss/size statistics without deleting data.

### close

`myCache.close()`

Stops the automatic expiry check interval. Call this when you're done with the cache to allow the process to exit cleanly.

## Events

### set

Fired when a key is added or changed.

```js
myCache.on( "set", function( key, value ) {
	// ...
});
```

### del

Fired when a key is removed manually or due to expiry.

```js
myCache.on( "del", function( key, value ) {
	// ...
});
```

### expired

Fired when a key expires.

```js
myCache.on( "expired", function( key, value ) {
	// ...
});
```

### flush

Fired when the cache is flushed.

```js
myCache.on( "flush", function() {
	// ...
});
```

### flush_stats

Fired when the cache stats are flushed.

```js
myCache.on( "flush_stats", function() {
	// ...
});
```

## Performance

Benchmark results and charts are available in `docs/BENCHMARK_CHARTS.md`.

```bash
npm run bench        # full suite (median/p95/range)
npm run bench:heap   # heap vs linear comparison (median/range)
```

Key results (Node v24.12.0 on Windows x64, 7 runs per scenario):

| Benchmark | Median | Range (min-max) |
|---|---|---|
| set+get (strings) | 2.83M ops/s | 2.40M-3.57M |
| set+get (objects, cloned) | 540K ops/s | 489K-606K |
| del | 1.83M ops/s | 1.74M-1.99M |
| useClones=false vs true | 3.55x faster | 2.82M-4.55M vs 945K-1.16M |
| enableStats=false vs true | 0.95x throughput | environment-sensitive, benchmark your workload |
| TTL heap vs linear (100K keys) | 6.22x faster | 3.76x-8.16x (`bench:heap`) |

## Breaking changes

### v6.x

Full TypeScript rewrite. Public API unchanged. Internal functions and names have changed -- if you depend on internal APIs (prefixed with `_`), review `CHANGELOG.md` before upgrading. `enableLegacyCallbacks` removed. Node.js 20+ required.

### v5.x

Callbacks deprecated. Available via `enableLegacyCallbacks` option (now removed in v6.x). Node.js 8+ required.

### v3.x

Values are cloned by default. Disable with `useClones: false`.

### v2.x

`.get()` returns the value directly instead of `{ key: value }`.

## Compatibility

| Node.js | Status |
|---------|--------|
| 20.x LTS | Minimum supported, CI tested |
| 22.x LTS | Supported, CI tested |
| 24.x Current | Supported, CI tested |
| < 20.x | Not supported |

## Release History

| Version | Date | Description |
|:--:|:--:|:--|
| 6.0.0 | 2026-02-28 | TypeScript rewrite, Node.js 20+, `enableStats` option, min-heap TTL, bug fixes. See `CHANGELOG.md`. |
| 5.1.2 | 2020-07-01 | Type definition for `.take()`, Buffer fix. |
| 5.1.0 | 2019-12-08 | Added `.take()` and `.flushStats()`. |
| 5.0.0 | 2019-10-23 | Removed lodash, added `.has()` and `.mset()`. |
| 4.0.0 | 2016-09-20 | Fixed `.ttl( key, 0 )` bug. |
| 3.0.0 | 2015-05-29 | Clone values by default. |
| 2.0.0 | 2015-01-05 | Changed `.get()` return format. |

See `CHANGELOG.md` for the complete history.

## Contributing

Contributions are welcome. See `CONTRIBUTING.md` for the process, `RELEASE_POLICY.md` for versioning, and `MAINTENANCE.md` for project scope.

## Attribution

Originally created by [@mpneuried](https://github.com/mpneuried) and sponsored by [Team Centric Software](https://www.tcs.de/). This fork is maintained by [@alexanderpoliser](https://github.com/alexanderpoliser).

Original repository: [github.com/node-cache/node-cache](https://github.com/node-cache/node-cache)

## License

MIT -- Copyright (c) 2019 Mathias Peter and the node-cache maintainers

See `LICENSE` for the full text.
