# GhorBondhu (ঘরবন্ধু) - Performance Optimization, Caching & Indexing Specification

> **Document Version:** 1.0.0 (Production Release)  
> **Last Audited:** October 2026  
> **Platform:** GhorBondhu (ঘরবন্ধু) — *Trusted Help, Right at Home.*  
> **Target:** 95+ Lighthouse Score, <1.2s LCP on 4G Mobile, Minimal Firestore Read Billing Costs.

---

## 1. Executive Performance Strategy

GhorBondhu is optimized for the challenging network and device conditions common in Bangladesh (varying 3G/4G connectivity, mid-tier Android smartphones, metered data plans):
1. **Firestore Read Cost & Latency Minimization:** Static or slowly changing collections (categories, active services, pricing rules) are cached in-memory with automatic 5-minute TTLs and concurrent request deduplication.
2. **Zero Full-Collection Scans:** All multi-document queries utilize composite indexes and cursor-based pagination with a strict limit clause (`pageSize + 1`), preventing memory bloat.
3. **Asset & Image Optimization:** Next-generation AVIF and WebP image formats, edge CDN caching (24-hour minimum cache TTL), and responsive image sizing.
4. **Listener Hygiene:** Real-time listeners (`onSnapshot`) are used strictly for active booking tracking, user notifications, and live command centers, and are cleanly unsubscribed upon component unmount.

---

## 2. Firestore Composite Indexing Architecture

GhorBondhu configures 22 production composite indexes in [`firestore.indexes.json`](file:///c:/Users/MSI/Desktop/NestTech%20Solution%20&%20Consultant/GhorBondhu/firestore.indexes.json) to eliminate unindexed table scans and ensure $O(\log N)$ query performance:

### Index Registry Summary
| Collection | Field Path 1 | Field Path 2 | Field Path 3 | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `bookings` | `customerId` (ASC) | `createdAt` (DESC) | — | Customer booking history stream |
| `bookings` | `customerId` (ASC) | `status` (ASC) | `createdAt` (DESC) | Filter customer bookings by active/completed status |
| `bookings` | `customerId` (ASC) | `scheduledDate` (DESC) | `status` (ASC) | Customer calendar view |
| `bookings` | `providerId` (ASC) | `createdAt` (DESC) | — | Provider job history stream |
| `bookings` | `providerId` (ASC) | `status` (ASC) | `createdAt` (DESC) | Provider active task queue |
| `bookings` | `providerId` (ASC) | `status` (ASC) | `scheduledDate` (ASC) | Provider upcoming schedule queue |
| `bookings` | `status` (ASC) | `createdAt` (DESC) | — | Admin open job dispatch pool |
| `providers` | `verificationStatus` (ASC)| `ratingAvg` (DESC) | — | Public directory highest-rated verified providers |
| `providers` | `isOnline` (ASC) | `verificationStatus` (ASC)| `serviceAreas` (CONTAINS) | Algorithmic job dispatch matchmaking in area |
| `reviews` | `providerId` (ASC) | `createdAt` (DESC) | — | Provider public reviews feed |
| `reviews` | `serviceId` (ASC) | `createdAt` (DESC) | — | Service catalog reviews feed |
| `notifications` | `userId` (ASC) | `createdAt` (DESC) | — | User in-app notification center |
| `notifications` | `userId` (ASC) | `isRead` (ASC) | `createdAt` (DESC) | Unread badge counter filter |
| `payments` | `customerId` (ASC) | `createdAt` (DESC) | — | Customer payment transactions |
| `payments` | `providerId` (ASC) | `createdAt` (DESC) | — | Provider earnings ledger |
| `payments` | `status` (ASC) | `createdAt` (DESC) | — | Financial reconciliation queue |
| `payouts` | `providerId` (ASC) | `requestedAt` (DESC)| — | Provider withdrawal requests |
| `payouts` | `status` (ASC) | `requestedAt` (ASC) | — | Admin payout disbursement queue (FIFO) |
| `audit_logs` | `resourceType` (ASC) | `timestamp` (DESC) | — | Super Admin audit trail filter by entity |
| `audit_logs` | `actorRole` (ASC) | `timestamp` (DESC) | — | Super Admin audit trail filter by role |
| `disputes` | `status` (ASC) | `createdAt` (DESC) | — | Admin dispute resolution queue |
| `disputes` | `customerId` (ASC) | `createdAt` (DESC) | — | Customer filed dispute complaints |

---

## 3. Client-Side Memory Caching & In-Flight Deduplication

Implemented in [`src/lib/cache/memoryCache.ts`](file:///c:/Users/MSI/Desktop/NestTech%20Solution%20&%20Consultant/GhorBondhu/src/lib/cache/memoryCache.ts):

### Key Mechanisms:
1. **Concurrent Request Deduplication:** If multiple React components mount simultaneously and request the active category catalog, only **one** network request is dispatched to Firestore. The other callers receive the identical shared promise.
2. **Time-To-Live (TTL):** Catalog data is retained for 5 minutes (300,000ms), eliminating Firestore reads during frequent customer browsing between `/services`, `/book/[serviceId]`, and `/`.
3. **Granular Prefix Invalidation:** When an Admin creates or modifies a service or category in the Admin Console, `invalidateCatalogCache()` invalidates all `categories_*` and `services_*` cache entries instantly without disrupting user session states.

---

## 4. Cursor-Based Pagination Architecture

Implemented in [`src/lib/firebase/pagination.ts`](file:///c:/Users/MSI/Desktop/NestTech%20Solution%20&%20Consultant/GhorBondhu/src/lib/firebase/pagination.ts):

```typescript
export interface PaginatedResult<T> {
  items: T[];
  lastDocCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  totalFetched: number;
}
```

### Why Cursor-Based over Offset:
- **Zero Inefficiency:** Firestore `offset()` still charges for skipped documents. Cursor-based pagination with `startAfter(snapshot)` charges **only** for documents returned.
- **Prefetch Detection:** The helper requests `pageSize + 1` documents:
  - If `snapshot.docs.length > pageSize`, `hasMore` is `true` and the extra item is sliced off.
  - This determines whether to show "Load More" without needing a separate `count()` aggregate query!

---

## 5. Next.js Image & Asset Optimization

Configured in [`next.config.mjs`](file:///c:/Users/MSI/Desktop/NestTech%20Solution%20&%20Consultant/GhorBondhu/next.config.mjs):

```javascript
images: {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 86400, // 24-hour CDN edge caching
  remotePatterns: [
    { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
    { protocol: "https", hostname: "images.unsplash.com" },
  ],
}
```

- **Format Selection:** AVIF provides up to 50% smaller payloads than JPEG with superior visual fidelity.
- **Edge Caching:** Optimized images are cached on Firebase CDN edge nodes for 24 hours (`minimumCacheTTL: 86400`), preventing cold server re-compression.

---

## 6. Realtime Listener Hygiene Guidelines

1. **Explicit Unsubscribe:** Always store the return value of `onSnapshot` and invoke it in React's `useEffect` cleanup return:
   ```typescript
   useEffect(() => {
     const unsubscribe = subscribeToCustomerBookings(uid, (data) => setBookings(data));
     return () => unsubscribe(); // Prevents memory leaks and ghost reads
   }, [uid]);
   ```
2. **Conditional Subscription:** Do not bind listeners until prerequisite IDs (`uid`, `bookingId`) are confirmed to be non-null.
3. **One-Time Reads for Static Screens:** Screens that do not require live streaming (FAQ, Terms, Profile details) use `getDoc()` or `getCached*()` rather than `onSnapshot`.
