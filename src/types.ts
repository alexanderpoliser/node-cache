/**
 * Supported key types accepted by public API methods.
 */
export type Key = string | number;

/**
 * Legacy callback signature (`enableLegacyCallbacks` mode).
 */
export type Callback<T> = (err: any, data: T | undefined) => void;

/**
 * Input shape for `mset`.
 */
export interface ValueSetItem<T = any> {
  key: Key;
  val: T;
  ttl?: number;
}

/**
 * User-facing constructor options.
 */
export interface Options {
  forceString?: boolean;
  objectValueSize?: number;
  promiseValueSize?: number;
  arrayValueSize?: number;
  stdTTL?: number;
  checkperiod?: number;
  useClones?: boolean;
  deleteOnExpire?: boolean;
  enableLegacyCallbacks?: boolean;
  enableStats?: boolean;
  maxKeys?: number;
}

/**
 * Fully resolved options after default merge.
 */
export interface ResolvedOptions {
  forceString: boolean;
  objectValueSize: number;
  promiseValueSize: number;
  arrayValueSize: number;
  stdTTL: number;
  checkperiod: number;
  useClones: boolean;
  deleteOnExpire: boolean;
  enableLegacyCallbacks: boolean;
  enableStats: boolean;
  maxKeys: number;
}

/**
 * Runtime cache statistics.
 */
export interface Stats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

/**
 * Internal stored value container.
 * `t` is expiration timestamp in ms (`0` means no expiration).
 * `e` marks whether `expired` event has already been emitted when
 * `deleteOnExpire=false`.
 */
export interface WrappedValue<T = any> {
  t: number;
  e: boolean;
  v: T;
}

/**
 * Internal key-value store.
 */
export interface Data {
  [key: string]: WrappedValue;
}

/**
 * Expiration queue entry used by min-heap.
 */
export interface HeapEntry {
  key: string;
  expireAt: number;
}

/**
 * Extended error shape returned by cache internals.
 */
export interface NodeCacheError extends Error {
  errorcode: string;
  data: Record<string, any>;
}

/**
 * Error templates mapped by code.
 */
export interface ErrorTemplates {
  [code: string]: string;
}

/**
 * Compiled message generator functions mapped by code.
 */
export interface ErrorGenerators {
  [code: string]: (args: Record<string, any>) => string;
}
