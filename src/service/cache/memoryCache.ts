// src/service/cache/memoryCache.ts
import NodeCache from "node-cache";

type CacheValue<T> = {
  value: T;
  createdAt: number;
};

export interface CacheOptions {
  ttl?: number; // seconds
  namespace?: string;
}

const DEFAULT_TTL = 3600;

const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 600,
  useClones: false, // ⚠️ penting biar gak berat
});

export class MemoryCache {
  // 🔑 helper buat namespace
  private static buildKey(key: string, namespace?: string) {
    return namespace ? `${namespace}:${key}` : key;
  }

  // 🔥 SET (support TTL + namespace)
  static set<T>(key: string, value: T, options?: CacheOptions): void {
    const finalKey = this.buildKey(key, options?.namespace);

    const payload: CacheValue<T> = {
      value,
      createdAt: Date.now(),
    };

    cache.set(finalKey, payload, options?.ttl ?? DEFAULT_TTL);
  }

  // 🔥 GET (type-safe + unwrap)
  static get<T>(key: string, options?: { namespace?: string }): T | null {
    const finalKey = this.buildKey(key, options?.namespace);

    const data = cache.get<CacheValue<T>>(finalKey);

    if (!data) return null;

    return data.value;
  }

  // 🔥 HAS
  static has(key: string, namespace?: string): boolean {
    const finalKey = this.buildKey(key, namespace);
    return cache.has(finalKey);
  }

  // 🔥 DELETE
  static del(key: string, namespace?: string): void {
    const finalKey = this.buildKey(key, namespace);
    cache.del(finalKey);
  }

  // 🔥 GET META (buat debugging)
  static getMeta(key: string, namespace?: string): { ageMs: number } | null {
    const finalKey = this.buildKey(key, namespace);

    const data = cache.get<CacheValue<any>>(finalKey);

    if (!data) return null;

    return {
      ageMs: Date.now() - data.createdAt,
    };
  }

  // 🔥 FLUSH (dangerous)
  static clear(namespace?: string) {
    if (!namespace) {
      cache.flushAll();
      return;
    }

    const keys = cache.keys().filter((k) => k.startsWith(namespace));
    cache.del(keys);
  }
}
