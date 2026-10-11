import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./app";
import { memoryCache } from "../cache/memoryCache";
import type { 
  ServiceCategory, 
  ServiceItem, 
  PricingRule, 
  CustomerAddress,
  SystemSettings,
  Booking,
  ProviderApplication,
  ProviderProfile,
  ProviderVerificationStatus,
  Review,
  AppNotification,
  SmsLog,
  Payment,
  PayoutRequest,
  ProviderWallet,
  PromoCode,
  Dispute,
  AuditLogEntry,
  AppUser
} from "@/types";

/**
 * Fetch all Service Categories, optionally filtered by active status
 */
export async function getCategories(activeOnly = true): Promise<ServiceCategory[]> {
  try {
    const colRef = collection(db, "service_categories");
    const q = activeOnly
      ? query(colRef, where("isActive", "==", true), orderBy("displayOrder", "asc"))
      : query(colRef, orderBy("displayOrder", "asc"));
    
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      categoryId: d.id,
      ...d.data(),
    })) as ServiceCategory[];
  } catch (err) {
    console.error("Error fetching service categories:", err);
    return [];
  }
}

/**
 * Fetch Services, optionally filtered by category and active status
 */
export async function getServices(categoryId?: string, activeOnly = true): Promise<ServiceItem[]> {
  try {
    const colRef = collection(db, "services");
    let q;

    if (categoryId && activeOnly) {
      q = query(colRef, where("categoryId", "==", categoryId), where("isActive", "==", true));
    } else if (categoryId) {
      q = query(colRef, where("categoryId", "==", categoryId));
    } else if (activeOnly) {
      q = query(colRef, where("isActive", "==", true));
    } else {
      q = query(colRef);
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      serviceId: d.id,
      ...d.data(),
    })) as ServiceItem[];
  } catch (err) {
    console.error("Error fetching services:", err);
    return [];
  }
}

/**
 * Fetch single service by ID
 */
export async function getServiceById(serviceId: string): Promise<ServiceItem | null> {
  try {
    const docRef = doc(db, "services", serviceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      serviceId: snap.id,
      ...snap.data(),
    } as ServiceItem;
  } catch (err) {
    console.error(`Error fetching service ${serviceId}:`, err);
    return null;
  }
}

/**
 * Fetch Pricing Rule by ruleId
 */
export async function getPricingRule(ruleId: string): Promise<PricingRule | null> {
  try {
    const docRef = doc(db, "pricing_rules", ruleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      ruleId: snap.id,
      ...snap.data(),
    } as PricingRule;
  } catch (err) {
    console.error(`Error fetching pricing rule ${ruleId}:`, err);
    return null;
  }
}

/**
 * High-Performance Cached Catalog Accessors (MemoryCache with 5-min TTL)
 * Eliminates redundant Firestore reads across route transitions.
 */
export async function getCachedCategories(activeOnly = true): Promise<ServiceCategory[]> {
  const cacheKey = `categories_${activeOnly}`;
  return memoryCache.getOrFetch(cacheKey, () => getCategories(activeOnly), 5 * 60 * 1000);
}

export async function getCachedServices(categoryId?: string, activeOnly = true): Promise<ServiceItem[]> {
  const cacheKey = `services_${categoryId || "all"}_${activeOnly}`;
  return memoryCache.getOrFetch(cacheKey, () => getServices(categoryId, activeOnly), 5 * 60 * 1000);
}

export async function getCachedServiceById(serviceId: string): Promise<ServiceItem | null> {
  const cacheKey = `service_${serviceId}`;
  return memoryCache.getOrFetch(cacheKey, () => getServiceById(serviceId), 5 * 60 * 1000);
}

export async function getCachedPricingRule(ruleId: string): Promise<PricingRule | null> {
  const cacheKey = `pricing_rule_${ruleId}`;
  return memoryCache.getOrFetch(cacheKey, () => getPricingRule(ruleId), 5 * 60 * 1000);
}

export function invalidateCatalogCache(): void {
  memoryCache.invalidate("categories_");
  memoryCache.invalidate("services_");
  memoryCache.invalidate("service_");
  memoryCache.invalidate("pricing_rule_");
}

/**
 * Fetch saved addresses for a customer
 */
