/**
 * GhorBondhu (ঘরবন্ধু) - In-Memory Stale-While-Revalidate Client Cache
 * Drastically reduces Firestore read costs, eliminates redundant network fetches,
 * and collapses concurrent in-flight requests into a single promise.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Retrieves an item from cache if fresh, otherwise executes the fetcher
   * and stores the result. Deduplicates concurrent requests for the same key.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000 // default 5 minutes
  ): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    // Return fresh cache immediately
    if (existing && now - existing.timestamp < existing.ttlMs) {
      return existing.data as T;
    }

    // Deduplicate concurrent in-flight requests
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const requestPromise = (async () => {
      try {
        const freshData = await fetcher();
        this.cache.set(key, {
          data: freshData,
          timestamp: Date.now(),
          ttlMs,
        });
        return freshData;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Manually invalidates a specific cache key or all keys matching a prefix.
   */
  invalidate(keyOrPrefix?: string): void {
    if (!keyOrPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Direct inspection of cache freshness
   */
  has(key: string): boolean {
    const existing = this.cache.get(key);
    if (!existing) return false;
    return Date.now() - existing.timestamp < existing.ttlMs;
  }
}

export const memoryCache = new MemoryCache();
