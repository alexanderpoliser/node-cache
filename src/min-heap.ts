import { HeapEntry } from "./types";

/**
 * Minimal binary min-heap for expiration scheduling.
 * Items are ordered by `expireAt` ascending.
 */
export class MinHeap {
  private _heap: HeapEntry[] = [];

  /**
   * Number of entries currently stored.
   */
  size(): number {
    return this._heap.length;
  }

  /**
   * Return top entry without removing it.
   */
  peek(): HeapEntry | null {
    return this._heap[0] || null;
  }

  /**
   * Insert a new expiration entry.
   */
  push(key: string, expireAt: number): void {
    this._heap.push({ key, expireAt });
    this._bubbleUp(this._heap.length - 1);
  }

  /**
   * Remove and return top (smallest expiration) entry.
   */
  pop(): HeapEntry | undefined {
    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0 && last != null) {
      this._heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  /**
   * Remove all entries.
   */
  clear(): void {
    this._heap = [];
  }

  /**
   * Restore heap ordering after insertion.
   */
  private _bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this._heap[idx].expireAt < this._heap[parent].expireAt) {
        const tmp = this._heap[idx];
        this._heap[idx] = this._heap[parent];
        this._heap[parent] = tmp;
        idx = parent;
      } else {
        break;
      }
    }
  }

  /**
   * Restore heap ordering after root replacement/removal.
   */
  private _sinkDown(idx: number): void {
    const len = this._heap.length;
    for (;;) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;
      if (left < len && this._heap[left].expireAt < this._heap[smallest].expireAt) {
        smallest = left;
      }
      if (right < len && this._heap[right].expireAt < this._heap[smallest].expireAt) {
        smallest = right;
      }
      if (smallest !== idx) {
        const tmp = this._heap[idx];
        this._heap[idx] = this._heap[smallest];
        this._heap[smallest] = tmp;
        idx = smallest;
      } else {
        break;
      }
    }
  }
}
