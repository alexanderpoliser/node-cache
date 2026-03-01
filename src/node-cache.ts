import { EventEmitter } from "events";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const clone = require("clone");
import {
  Key,
  Options,
  ResolvedOptions,
  Stats,
  WrappedValue,
  Data,
  ValueSetItem,
  ErrorGenerators,
  NodeCacheError,
} from "./types";
import { MinHeap } from "./min-heap";
import { ERROR_TEMPLATES, compileErrorTemplates, createError } from "./errors";

const DEFAULT_OPTIONS: ResolvedOptions = {
  forceString: false,
  objectValueSize: 80,
  promiseValueSize: 80,
  arrayValueSize: 40,
  stdTTL: 0,
  checkperiod: 600,
  useClones: true,
  deleteOnExpire: true,
  enableLegacyCallbacks: false,
  enableStats: true,
  maxKeys: -1,
};

class NodeCache extends EventEmitter {
  data: Data;
  options: ResolvedOptions;
  stats: Stats;

  private _keyCount: number;
  private _expiryHeap: MinHeap;
  private validKeyTypes: string[];
  private ERRORS!: ErrorGenerators;
  private checkTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(options: Options = {}) {
    super();

    this._initErrors();

    this.data = {};
    this._expiryHeap = new MinHeap();

    this.options = Object.assign({}, DEFAULT_OPTIONS, options) as ResolvedOptions;

    // legacy callback wrapping
    if (this.options.enableLegacyCallbacks) {
      console.warn("WARNING! node-cache legacy callback support will drop in v6.x");
      const methods = ["get", "mget", "set", "del", "ttl", "getTtl", "keys", "has"] as const;
      for (const methodKey of methods) {
        const oldMethod = (this as any)[methodKey] as (...args: any[]) => any;
        (this as any)[methodKey] = (...args: any[]) => {
          const cb = args[args.length - 1];
          if (typeof cb === "function") {
            const realArgs = args.slice(0, -1);
            try {
              const res = oldMethod.apply(this, realArgs);
              cb(null, res);
            } catch (err) {
              cb(err);
            }
          } else {
            return oldMethod.apply(this, args);
          }
        };
      }
    }

    this.stats = { hits: 0, misses: 0, keys: 0, ksize: 0, vsize: 0 };
    this._keyCount = 0;
    this.validKeyTypes = ["string", "number"];

    this._checkData();
  }

  // ─── PUBLIC API (implemented) ───────────────────────────────────

  keys(): string[] {
    return Object.keys(this.data);
  }

  getStats(): Stats {
    return this.stats;
  }

  flushAll(_startPeriod: boolean = true): void {
    this.data = {};
    this._expiryHeap.clear();
    this._keyCount = 0;
    this.stats = { hits: 0, misses: 0, keys: 0, ksize: 0, vsize: 0 };
    this._killCheckPeriod();
    this._checkData(_startPeriod);
    this.emit("flush");
  }

  flushStats(): void {
    this.stats = { hits: 0, misses: 0, keys: 0, ksize: 0, vsize: 0 };
    this.emit("flush_stats");
  }

  close(): void {
    this._killCheckPeriod();
  }

  // ─── PUBLIC API ─────────────────────────────────────────────────

  get<T>(key: Key): T | undefined {
    const err = this._isInvalidKey(key);
    if (err != null) throw err;

    const data = this.data[key];
    if (data != null && this._check(key, data)) {
      if (this.data[key] == null) {
        if (this.options.enableStats) this.stats.misses++;
        return undefined;
      }
      if (this.options.enableStats) this.stats.hits++;
      return this._unwrap(data) as T;
    } else {
      if (this.options.enableStats) this.stats.misses++;
      return undefined;
    }
  }

  mget<T>(keys: Key[]): { [key: string]: T } {
    if (!Array.isArray(keys)) {
      throw this._error("EKEYSTYPE");
    }

    const oRet: { [key: string]: T } = {};
    for (const key of keys) {
      const err = this._isInvalidKey(key);
      if (err != null) throw err;

      const data = this.data[key];
      if (data != null && this._check(key, data)) {
        if (this.data[key] == null) {
          if (this.options.enableStats) this.stats.misses++;
          continue;
        }
        if (this.options.enableStats) this.stats.hits++;
        oRet[key] = this._unwrap(data) as T;
      } else {
        if (this.options.enableStats) this.stats.misses++;
      }
    }
    return oRet;
  }

