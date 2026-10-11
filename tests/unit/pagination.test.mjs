import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure simulation of cursor-based pagination logic from src/lib/firebase/pagination.ts
 */
function simulateCursorPagination(mockDataset, pageSize, cursorId = null) {
  let startIndex = 0;
  if (cursorId) {
    const foundIndex = mockDataset.findIndex((item) => item.id === cursorId);
    startIndex = foundIndex >= 0 ? foundIndex + 1 : 0;
  }

  // Fetch pageSize + 1 to determine hasMore
  const fetchedDocs = mockDataset.slice(startIndex, startIndex + pageSize + 1);
  const hasMore = fetchedDocs.length > pageSize;
  const pageItems = hasMore ? fetchedDocs.slice(0, pageSize) : fetchedDocs;
  const lastDocCursor = pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

  return {
    items: pageItems,
    lastDocCursor,
    hasMore,
    totalFetched: pageItems.length,
  };
}

describe("Unit: Cursor-Based Pagination Logic", () => {
  const mockBookings = Array.from({ length: 25 }, (_, i) => ({
    id: `bk_${i + 1}`,
    bookingNumber: `GB-${10000 + i}`,
  }));

  it("should return the first page with hasMore = true", () => {
    const page1 = simulateCursorPagination(mockBookings, 10, null);

    assert.equal(page1.items.length, 10);
    assert.equal(page1.items[0].id, "bk_1");
    assert.equal(page1.items[9].id, "bk_10");
    assert.equal(page1.lastDocCursor, "bk_10");
    assert.equal(page1.hasMore, true);
  });

  it("should fetch the second page correctly using the cursor", () => {
    const page2 = simulateCursorPagination(mockBookings, 10, "bk_10");

    assert.equal(page2.items.length, 10);
    assert.equal(page2.items[0].id, "bk_11");
    assert.equal(page2.items[9].id, "bk_20");
    assert.equal(page2.lastDocCursor, "bk_20");
    assert.equal(page2.hasMore, true);
  });

  it("should fetch the final partial page and report hasMore = false", () => {
    const page3 = simulateCursorPagination(mockBookings, 10, "bk_20");

    assert.equal(page3.items.length, 5); // remaining 5 items
    assert.equal(page3.items[0].id, "bk_21");
    assert.equal(page3.items[4].id, "bk_25");
    assert.equal(page3.lastDocCursor, "bk_25");
    assert.equal(page3.hasMore, false); // No more items!
  });

  it("should handle empty datasets gracefully", () => {
    const emptyResult = simulateCursorPagination([], 10, null);

    assert.equal(emptyResult.items.length, 0);
    assert.equal(emptyResult.lastDocCursor, null);
    assert.equal(emptyResult.hasMore, false);
  });
});
