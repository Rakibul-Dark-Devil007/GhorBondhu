"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Megaphone, 
  Star, 
  UserCheck, 
  XCircle, 
  Trash2, 
  ArrowLeft, 
  ExternalLink,
  Filter,
  Sparkles
} from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { useAuthStore } from "@/stores/authStore";
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "@/lib/firebase/db";
import { formatRelativeTimeBn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import type { AppNotification, NotificationType } from "@/types";

export default function NotificationsPage() {
  const router = useRouter();
  const { firebaseUser, claims } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BOOKING" | "ACCOUNT" | "SYSTEM">("ALL");
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const unsubscribe = subscribeToUserNotifications(
      firebaseUser.uid,
      (list) => {
        setNotifications(list);
      },
      (err) => {
        console.error("Error subscribing to notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (!firebaseUser?.uid || unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead(firebaseUser.uid);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (id?: string) => {
    if (!id) return;
    await markNotificationAsRead(id);
  };

  const handleDeleteNotification = async (id?: string) => {
    if (!id) return;
    setActionLoadingId(id);
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNavigate = (n: AppNotification) => {
    if (!n.isRead && n.id) {
      markNotificationAsRead(n.id);
    }

    if (n.link) {
      router.push(n.link);
      return;
    }

    if (n.bookingId) {
      const role = claims?.role;
      if (role === "PROVIDER") {
        router.push(`/provider/jobs/${n.bookingId}`);
      } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
        router.push(`/admin/bookings`);
      } else {
        router.push(`/bookings/${n.bookingId}`);
      }
    }
  };

  const getDashboardLink = () => {
    const role = claims?.role;
    if (role === "PROVIDER") return "/provider-dashboard";
    if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin-dashboard";
    return "/customer-dashboard";
  };

  // Filter items
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "UNREAD" && n.isRead) return false;
    if (activeTab === "READ" && !n.isRead) return false;

    if (typeFilter === "BOOKING") {
      const bookingTypes: NotificationType[] = [
        "BOOKING_CREATED",
        "PROVIDER_ASSIGNED",
        "PROVIDER_ACCEPTED",
        "PROVIDER_EN_ROUTE",
        "SERVICE_STARTED",
        "SERVICE_COMPLETED",
        "CUSTOMER_CONFIRMED",
        "BOOKING_CANCELLED",
      ];
      if (!bookingTypes.includes(n.type)) return false;
    } else if (typeFilter === "ACCOUNT") {
      const accountTypes: NotificationType[] = ["KYC_APPROVED", "KYC_REJECTED", "REVIEW_RECEIVED"];
      if (!accountTypes.includes(n.type)) return false;
    } else if (typeFilter === "SYSTEM") {
      if (n.type !== "SYSTEM_BROADCAST") return false;
    }

    return true;
  });

  const getNotificationVisual = (type: NotificationType) => {
    switch (type) {
      case "BOOKING_CREATED":
      case "PROVIDER_ASSIGNED":
      case "PROVIDER_ACCEPTED":
        return {
          icon: <Calendar className="w-5 h-5 text-blue-600" />,
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          label: "বুকিং আপডেট",
        };
      case "PROVIDER_EN_ROUTE":
      case "SERVICE_STARTED":
        return {
          icon: <Clock className="w-5 h-5 text-indigo-600" />,
          badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
          label: "সার্ভিস ট্র্যাকিং",
        };
      case "SERVICE_COMPLETED":
      case "CUSTOMER_CONFIRMED":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "সার্ভিস সম্পন্ন",
        };
      case "BOOKING_CANCELLED":
        return {
          icon: <XCircle className="w-5 h-5 text-rose-600" />,
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          label: "বুকিং বাতিল",
        };
      case "KYC_APPROVED":
        return {
          icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "ভেরিফিকেশন সফল",
        };
      case "KYC_REJECTED":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          label: "ভেরিফিকেশন প্রত্যাখ্যাত",
        };
      case "REVIEW_RECEIVED":
        return {
          icon: <Star className="w-5 h-5 text-amber-500 fill-amber-400" />,
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          label: "রিভিউ ও রেটিং",
        };
      case "SYSTEM_BROADCAST":
        return {
          icon: <Megaphone className="w-5 h-5 text-sky-600" />,
          badge: "bg-sky-50 text-sky-700 border-sky-200",
          label: "অফিসিয়াল ঘোষণা",
        };
      default:
        return {
          icon: <Sparkles className="w-5 h-5 text-slate-500" />,
          badge: "bg-slate-50 text-slate-700 border-slate-200",
          label: "সাধারণ",
        };
    }
  };

  const formatBnDigits = (n: number) => {
    return n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d, 10)]);
  };

  return (
    <AuthGuard allowedRoles={["CUSTOMER", "PROVIDER", "ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href={getDashboardLink()}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                title="ড্যাশবোর্ডে ফিরে যান"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-lg">নোটিফিকেশন সেন্টার</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href={getDashboardLink()}
                className="text-xs font-semibold text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg transition"
              >
                ড্যাশবোর্ড
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900">নোটিফিকেশন ও অ্যালার্ট</h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 rounded-full">
                    {formatBnDigits(unreadCount)} অপঠিত
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                আপনার বুকিং আপডেট, সার্ভিস ট্র্যাকিং, অ্যাকাউন্ট অ্যালার্ট ও অফিশিয়াল ঘোষণা।
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{isMarkingAll ? "প্রসেসিং..." : "সব পড়া হয়েছে হিসেবে চিহ্নিত করুন"}</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                সব ({formatBnDigits(notifications.length)})
              </button>
              <button
                onClick={() => setActiveTab("UNREAD")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "UNREAD"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                অপঠিত ({formatBnDigits(unreadCount)})
              </button>
              <button
                onClick={() => setActiveTab("READ")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "READ"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                পঠিত ({formatBnDigits(notifications.length - unreadCount)})
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">সকল ক্যাটাগরি</option>
                <option value="BOOKING">বুকিং ও সার্ভিস</option>
                <option value="ACCOUNT">অ্যাকাউন্ট ও কেওয়াইসি</option>
                <option value="SYSTEM">অফিসিয়াল ঘোষণা</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">কোনো নোটিফিকেশন নেই</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                {activeTab === "UNREAD"
                  ? "আপনার কোনো অপঠিত নোটিফিকেশন নেই।"
                  : "আপনার কোনো নোটিফিকেশন রেকর্ড পাওয়া যায়নি।"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((n) => {
                const visual = getNotificationVisual(n.type);
                const hasAction = !!(n.bookingId || n.link);

                return (
                  <div
                    key={n.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row items-start justify-between gap-4 ${
                      !n.isRead
                        ? "border-emerald-200 bg-emerald-50/15"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="p-2.5 rounded-2xl bg-white border border-slate-100 shadow-sm shrink-0 mt-0.5">
                        {visual.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${visual.badge}`}
                          >
                            {visual.label}
                          </span>
                          {!n.isRead && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              নতুন
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {formatRelativeTimeBn(n.createdAt)}
                          </span>
                        </div>

                        <h3
                          className={`text-sm sm:text-base mb-1 ${
                            !n.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-800"
                          }`}
                        >
                          {n.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                          {n.body}
                        </p>

                        {n.bookingNumber && (
                          <div className="mt-2 text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 inline-block">
                            বুকিং নং: #{n.bookingNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {hasAction && (
                        <button
                          type="button"
                          onClick={() => handleNavigate(n)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-semibold transition"
                        >
                          <span>বিস্তারিত</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkSingleRead(n.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="পড়া হয়েছে হিসেবে চিহ্নিত করুন"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(n.id)}
                        disabled={actionLoadingId === n.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