  set<T>(key: Key, value: T, ttl?: number | string): boolean {
    // check if cache is overflowing — only for genuinely new keys
    if (this.options.maxKeys > -1 && this._keyCount >= this.options.maxKeys && this.data[key] == null) {
      throw this._error("ECACHEFULL");
    }

    // force the data to string
    if (this.options.forceString && typeof value !== "string") {
      value = JSON.stringify(value) as any;
    }

    // set default ttl if not passed
    if (ttl == null) {
      ttl = this.options.stdTTL;
    }

    // handle invalid key types
    const err = this._isInvalidKey(key);
    if (err != null) throw err;

    let existent = false;

    // remove existing data from stats
    if (this.data[key]) {
      existent = true;
      if (this.options.enableStats) {
        this.stats.vsize -= this._getValLength(this._unwrap(this.data[key], false));
      }
    }

    // set the value
    this.data[key] = this._wrap(value, ttl as number);
    // push to expiry heap if key has a finite TTL
    if (this.data[key].t > 0) {
      this._expiryHeap.push(key.toString(), this.data[key].t);
    }
    if (this.options.enableStats) {
      this.stats.vsize += this._getValLength(value);
    }

    // only add the keys and key-size if the key is new
    if (!existent) {
      this._keyCount++;
      if (this.options.enableStats) {
        this.stats.ksize += this._getKeyLength(key);
        this.stats.keys++;
      }
    }

    this.emit("set", key, value);
    return true;
  }

  fetch<T>(key: Key, ttlOrValue?: number | string | (() => T) | T, value?: (() => T) | T): T {
    if (this.has(key)) {
      return this.get(key) as T;
    }
    if (typeof value === "undefined") {
      value = ttlOrValue as (() => T) | T;
      ttlOrValue = undefined;
    }
    const _ret = typeof value === "function" ? (value as () => T)() : value as T;
    this.set(key, _ret, ttlOrValue as number | string | undefined);
    return _ret;
  }

  mset<T>(keyValueSet: ValueSetItem<T>[]): boolean {
    if (!Array.isArray(keyValueSet)) {
      throw this._error("EKEYSTYPE");
    }

    // pre-validate keys and TTLs, count new keys
    const newKeysToAdd: { [key: string]: boolean } = {};

    for (const keyValuePair of keyValueSet) {
      const { key, ttl } = keyValuePair;

      if (ttl && typeof ttl !== "number") {
        throw this._error("ETTLTYPE");
      }

      const err = this._isInvalidKey(key);
      if (err != null) throw err;

      const keyStr = key.toString();
      if (this.data[keyStr] == null && newKeysToAdd[keyStr] == null) {
        newKeysToAdd[keyStr] = true;
      }
    }

    // check if cache is overflowing
    if (this.options.maxKeys > -1 && this._keyCount + Object.keys(newKeysToAdd).length > this.options.maxKeys) {
      throw this._error("ECACHEFULL");
    }

    for (const keyValuePair of keyValueSet) {
      const { key, val, ttl } = keyValuePair;
      this.set(key, val, ttl);
    }
    return true;
  }

  del(keys: Key | Key[]): number {
    if (!Array.isArray(keys)) {
      keys = [keys];
    }

    let delCount = 0;
    for (const key of keys) {
      const err = this._isInvalidKey(key);
      if (err != null) throw err;

      if (this.data[key] != null) {
        if (this.options.enableStats) {
          this.stats.vsize -= this._getValLength(this._unwrap(this.data[key], false));
          this.stats.ksize -= this._getKeyLength(key);
          this.stats.keys--;
        }
        this._keyCount--;
        delCount++;
        const oldVal = this.data[key];
        delete this.data[key];
        this.emit("del", key, oldVal.v);
      }
    }
    return delCount;
  }

  take<T>(key: Key): T | undefined {
    const _ret = this.get<T>(key);
    if (_ret != null) {
      this.del(key);
    }
    return _ret;
  }

  ttl(key: Key, ttl?: number): boolean {
    ttl = ttl || this.options.stdTTL;
    if (!key) {
      return false;
    }

    const err = this._isInvalidKey(key);
    if (err != null) throw err;

    if (this.data[key] != null && this._check(key, this.data[key])) {
      if (ttl >= 0) {
        this.data[key] = this._wrap(this.data[key].v, ttl, false);
        if (this.data[key].t > 0) {
          this._expiryHeap.push(key.toString(), this.data[key].t);
        }
      } else {
        this.del(key);
      }
      return true;
    } else {
      return false;
    }
  }

