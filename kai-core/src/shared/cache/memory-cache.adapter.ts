import { Injectable } from '@nestjs/common';
import { CachePort } from './cache.port';

type CacheEntry = { value: string; expiresAt: number | null };

/**
 * In-process cache for Kai Core Lite (no Redis sidecar).
 */
@Injectable()
export class MemoryCacheAdapter implements CachePort {
  private readonly store = new Map<string, CacheEntry>();

  private purgeExpired(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;
    if (entry.expiresAt != null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
    }
  }

  private read<T>(key: string): T | null {
    this.purgeExpired(key);
    const entry = this.store.get(key);
    if (!entry) return null;
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return this.read<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt =
      ttl != null && ttl > 0 ? Date.now() + ttl * 1000 : null;
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    this.purgeExpired(key);
    return this.store.has(key);
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next);
    return next;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const entry = this.store.get(key);
    if (!entry) return;
    entry.expiresAt = Date.now() + ttl * 1000;
    this.store.set(key, entry);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    for (const pair of keyValuePairs) {
      await this.set(pair.key, pair.value, pair.ttl);
    }
  }

  async mdel(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.store.delete(key);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
    );
    const out: string[] = [];
    for (const key of this.store.keys()) {
      this.purgeExpired(key);
      if (this.store.has(key) && regex.test(key)) {
        out.push(key);
      }
    }
    return out;
  }

  async flush(): Promise<void> {
    this.store.clear();
  }
}
