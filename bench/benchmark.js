"use strict";

const NodeCache = require("../dist/node-cache");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatOps(ops) {
  if (ops >= 1e6) return (ops / 1e6).toFixed(2) + "M";
  if (ops >= 1e3) return (ops / 1e3).toFixed(1) + "K";
  return ops.toFixed(0);
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function formatRange(min, max, formatter) {
  return `${formatter(min)}-${formatter(max)}`;
}

function toMB(bytes) {
  return bytes / 1024 / 1024;
}

function bench(label, fn, runs) {
  fn(); // warmup

  const samples = [];
  for (let i = 0; i < runs; i++) {
    global.gc && global.gc();
    const memBefore = process.memoryUsage().rss;
    const start = process.hrtime.bigint();
    const ops = fn();
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    const memAfter = process.memoryUsage().rss;
    const memDelta = toMB(memAfter - memBefore);
    const opsPerSec = ops / (elapsed / 1000);
    samples.push({ opsPerSec, elapsed, memDelta });
  }

  const opsValues = samples.map((s) => s.opsPerSec);
  const elapsedValues = samples.map((s) => s.elapsed);
  const memValues = samples.map((s) => s.memDelta);

  const result = {
    label,
    runs,
    opsMedian: median(opsValues),
    opsMin: Math.min(...opsValues),
    opsMax: Math.max(...opsValues),
    elapsedMedian: median(elapsedValues),
    elapsedP95: percentile(elapsedValues, 95),
    memMedian: median(memValues),
    memMin: Math.min(...memValues),
    memMax: Math.max(...memValues),
  };

  console.log(
    `  ${label.padEnd(40)} ${formatOps(result.opsMedian).padStart(10)} ops/s  ` +
    `p95 ${result.elapsedP95.toFixed(1).padStart(7)} ms  ` +
    `range ${formatRange(result.opsMin, result.opsMax, formatOps).padStart(17)}  ` +
    `mem ${formatRange(result.memMin, result.memMax, (v) => `${v.toFixed(1)}MB`).padStart(18)}`
  );

  return result;
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

const N = 100_000;
const BATCH_SIZE = 1000;
const BATCH_ROUNDS = 100;
const RUNS = Number(process.env.BENCH_RUNS || 7);

function benchSetGetString() {
  return bench("set + get (string values)", () => {
    const cache = new NodeCache();
    for (let i = 0; i < N; i++) cache.set("key" + i, "value" + i);
    for (let i = 0; i < N; i++) cache.get("key" + i);
    return N * 2;
  }, RUNS);
}

function benchSetGetObject() {
  return bench("set + get (object values, clone)", () => {
    const cache = new NodeCache();
    for (let i = 0; i < N; i++) cache.set("key" + i, { id: i, name: "item" + i, tags: [i] });
    for (let i = 0; i < N; i++) cache.get("key" + i);
    return N * 2;
  }, RUNS);
}

function benchSetGetLargeObject() {
  const large = { data: Array.from({ length: 100 }, (_, i) => ({ idx: i, val: "x".repeat(50) })) };
  return bench("set + get (large object, clone)", () => {
    const cache = new NodeCache();
    const count = 10_000;
    for (let i = 0; i < count; i++) cache.set("key" + i, large);
    for (let i = 0; i < count; i++) cache.get("key" + i);
    return count * 2;
  }, RUNS);
}

function benchMsetMget() {
  return bench("mset + mget (batch " + BATCH_SIZE + ")", () => {
    const cache = new NodeCache();
    for (let r = 0; r < BATCH_ROUNDS; r++) {
      const items = [];
      const keys = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        const key = "b" + r + "_" + i;
        items.push({ key, val: "v" + i });
        keys.push(key);
      }
      cache.mset(items);
      cache.mget(keys);
    }
    return BATCH_ROUNDS * BATCH_SIZE * 2;
  }, RUNS);
}

function benchDel() {
  return bench("del (single key)", () => {
    const cache = new NodeCache();
    for (let i = 0; i < N; i++) cache.set("key" + i, i);
    for (let i = 0; i < N; i++) cache.del("key" + i);
    return N;
  }, RUNS);
}

function benchTtlExpiry() {
  const count = 50_000;
  return bench("TTL expiry (_checkData drain, " + count + " keys)", () => {
    const cache = new NodeCache({ checkperiod: 0 });
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < count; i++) {
      cache.set("ttl" + i, i, 1);
    }
    for (let i = 0; i < count; i++) {
      const d = cache.data["ttl" + i];
      if (d) {
        d.t = now - 10;
      }
    }
    cache._expiryHeap && cache._expiryHeap.clear && cache._expiryHeap.clear();
    if (cache._expiryHeap) {
      for (let i = 0; i < count; i++) {
        cache._expiryHeap.push({ key: "ttl" + i, expireAt: now - 10 });
      }
    }
    cache._checkData();
    return count;
  }, RUNS);
}

