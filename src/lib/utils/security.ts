/**
 * GhorBondhu (ঘরবন্ধু) - Enterprise Security & Input Sanitization Utilities
 * Provides XSS prevention, HTML entity escaping, phone normalization,
 * PII masking, and password entropy validation.
 */

/**
 * Escapes unsafe HTML characters to prevent Stored & Reflected Cross-Site Scripting (XSS).
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  const htmlEntityMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
  };
  return input.replace(/[&<>"'/`]/g, (match) => htmlEntityMap[match] || match);
}

/**
 * Strips all HTML/XML tags completely, leaving only clean text.
 */
export function stripHtmlTags(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

/**
 * Sanitizes plain text input by stripping HTML tags, trimming,
 * and enforcing maximum length limits.
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  if (!input || typeof input !== "string") return "";
  const cleaned = stripHtmlTags(input)
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "") // remove invisible control characters
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Cleans search query inputs against injection tokens and limiting character length.
 */
export function sanitizeSearchQuery(query: string, maxLength = 80): string {
  if (!query || typeof query !== "string") return "";
  return query
    .replace(/[<>{}\\[\]~`^$]/g, "") // strip script/query injection chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes and validates Bangladeshi mobile numbers (+8801XXXXXXXXX or 01XXXXXXXXX).
 */
export function sanitizePhone(phone: string): { isValid: boolean; normalized: string } {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, normalized: "" };
  }

  // Remove non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, "");

  // Convert +8801XXXXXXXXX to 01XXXXXXXXX
  if (cleaned.startsWith("+880")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("880")) {
    cleaned = cleaned.slice(2);
  }

  // Valid BD mobile regex: starts with 01 and follows with 3-9, total 11 digits
  const bdPhoneRegex = /^01[3-9]\d{8}$/;
  const isValid = bdPhoneRegex.test(cleaned);

  return {
    isValid,
    normalized: isValid ? cleaned : cleaned,
  };
}

/**
 * Masks a phone number for sensitive display (PII minimization).
 * Example: '01712345678' -> '017****5678'
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  const cleaned = phone.trim();
  if (cleaned.length < 8) return cleaned;
  const start = cleaned.slice(0, 3);
  const end = cleaned.slice(-4);
  return `${start}****${end}`;
}

/**
 * Masks a National ID (NID) for privacy and compliance with data protection standards.
 * Example: '19901234567890123' -> '************0123'
 */
export function maskNationalId(nid: string): string {
  if (!nid || typeof nid !== "string") return "";
  const cleaned = nid.trim();
  if (cleaned.length <= 4) return "****";
  const end = cleaned.slice(-4);
  return `${"*".repeat(Math.max(0, cleaned.length - 4))}${end}`;
}

/**
 * Validates password entropy and strength.
 */
export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (!password || typeof password !== "string") {
    return { isValid: false, score: 0, errors: ["পাসওয়ার্ড প্রদান করা আবশ্যক।"] };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    errors.push("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    errors.push("কমপক্ষে একটি ছোট হাতের অক্ষর (a-z) থাকতে হবে।");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    errors.push("কমপক্ষে একটি বড় হাতের অক্ষর (A-Z) থাকতে হবে।");
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    errors.push("কমপক্ষে একটি সংখ্যা (0-9) থাকতে হবে।");
  }

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    score += 1; // bonus score for special chars
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
  };
}

/**
 * Sanitizes financial amounts to guard against negative values, NaN, and excessive decimal precision.
 */
export function sanitizeAmount(amount: unknown, fallback = 0): number {
  if (amount === null || amount === undefined) return fallback;
  const parsed = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  // Round to 2 decimal places to avoid IEEE 754 float precision overflow
  return Math.round(parsed * 100) / 100;
}