  getTtl(key: Key): number | undefined {
    if (!key) {
      return undefined;
    }

    const err = this._isInvalidKey(key);
    if (err != null) throw err;

    const data = this.data[key];
    if (data != null && this._check(key, data)) {
      if (this.data[key] == null) {
        return undefined;
      }
      return data.t;
    } else {
      return undefined;
    }
  }

  has(key: Key): boolean {
    const data = this.data[key];
    const _exists = data != null && this._check(key, data);
    if (_exists && this.data[key] == null) {
      return false;
    }
    return _exists;
  }

  // ─── INTERNAL HELPERS (implemented) ─────────────────────────────

  _checkData = (startPeriod: boolean = true): void => {
    const now = Date.now();
    let top = this._expiryHeap.peek();
    while (top != null) {
      if (top.expireAt > now) break;
      this._expiryHeap.pop();
      const data = this.data[top.key];
      if (data != null && data.t === top.expireAt) {
        this._check(top.key, data);
      }
      top = this._expiryHeap.peek();
    }

    if (startPeriod && this.options.checkperiod > 0) {
      this.checkTimeout = setTimeout(this._checkData, this.options.checkperiod * 1000, startPeriod);
      if (this.checkTimeout && typeof this.checkTimeout.unref === "function") {
        this.checkTimeout.unref();
      }
    }
  };

  private _killCheckPeriod(): void {
    if (this.checkTimeout != null) {
      clearTimeout(this.checkTimeout);
    }
  }

  _check(key: Key, data: WrappedValue): boolean {
    let retval = true;
    if (data.t !== 0 && data.t < Date.now()) {
      if (this.options.deleteOnExpire) {
        retval = false;
        this.del(key);
        this.emit("expired", key, this._unwrap(data));
      } else if (!data.e) {
        data.e = true;
        this.emit("expired", key, this._unwrap(data));
      }
    }
    return retval;
  }

  _isInvalidKey(key: Key): NodeCacheError | undefined {
    if (!this.validKeyTypes.includes(typeof key)) {
      return this._error("EKEYTYPE", { type: typeof key });
    }
    return undefined;
  }

  _wrap(value: any, ttl: number | undefined, asClone: boolean = true): WrappedValue {
    if (!this.options.useClones) {
      asClone = false;
    }
    const now = Date.now();
    let livetime = 0;
    const ttlMultiplicator = 1000;

    if (ttl === 0) {
      livetime = 0;
    } else if (ttl) {
      livetime = now + ttl * ttlMultiplicator;
    } else {
      if (this.options.stdTTL === 0) {
        livetime = this.options.stdTTL;
      } else {
        livetime = now + this.options.stdTTL * ttlMultiplicator;
      }
    }

    return {
      t: livetime,
      e: false,
      v: asClone ? clone(value) : value,
    };
  }

  _unwrap(value: any, asClone: boolean = true): any {
    if (value == null || typeof value !== "object") {
      return undefined;
    }
    if (!this.options.useClones) {
      asClone = false;
    }
    if (!Object.prototype.hasOwnProperty.call(value, "v")) {
      return undefined;
    }
    if (typeof value.v === "undefined") {
      return undefined;
    }
    if (asClone) {
      return clone(value.v);
    }
    return value.v;
  }

  _getKeyLength(key: Key): number {
    return key.toString().length;
  }

  _getValLength(value: any): number {
    if (typeof value === "string") {
      return value.length;
    } else if (this.options.forceString) {
      return JSON.stringify(value).length;
    } else if (Array.isArray(value)) {
      return this.options.arrayValueSize * value.length;
    } else if (typeof value === "number") {
      return 8;
    } else if (typeof value?.then === "function") {
      return this.options.promiseValueSize;
    } else if (Buffer?.isBuffer(value)) {
      return value.length;
    } else if (value != null && typeof value === "object") {
      return this.options.objectValueSize * Object.keys(value).length;
    } else if (typeof value === "boolean") {
      return 8;
    } else {
      return 0;
    }
  }

  _error(type: string, data: Record<string, any> = {}): NodeCacheError {
    return createError(type, this.ERRORS, data);
  }

  private _initErrors(): void {
    this.ERRORS = compileErrorTemplates(ERROR_TEMPLATES);
  }
}

export = NodeCache;
