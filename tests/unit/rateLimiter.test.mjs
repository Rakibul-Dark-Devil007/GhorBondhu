import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * In-memory simulation of the Sliding-Window Rate Limiter
 * Matching the exact algorithm in functions/src/utils/rateLimiter.ts
 */
class MockSlidingWindowRateLimiter {
  constructor() {
    this.storage = new Map();
  }

  assertRateLimit({ key, maxAttempts, windowSeconds, now = Date.now() }) {
    const windowStart = now - windowSeconds * 1000;
    let timestamps = this.storage.get(key) || [];

    // Filter out expired timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= maxAttempts) {
      const oldestAttempt = timestamps[0] || now;
      const waitTimeSec = Math.ceil((oldestAttempt + windowSeconds * 1000 - now) / 1000);
      const error = new Error(`Resource exhausted. Retry in ${waitTimeSec} seconds.`);
      error.code = "resource-exhausted";
      error.waitTimeSec = waitTimeSec;
      throw error;
    }

    timestamps.push(now);
    this.storage.set(key, timestamps);
    return { success: true, remaining: maxAttempts - timestamps.length };
  }
}

describe("Unit: Sliding-Window Rate Limiter Algorithm", () => {
  it("should allow initial request and report correct remaining quota", () => {
    const limiter = new MockSlidingWindowRateLimiter();
    const result = limiter.assertRateLimit({
      key: "user_123",
      maxAttempts: 5,
      windowSeconds: 60,
    });

    assert.equal(result.success, true);
    assert.equal(result.remaining, 4);
  });

  it("should allow requests up to the maxAttempts threshold", () => {
    const limiter = new MockSlidingWindowRateLimiter();
    const key = "user_burst";

    for (let i = 1; i <= 5; i++) {
      const res = limiter.assertRateLimit({
        key,
        maxAttempts: 5,
        windowSeconds: 60,
      });
      assert.equal(res.success, true);
      assert.equal(res.remaining, 5 - i);
    }
  });

  it("should reject the (maxAttempts + 1)th request with resource-exhausted", () => {
    const limiter = new MockSlidingWindowRateLimiter();
    const key = "user_blocked";

    // Exhaust 5 tokens
    for (let i = 0; i < 5; i++) {
      limiter.assertRateLimit({ key, maxAttempts: 5, windowSeconds: 60 });
    }

    // 6th attempt should throw
    assert.throws(
      () => {
        limiter.assertRateLimit({ key, maxAttempts: 5, windowSeconds: 60 });
      },
      (err) => {
        assert.equal(err.code, "resource-exhausted");
        return true;
      }
    );
  });

  it("should allow new requests once the sliding window has elapsed", () => {
    const limiter = new MockSlidingWindowRateLimiter();
    const key = "user_expired";
    const startTime = 1000000;

    // Send 3 requests at startTime
    for (let i = 0; i < 3; i++) {
      limiter.assertRateLimit({
        key,
        maxAttempts: 3,
        windowSeconds: 60,
        now: startTime,
      });
    }

    // Immediate 4th attempt fails
    assert.throws(() => {
      limiter.assertRateLimit({
        key,
        maxAttempts: 3,
        windowSeconds: 60,
        now: startTime + 1000,
      });
    });

    // 4th attempt after 61 seconds succeeds because older timestamps expired
    const resultAfterWindow = limiter.assertRateLimit({
      key,
      maxAttempts: 3,
      windowSeconds: 60,
      now: startTime + 61000, // 61 seconds later
    });

    assert.equal(resultAfterWindow.success, true);
  });

  it("should isolate quotas between different user keys", () => {
    const limiter = new MockSlidingWindowRateLimiter();

    // User A exhausts quota
    for (let i = 0; i < 3; i++) {
      limiter.assertRateLimit({ key: "user_A", maxAttempts: 3, windowSeconds: 60 });
    }

    // User B should still be allowed
    const resultUserB = limiter.assertRateLimit({
      key: "user_B",
      maxAttempts: 3,
      windowSeconds: 60,
    });

    assert.equal(resultUserB.success, true);
    assert.equal(resultUserB.remaining, 2);
  });
});
