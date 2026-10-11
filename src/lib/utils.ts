import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("BDT", "৳");
}

export function formatMinutes(minutes: number, lang: "bn" | "en" = "bn"): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (lang === "bn") {
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours} ঘণ্টা ${remainingMinutes} মিনিট`;
    }
    if (hours > 0) {
      return `${hours} ঘণ্টা`;
    }
    return `${remainingMinutes} মিনিট`;
  }

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMinutes}m`;
}

import type { BookingStatus } from "@/types";

export function getBookingStatusBadge(status: BookingStatus) {
  switch (status) {
    case "PENDING":
      return {
        label: "কর্মী খোঁজা হচ্ছে",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500 animate-pulse",
      };
    case "PROVIDER_ASSIGNED":
    case "PROVIDER_ACCEPTED":
      return {
        label: "কর্মী নির্ধারিত",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      };
    case "ON_THE_WAY":
      return {
        label: "কর্মী আসছেন",
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        dot: "bg-indigo-500 animate-pulse",
      };
    case "SERVICE_STARTED":
      return {
        label: "কাজ চলছে",
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        dot: "bg-purple-500 animate-pulse",
      };
    case "SERVICE_COMPLETED":
    case "CUSTOMER_CONFIRMED":
      return {
        label: "সম্পন্ন",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "CANCELLED":
      return {
        label: "বাতিলকৃত",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
      };
    default:
      return {
        label: status,
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
      };
  }
}

export function formatRelativeTimeBn(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "এইমাত্র";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const bnDigits = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d, 10)]);

    if (diffSec < 60) return "এইমাত্র";
    if (diffMin < 60) return `${bnDigits(diffMin)} মিনিট আগে`;
    if (diffHour < 24) return `${bnDigits(diffHour)} ঘণ্টা আগে`;
    if (diffDay === 1) return "গতকাল";
    if (diffDay < 7) return `${bnDigits(diffDay)} দিন আগে`;
    return date.toLocaleDateString("bn-BD", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

