import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Isolated MemoryCache class test matching src/lib/cache/memoryCache.ts
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.inFlightRequests = new Map();
  }

  async getOrFetch(key, fetcher, ttlMs = 300000) {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && now - existing.timestamp < existing.ttlMs) {
      return existing.data;
    }

    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key);
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

  invalidate(keyOrPrefix) {
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

  has(key) {
    const existing = this.cache.get(key);
    if (!existing) return false;
    return Date.now() - existing.timestamp < existing.ttlMs;
  }
}

describe("Unit: In-Memory Client Cache & Request Deduplication", () => {
  it("should return cached data on subsequent calls without re-executing fetcher", async () => {
    const cache = new MemoryCache();
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount++;
      return [{ id: "cat_1", name: "ক্লিনিং" }];
    };

    // First call executes fetcher
    const res1 = await cache.getOrFetch("categories_true", fetcher, 5000);
    assert.equal(fetchCount, 1);
    assert.equal(res1[0].name, "ক্লিনিং");

    // Second call serves from cache
    const res2 = await cache.getOrFetch("categories_true", fetcher, 5000);
    assert.equal(fetchCount, 1); // Not incremented!
    assert.deepEqual(res1, res2);
  });

  it("should deduplicate concurrent in-flight requests into a single network call", async () => {
    const cache = new MemoryCache();
    let networkCallCount = 0;

    const slowFetcher = async () => {
      networkCallCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { loaded: true };
    };

    // 5 concurrent requests fired simultaneously
    const results = await Promise.all([
      cache.getOrFetch("concurrent_key", slowFetcher),
      cache.getOrFetch("concurrent_key", slowFetcher),
      cache.getOrFetch("concurrent_key", slowFetcher),
      cache.getOrFetch("concurrent_key", slowFetcher),
      cache.getOrFetch("concurrent_key", slowFetcher),
    ]);

    // All 5 should resolve with same result, but fetcher called only once!
    assert.equal(networkCallCount, 1);
    assert.equal(results.length, 5);
    assert.equal(results[0].loaded, true);
  });

  it("should invalidate cache entries by prefix", async () => {
    const cache = new MemoryCache();

    await cache.getOrFetch("services_cleaning_true", async () => ["srv_1"]);
    await cache.getOrFetch("services_plumbing_true", async () => ["srv_2"]);
    await cache.getOrFetch("categories_true", async () => ["cat_1"]);

    assert.equal(cache.has("services_cleaning_true"), true);
    assert.equal(cache.has("services_plumbing_true"), true);
    assert.equal(cache.has("categories_true"), true);

    // Invalidate all services_* keys
    cache.invalidate("services_");

    assert.equal(cache.has("services_cleaning_true"), false);
    assert.equal(cache.has("services_plumbing_true"), false);
    assert.equal(cache.has("categories_true"), true); // Untouched!
  });

  it("should clear entire cache when invalidate called without argument", async () => {
    const cache = new MemoryCache();
    await cache.getOrFetch("key1", async () => 1);
    await cache.getOrFetch("key2", async () => 2);

    cache.invalidate();

    assert.equal(cache.has("key1"), false);
    assert.equal(cache.has("key2"), false);
  });
});