function benchClonesOn() {
  return bench("useClones=true  (object set+get)", () => {
    const cache = new NodeCache({ useClones: true });
    for (let i = 0; i < N; i++) cache.set("key" + i, { id: i });
    for (let i = 0; i < N; i++) cache.get("key" + i);
    return N * 2;
  }, RUNS);
}

function benchClonesOff() {
  return bench("useClones=false (object set+get)", () => {
    const cache = new NodeCache({ useClones: false });
    for (let i = 0; i < N; i++) cache.set("key" + i, { id: i });
    for (let i = 0; i < N; i++) cache.get("key" + i);
    return N * 2;
  }, RUNS);
}

function benchStatsOn() {
  return bench("enableStats=true  (set+get)", () => {
    const cache = new NodeCache({ enableStats: true });
    for (let i = 0; i < N; i++) cache.set("key" + i, i);
    for (let i = 0; i < N; i++) cache.get("key" + i);
    return N * 2;
  }, RUNS);
}

function benchStatsOff() {
  return bench("enableStats=false (set+get)", () => {
    const cache = new NodeCache({ enableStats: false });
    for (let i = 0; i < N; i++) cache.set("key" + i, i);
    for (let i = 0; i < N; i++) cache.get("key" + i);
    return N * 2;
  }, RUNS);
}

function benchMaxKeys() {
  return bench("maxKeys=" + N + " (set at capacity)", () => {
    const cache = new NodeCache({ maxKeys: N });
    for (let i = 0; i < N; i++) cache.set("key" + i, i);
    return N;
  }, RUNS);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("\nnode-cache benchmark suite");
console.log("=".repeat(78));
console.log(`  Node ${process.version} | ${process.platform} ${process.arch}`);
console.log(`  N = ${N.toLocaleString()} | batch = ${BATCH_SIZE} x ${BATCH_ROUNDS} rounds`);
console.log(`  ${RUNS} measured runs per scenario (warmup excluded)`);
console.log("=".repeat(78));
console.log();

const results = [];
console.log("--- Core operations ---");
results.push(benchSetGetString());
results.push(benchSetGetObject());
results.push(benchSetGetLargeObject());
results.push(benchMsetMget());
results.push(benchDel());
console.log();

console.log("--- TTL ---");
results.push(benchTtlExpiry());
console.log();

console.log("--- useClones comparison ---");
results.push(benchClonesOn());
results.push(benchClonesOff());
console.log();

console.log("--- enableStats comparison ---");
results.push(benchStatsOn());
results.push(benchStatsOff());
console.log();

console.log("--- maxKeys ---");
results.push(benchMaxKeys());
console.log();

const cloneOn = results.find((r) => r.label.startsWith("useClones=true"));
const cloneOff = results.find((r) => r.label.startsWith("useClones=false"));
const statsOn = results.find((r) => r.label.startsWith("enableStats=true"));
const statsOff = results.find((r) => r.label.startsWith("enableStats=false"));
const ttl = results.find((r) => r.label.startsWith("TTL expiry"));

console.log("--- Summary (median-based) ---");
if (cloneOn && cloneOff) {
  console.log(`  useClones=false vs true: ${(cloneOff.opsMedian / cloneOn.opsMedian).toFixed(2)}x faster`);
}
if (statsOn && statsOff) {
  console.log(`  enableStats=false vs true: ${(statsOff.opsMedian / statsOn.opsMedian).toFixed(2)}x throughput`);
}
if (ttl) {
  console.log(`  TTL drain median: ${formatOps(ttl.opsMedian)} ops/s, p95 ${ttl.elapsedP95.toFixed(1)} ms`);
}
console.log();

console.log("Done.");
