import { HeapEntry } from "./types";

export class MinHeap {
  private _heap: HeapEntry[] = [];

  size(): number {
    return this._heap.length;
  }

  peek(): HeapEntry | null {
    return this._heap[0] || null;
  }

  push(key: string, expireAt: number): void {
    this._heap.push({ key, expireAt });
    this._bubbleUp(this._heap.length - 1);
  }

  pop(): HeapEntry | undefined {
    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0 && last != null) {
      this._heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  clear(): void {
    this._heap = [];
  }

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
