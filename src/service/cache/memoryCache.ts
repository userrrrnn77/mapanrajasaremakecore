// src/service/cache/memoryCache.ts
import NodeCache from "node-cache";

type CacheValue<T> = {
  value: T;
  createdAt: number;
};

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

const DEFAULT_TTL = 3600;

const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 600,
  useClones: false,
});

export class MemoryCache {
  // 🔑 helper buat namespace
  private static buildKey(key: string, namespace?: string) {
    return namespace ? `${namespace}:${key}` : key;
  }

  static set<T>(key: string, value: T, options?: CacheOptions): void {
    const finalKey = this.buildKey(key, options?.namespace);

    const payload: CacheValue<T> = {
      value,
      createdAt: Date.now(),
    };

    cache.set(finalKey, payload, options?.ttl ?? DEFAULT_TTL);
  }

  static get<T>(key: string, options?: { namespace?: string }): T | null {
    const finalKey = this.buildKey(key, options?.namespace);

    const data = cache.get<CacheValue<T>>(finalKey);

    if (!data) return null;

    return data.value;
  }

  static has(key: string, namespace?: string): boolean {
    const finalKey = this.buildKey(key, namespace);
    return cache.has(finalKey);
  }

  static del(key: string, namespace?: string): void {
    const finalKey = this.buildKey(key, namespace);
    cache.del(finalKey);
  }

  static getMeta(key: string, namespace?: string): { ageMs: number } | null {
    const finalKey = this.buildKey(key, namespace);

    const data = cache.get<CacheValue<any>>(finalKey);

    if (!data) return null;

    return {
      ageMs: Date.now() - data.createdAt,
    };
  }

  static clear(namespace?: string) {
    if (!namespace) {
      cache.flushAll();
      return;
    }

    const keys = cache.keys().filter((k) => k.startsWith(namespace));
    cache.del(keys);
  }
}