export async function getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  try {
    const colRef = collection(db, "addresses");
    const q = query(colRef, where("customerId", "==", customerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      addressId: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as CustomerAddress[];
  } catch (err) {
    console.error(`Error fetching addresses for customer ${customerId}:`, err);
    return [];
  }
}

/**
 * Save new address for a customer
 */
export async function createCustomerAddress(
  address: Omit<CustomerAddress, "addressId" | "createdAt">
): Promise<string> {
  const colRef = collection(db, "addresses");
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    addressId: newDocRef.id,
    ...address,
    createdAt: serverTimestamp(),
  });
  return newDocRef.id;
}

/**
 * Delete a saved customer address
 */
export async function deleteCustomerAddress(addressId: string): Promise<void> {
  await deleteDoc(doc(db, "addresses", addressId));
}


/**
 * Fetch all bookings for a customer
 */
export async function getCustomerBookings(customerId: string): Promise<Booking[]> {
  try {
    const colRef = collection(db, "bookings");
    const q = query(colRef, where("customerId", "==", customerId));
    const snap = await getDocs(q);
    const bookings = snap.docs.map((d) => {
      const data = d.data();
      return {
        bookingId: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as Booking;
    });

    // Sort descending by createdAt
    return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error(`Error fetching bookings for customer ${customerId}:`, err);
    return [];
  }
}

/**
 * Fetch a single booking by ID
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  try {
    const docRef = doc(db, "bookings", bookingId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      bookingId: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
    } as Booking;
  } catch (err) {
    console.error(`Error fetching booking ${bookingId}:`, err);
    return null;
  }
}

/**
 * Subscribe to real-time updates for a single booking
 */
export function subscribeToBooking(
  bookingId: string,
  onUpdate: (booking: Booking | null) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, "bookings", bookingId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const data = snap.data();
      onUpdate({
        bookingId: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as Booking);
    },
    (err) => {
      console.error(`Error in booking subscription for ${bookingId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to real-time updates for all bookings of a customer
 */
export function subscribeToCustomerBookings(
  customerId: string,
  onUpdate: (bookings: Booking[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "bookings");
  const q = query(colRef, where("customerId", "==", customerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          bookingId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        } as Booking;
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error(`Error in customer bookings subscription for ${customerId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch Provider KYC Application by providerId
 */
export async function getProviderApplication(providerId: string): Promise<ProviderApplication | null> {
  try {
    const docRef = doc(db, "provider_applications", providerId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      applicationId: snap.id,
      ...data,
      submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
    } as ProviderApplication;
  } catch (err) {
    console.error(`Error fetching provider application ${providerId}:`, err);
    return null;
  }
}

/**
 * Subscribe to real-time updates for a provider's application
 */
export function subscribeToProviderApplication(
  providerId: string,
  onUpdate: (app: ProviderApplication | null) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, "provider_applications", providerId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const data = snap.data();
      onUpdate({
        applicationId: snap.id,
        ...data,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as ProviderApplication);
    },
    (err) => {
      console.error(`Error in provider application subscription for ${providerId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch all Provider Applications (for Admin review queue)
 */
export async function getAllProviderApplications(
  statusFilter?: ProviderVerificationStatus
): Promise<ProviderApplication[]> {
  try {
    const colRef = collection(db, "provider_applications");
    const q = statusFilter
      ? query(colRef, where("status", "==", statusFilter))
      : query(colRef);
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        applicationId: d.id,
        ...data,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as ProviderApplication;
    });

    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (err) {
    console.error("Error fetching provider applications:", err);
    return [];
  }
}

/**
 * Fetch pending KYC applications
 */
export async function getPendingProviderApplications(): Promise<ProviderApplication[]> {
  return getAllProviderApplications("PENDING" as any);
}

/**
 * Fetch all registered users for Super Admin directory and statistics
 */
export async function getAllUsers(): Promise<AppUser[]> {
  try {
    const colRef = collection(db, "users");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({
      userId: d.id,
      ...d.data(),
    } as AppUser));
  } catch (err) {
    console.error("Error fetching all users:", err);
    return [];
  }
}

/**
 * Subscribe to all Provider Applications (Real-time admin queue)
 */
export function subscribeToAllProviderApplications(
  onUpdate: (apps: ProviderApplication[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "provider_applications");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          applicationId: d.id,
          ...data,
          submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        } as ProviderApplication;
      });
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to provider applications:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to a Provider's Profile
 */
export function subscribeToProviderProfile(
  providerId: string,
  onUpdate: (profile: ProviderProfile | null) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, "providers", providerId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate({ providerId: snap.id, ...snap.data() } as ProviderProfile);
    },
    (err) => {
      console.error(`Error subscribing to provider profile ${providerId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to open incoming job requests for verified providers
 * Filters by provider areas, services offered, and excludes rejected jobs
 */
export function subscribeToOpenJobs(
  providerId: string,
  providerAreas: string[],
  providerServices: string[],
  onUpdate: (jobs: Booking[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "bookings");
  const q = query(colRef, where("status", "in", ["PENDING", "PROVIDER_ASSIGNED"]));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          bookingId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        } as Booking;
      });

      // Filter:
      // 1. Must not have rejected this job
      // 2. Either status is PENDING OR directly assigned to this provider
      // 3. (Optional area match check for open jobs)
      const eligible = list.filter((job) => {
        if (job.rejectedProviderIds?.includes(providerId)) return false;

        // If directly assigned to this provider, always show
        if (job.providerId === providerId && job.status === "PROVIDER_ASSIGNED") {
          return true;
        }

        // If status is PENDING, verify area match if specified
        if (job.status === "PENDING") {
          if (providerAreas.length > 0 && job.locationSnapshot?.area) {
            const matchesArea = providerAreas.some((a) =>
              job.locationSnapshot.area.toLowerCase().includes(a.toLowerCase().split(" ")[0]) ||
              a.toLowerCase().includes(job.locationSnapshot.area.toLowerCase().split(" ")[0])
            );
            return matchesArea;
          }
          return true;
        }

        return false;
      });

      eligible.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(eligible);
    },
    (err) => {
      console.error("Error subscribing to open jobs:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to jobs assigned to a specific provider (Active, In-Progress, Completed)
 */
export function subscribeToProviderJobs(
  providerId: string,
  onUpdate: (jobs: Booking[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "bookings");
  const q = query(colRef, where("providerId", "==", providerId));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          bookingId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        } as Booking;
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error(`Error subscribing to provider jobs for ${providerId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch all bookings across the platform (for Admin)
 */
export async function getAllBookings(): Promise<Booking[]> {
  try {
    const colRef = collection(db, "bookings");
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        bookingId: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
      } as Booking;
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error fetching all bookings:", err);
    return [];
  }
}

/**
 * Subscribe to all platform bookings in real-time (for Admin dispatch console)
 */
export function subscribeToAllBookings(
  onUpdate: (bookings: Booking[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "bookings");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          bookingId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        } as Booking;
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to all bookings:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch reviews for a specific provider
 */
export async function getReviewsForProvider(providerId: string): Promise<Review[]> {
  try {
    const colRef = collection(db, "reviews");
    const q = query(colRef, where("providerId", "==", providerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        reviewId: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      } as Review;
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error(`Error fetching reviews for provider ${providerId}:`, err);
    return [];
  }
}

/**
 * Subscribe to reviews for a specific provider
 */
export function subscribeToProviderReviews(
  providerId: string,
  onUpdate: (reviews: Review[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "reviews");
  const q = query(colRef, where("providerId", "==", providerId));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          reviewId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        } as Review;
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error(`Error subscribing to reviews for ${providerId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch all platform reviews (for Admin moderation)
 */
export async function getAllReviews(): Promise<Review[]> {
  try {
    const colRef = collection(db, "reviews");
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        reviewId: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      } as Review;
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error fetching all reviews:", err);
    return [];
  }
}

/**
 * Subscribe to all platform reviews in real-time (for Admin)
 */
export function subscribeToAllReviews(
  onUpdate: (reviews: Review[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "reviews");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          reviewId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        } as Review;
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to all reviews:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to notifications for a specific user in real-time
 */
export function subscribeToUserNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "notifications");
  const q = query(colRef, where("userId", "==", userId));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        } as AppNotification;
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error(`Error subscribing to notifications for ${userId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "notifications", notificationId);
    await updateDoc(docRef, { isRead: true });
    return true;
  } catch (err) {
    console.error(`Error marking notification ${notificationId} as read:`, err);
    return false;
  }
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const colRef = collection(db, "notifications");
    const q = query(colRef, where("userId", "==", userId), where("isRead", "==", false));
    const snap = await getDocs(q);

    if (snap.empty) return true;

    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { isRead: true });
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.error(`Error marking all notifications for ${userId} as read:`, err);
    return false;
  }
}

/**
 * Fetch all SMS delivery audit logs (for Admin)
 */
export async function getAllSmsLogs(limitCount = 100): Promise<SmsLog[]> {
  try {
    const colRef = collection(db, "sms_logs");
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || new Date().toISOString(),
      } as SmsLog;
    });

    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list.slice(0, limitCount);
  } catch (err) {
    console.error("Error fetching SMS logs:", err);
    return [];
  }
}

/**
 * Subscribe to all SMS delivery logs in real-time (for Admin)
 */
export function subscribeToAllSmsLogs(
  onUpdate: (logs: SmsLog[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "sms_logs");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || new Date().toISOString(),
        } as SmsLog;
      });

      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to SMS logs:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to payments for a specific booking
 */
export function subscribeToBookingPayments(
  bookingId: string,
  onUpdate: (payments: Payment[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "payments");
  const q = query(colRef, where("bookingId", "==", bookingId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          paymentId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || undefined,
        } as Payment;
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error(`Error subscribing to payments for booking ${bookingId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to all payments (for Admin Finance Console)
 */
export function subscribeToAllPayments(
  onUpdate: (payments: Payment[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "payments");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          paymentId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          paidAt: data.paidAt?.toDate?.()?.toISOString() || data.paidAt || undefined,
        } as Payment;
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to all payments:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to payouts for a specific provider
 */
export function subscribeToProviderPayouts(
  providerId: string,
  onUpdate: (payouts: PayoutRequest[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "payouts");
  const q = query(colRef, where("providerId", "==", providerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          payoutId: d.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.()?.toISOString() || data.requestedAt || new Date().toISOString(),
          processedAt: data.processedAt?.toDate?.()?.toISOString() || data.processedAt || undefined,
        } as PayoutRequest;
      });
      list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error(`Error subscribing to payouts for provider ${providerId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to all payouts (for Admin Finance Console)
 */
export function subscribeToAllPayouts(
  onUpdate: (payouts: PayoutRequest[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "payouts");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          payoutId: d.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.()?.toISOString() || data.requestedAt || new Date().toISOString(),
          processedAt: data.processedAt?.toDate?.()?.toISOString() || data.processedAt || undefined,
        } as PayoutRequest;
      });
      list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to all payouts:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Calculate Provider Wallet summary from completed paid bookings and payouts
 */
export async function getProviderWallet(providerId: string): Promise<ProviderWallet> {
  try {
    // 1. Fetch completed bookings where providerId matches and paymentStatus is PAID
    const bookingsCol = collection(db, "bookings");
    const qBookings = query(
      bookingsCol,
      where("providerId", "==", providerId),
      where("paymentStatus", "==", "PAID")
    );
    const bookingsSnap = await getDocs(qBookings);

    let totalEarningsBDT = 0;
    let platformCommissionBDT = 0;
    let netEarningsBDT = 0;
    let completedJobsCount = 0;

    bookingsSnap.docs.forEach((docSnap) => {
      const b = docSnap.data() as Booking;
      if (b.status === "SERVICE_COMPLETED" || b.status === "CUSTOMER_CONFIRMED") {
        const gross = b.pricingSnapshot?.customerFinalAmount || 0;
        const commission = b.pricingSnapshot?.platformCommissionAmount || 0;
        const net = b.pricingSnapshot?.providerEarningAmount || 0;

        totalEarningsBDT += gross;
        platformCommissionBDT += commission;
        netEarningsBDT += net;
        completedJobsCount += 1;
      }
    });

    // 2. Fetch payouts
    const payoutsCol = collection(db, "payouts");
    const qPayouts = query(payoutsCol, where("providerId", "==", providerId));
    const payoutsSnap = await getDocs(qPayouts);

    let totalPaidOutBDT = 0;
    let pendingPayoutBDT = 0;

    payoutsSnap.docs.forEach((docSnap) => {
      const p = docSnap.data() as PayoutRequest;
      if (p.status === "PROCESSED") {
        totalPaidOutBDT += p.amountBDT || 0;
      } else if (p.status === "REQUESTED" || p.status === "APPROVED") {
        pendingPayoutBDT += p.amountBDT || 0;
      }
    });

    const availableBalanceBDT = Math.max(0, netEarningsBDT - totalPaidOutBDT - pendingPayoutBDT);

    return {
      providerId,
      totalEarningsBDT,
      platformCommissionBDT,
      netEarningsBDT,
      totalPaidOutBDT,
      availableBalanceBDT,
      pendingPayoutBDT,
      completedJobsCount,
    };
  } catch (err) {
    console.error("Error calculating provider wallet:", err);
    return {
      providerId,
      totalEarningsBDT: 0,
      platformCommissionBDT: 0,
      netEarningsBDT: 0,
      totalPaidOutBDT: 0,
      availableBalanceBDT: 0,
      pendingPayoutBDT: 0,
      completedJobsCount: 0,
    };
  }
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  settingId: "global",
  platformName: "GhorBondhu (ঘরবন্ধু)",
  supportPhone: "01700-000000",
  supportEmail: "support@ghorbondhu.com",
  maintenanceMode: false,
  maintenanceMessage: "সিস্টেম রক্ষণাবেক্ষণের কারণে সাময়িক সময়ের জন্য বুকিং সাময়িক স্থগিত রয়েছে।",
  allowNewRegistrations: true,
  autoDispatchEnabled: true,
  serviceFeePercentage: 15,
  minimumWithdrawalLimitBDT: 500,
  cancellationGraceMinutes: 15,
  cancellationFeeBDT: 150,
  operationalCities: ["ঢাকা", "চট্টগ্রাম", "সিলেট", "রাজশাহী", "খুলনা"],
  emergencyBanner: {
    active: false,
    message: "",
    type: "INFO",
  },
};

/**
 * Fetch System Settings
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const docRef = doc(db, "system_settings", "global");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return DEFAULT_SYSTEM_SETTINGS;
    }
    const data = snap.data();
    return {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...data,
      settingId: "global",
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || undefined,
    } as SystemSettings;
  } catch (err) {
    console.error("Error fetching system settings:", err);
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

/**
 * Subscribe to Real-Time System Settings
 */
export function subscribeToSystemSettings(
  onUpdate: (settings: SystemSettings) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, "system_settings", "global");
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(DEFAULT_SYSTEM_SETTINGS);
        return;
      }
      const data = snap.data();
      onUpdate({
        ...DEFAULT_SYSTEM_SETTINGS,
        ...data,
        settingId: "global",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || undefined,
      } as SystemSettings);
    },
    (err) => {
      console.error("Error subscribing to system settings:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to Audit Logs (for Super Admin & Admin)
 */
export function subscribeToAuditLogs(
  onUpdate: (logs: AuditLogEntry[]) => void,
  maxLogs = 60,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "audit_logs");
  const q = query(colRef, orderBy("timestamp", "desc"), limit(maxLogs));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          logId: d.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || new Date().toISOString(),
        } as AuditLogEntry;
      });
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to audit logs:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to Promo Codes
 */
export function subscribeToPromoCodes(
  onUpdate: (promos: PromoCode[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "promo_codes");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          promoId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        } as PromoCode;
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to promo codes:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to Customer Disputes & Complaints
 */
export function subscribeToDisputes(
  onUpdate: (disputes: Dispute[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, "disputes");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          disputeId: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() || data.resolvedAt || undefined,
        } as Dispute;
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error("Error subscribing to disputes:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create a new Customer Dispute / Complaint
 */
export async function createCustomerDispute(
  data: Omit<Dispute, "disputeId" | "createdAt" | "status">
): Promise<string> {
  const colRef = collection(db, "disputes");
  const docRef = doc(colRef);
  await setDoc(docRef, {
    disputeId: docRef.id,
    ...data,
    status: "OPEN",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}



