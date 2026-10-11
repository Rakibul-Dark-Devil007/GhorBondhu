import {
  query,
  limit,
  startAfter,
  getDocs,
  type Query,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";

export interface PaginatedResult<T> {
  items: T[];
  lastDocCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  totalFetched: number;
}

/**
 * Executes a cursor-based paginated Firestore query.
 * Automatically fetches (pageSize + 1) to determine `hasMore` without an extra read query.
 * 
 * @param baseQuery Base Firestore query (with wheres and orderBys)
 * @param pageSize Number of items per page
 * @param startAfterDoc Previous page's last document snapshot
 */
export async function fetchPaginatedQuery<T>(
  baseQuery: Query<DocumentData>,
  pageSize: number = 10,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PaginatedResult<T>> {
  try {
    const fetchLimit = pageSize + 1;
    let paginatedQ = query(baseQuery, limit(fetchLimit));

    if (startAfterDoc) {
      paginatedQ = query(baseQuery, startAfter(startAfterDoc), limit(fetchLimit));
    }

    const snapshot = await getDocs(paginatedQ);
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

    const items = pageDocs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as unknown as T[];

    const lastDocCursor = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

    return {
      items,
      lastDocCursor,
      hasMore,
      totalFetched: items.length,
    };
  } catch (err) {
    console.error("Error executing paginated query:", err);
    return {
      items: [],
      lastDocCursor: null,
      hasMore: false,
      totalFetched: 0,
    };
  }
}
