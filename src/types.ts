export type Key = string | number;

export type Callback<T> = (err: any, data: T | undefined) => void;

export interface ValueSetItem<T = any> {
  key: Key;
  val: T;
  ttl?: number;
}

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

export interface Stats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

export interface WrappedValue<T = any> {
  t: number;
  e: boolean;
  v: T;
}

export interface Data {
  [key: string]: WrappedValue;
}

export interface HeapEntry {
  key: string;
  expireAt: number;
}

export interface NodeCacheError extends Error {
  errorcode: string;
  data: Record<string, any>;
}

export interface ErrorTemplates {
  [code: string]: string;
}

export interface ErrorGenerators {
  [code: string]: (args: Record<string, any>) => string;
}
