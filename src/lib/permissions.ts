import type { CustomClaims } from "@/stores/authStore";

export type AdminPermissionKey =
  | "canVerifyProviders"
  | "canManageCatalog"
  | "canConfigurePricing"
  | "canOverrideBookings"
  | "canHandleDisputes"
  | "canProcessPayouts"
  | "canManageAdmins"
  | "canViewAuditLogs";

export const PERMISSION_LABELS: Record<AdminPermissionKey, { labelBn: string; descBn: string }> = {
  canVerifyProviders: {
    labelBn: "প্রোভাইডার কেওয়াইসি যাচাই",
    descBn: "সার্ভিস কর্মীদের এনআইডি ও প্রোফাইল অনুমোদন বা প্রত্যাখ্যান করার ক্ষমতা।",
  },
  canManageCatalog: {
    labelBn: "সার্ভিস ও ক্যাটাগরি ব্যবস্থাপনা",
    descBn: "নতুন সার্ভিস ক্যাটাগরি তৈরি, আপডেট ও সক্রিয়/নিষ্ক্রিয় করার ক্ষমতা।",
  },
  canConfigurePricing: {
    labelBn: "প্রাইসিং ও কমিশন কনফিগারেশন",
    descBn: "সার্ভিসের বেস প্রাইস, অতিরিক্ত সময় চার্জ ও প্ল্যাটফর্ম ফি পরিবর্তনের ক্ষমতা।",
  },
  canOverrideBookings: {
    labelBn: "বুকিং স্ট্যাটাস ওভাররাইড",
    descBn: "জরুরি প্রয়োজনে বা বিরোধ নিষ্পত্তিতে সরাসরি বুকিং স্টেট পরিবর্তনের ক্ষমতা।",
  },
  canHandleDisputes: {
    labelBn: "অভিযোগ ও বিরোধ নিষ্পত্তি",
    descBn: "কাস্টমার বা প্রোভাইডারের অভিযোগ পর্যালোচনা ও সিদ্ধান্ত প্রদান।",
  },
  canProcessPayouts: {
    labelBn: "প্রোভাইডার পেআউট অনুমোদন",
    descBn: "উপার্জিত টাকা উত্তোলনের আবেদন অনুমোদন ও নিষ্পত্তি করার ক্ষমতা।",
  },
  canManageAdmins: {
    labelBn: "স্টাফ ও রোল নিয়ন্ত্রণ",
    descBn: "নতুন অ্যাডমিন তৈরি ও অন্যান্য কর্মীদের পারমিশন নির্ধারণ করার ক্ষমতা।",
  },
  canViewAuditLogs: {
    labelBn: "সিকিউরিটি ও অডিট লগ পরিদর্শন",
    descBn: "সিস্টেমের সংবেদনশীল পরিবর্তনের অপরিবর্তনীয় অডিট ট্রেইল দেখার ক্ষমতা।",
  },
};

/**
 * Checks if the given claims grant a specific permission.
 * Super Admins automatically hold all permissions.
 */
export function hasPermission(
  claims: CustomClaims | null,
  permission: AdminPermissionKey
): boolean {
  if (!claims) return false;
  if (claims.role === "SUPER_ADMIN") return true;
  if (claims.role !== "ADMIN") return false;
  return !!claims.permissions?.[permission];
}

/**
 * Checks if user is Super Admin
 */
export function isSuperAdmin(claims: CustomClaims | null): boolean {
  return claims?.role === "SUPER_ADMIN";
}

/**
 * Checks if user is operational staff or super admin
 */
export function isAdminOrSuperAdmin(claims: CustomClaims | null): boolean {
  return claims?.role === "ADMIN" || claims?.role === "SUPER_ADMIN";
}
