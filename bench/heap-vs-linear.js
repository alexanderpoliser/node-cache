"use strict";

const NodeCache = require("../dist/node-cache");

// ---------------------------------------------------------------------------
// Heap-based _checkData (actual implementation) vs simulated linear scan
// ---------------------------------------------------------------------------

function linearCheckData(cache) {
  // Simulates the old O(n) approach: iterate all keys, check each for expiry
  const now = Math.floor(Date.now() / 1000);
  const keysToDelete = [];
  for (const key of Object.keys(cache.data)) {
    const entry = cache.data[key];
    if (entry && entry.t !== 0 && entry.t < now) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    delete cache.data[key];
  }
  return keysToDelete.length;
}

function setupCache(n) {
  const cache = new NodeCache({ checkperiod: 0, enableStats: false });
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < n; i++) {
    cache.set("key" + i, i, 1);
  }

  // Backdate all entries so they are expired
  for (let i = 0; i < n; i++) {
    const d = cache.data["key" + i];
    if (d) {
      d.t = now - 10;
    }
  }

  // Rebuild heap with expired entries
  if (cache._expiryHeap) {
    cache._expiryHeap.clear();
    for (let i = 0; i < n; i++) {
      cache._expiryHeap.push({ key: "key" + i, expireAt: now - 10 });
    }
  }

  return cache;
}

function benchHeap(n) {
  const cache = setupCache(n);
  const start = process.hrtime.bigint();
  cache._checkData();
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
  return elapsed;
}

function benchLinear(n) {
  const cache = setupCache(n);
  const start = process.hrtime.bigint();
  linearCheckData(cache);
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
  return elapsed;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const sizes = [1_000, 10_000, 100_000];
const RUNS = Number(process.env.BENCH_RUNS || 9);

console.log("\nHeap-based vs Linear _checkData comparison");
console.log("=".repeat(68));
console.log(`  Node ${process.version} | ${process.platform} ${process.arch}`);
console.log(`  ${RUNS} runs per size, median reported`);
console.log("=".repeat(68));
console.log();

console.log(
  "  " +
  "N".padStart(8) +
  "Heap (ms)".padStart(14) +
  "Linear (ms)".padStart(14) +
  "Speedup".padStart(12) +
  "Range".padStart(16)
);
console.log("  " + "-".repeat(64));

for (const n of sizes) {
  const heapTimes = [];
  const linearTimes = [];
  const speedups = [];

  for (let r = 0; r < RUNS; r++) {
    const heapMs = benchHeap(n);
    const linearMs = benchLinear(n);
    heapTimes.push(heapMs);
    linearTimes.push(linearMs);
    speedups.push(linearMs / heapMs);
  }

  heapTimes.sort((a, b) => a - b);
  linearTimes.sort((a, b) => a - b);
  speedups.sort((a, b) => a - b);

  const heapMedian = heapTimes[Math.floor(RUNS / 2)];
  const linearMedian = linearTimes[Math.floor(RUNS / 2)];
  const speedup = linearMedian / heapMedian;
  const speedupMin = speedups[0];
  const speedupMax = speedups[speedups.length - 1];

  console.log(
    "  " +
    n.toLocaleString().padStart(8) +
    heapMedian.toFixed(2).padStart(14) +
    linearMedian.toFixed(2).padStart(14) +
    (speedup.toFixed(2) + "x").padStart(12) +
    (" (" + speedupMin.toFixed(2) + "-" + speedupMax.toFixed(2) + "x)").padStart(16)
  );
}

console.log();
console.log("Done.");
