"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "@/lib/firebase/db";
import { formatRelativeTimeBn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types";

interface NotificationBellProps {
  className?: string;
  align?: "left" | "right";
}

export function NotificationBell({ className = "", align = "right" }: NotificationBellProps) {
  const router = useRouter();
  const { firebaseUser, claims } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeToUserNotifications(
      firebaseUser.uid,
      (list) => {
        setNotifications(list);
      },
      (err) => {
        console.error("Error subscribing to notifications:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [firebaseUser?.uid]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead && n.id) {
      await markNotificationAsRead(n.id);
    }
    setIsOpen(false);

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

  const handleMarkAllRead = async () => {
    if (!firebaseUser?.uid || unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead(firebaseUser.uid);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "BOOKING_CREATED":
      case "PROVIDER_ASSIGNED":
      case "PROVIDER_ACCEPTED":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "PROVIDER_EN_ROUTE":
      case "SERVICE_STARTED":
        return <Clock className="w-4 h-4 text-indigo-600" />;
      case "SERVICE_COMPLETED":
      case "CUSTOMER_CONFIRMED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "BOOKING_CANCELLED":
      case "KYC_REJECTED":
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case "KYC_APPROVED":
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case "REVIEW_RECEIVED":
        return <Star className="w-4 h-4 text-amber-500 fill-amber-400" />;
      case "SYSTEM_BROADCAST":
        return <Megaphone className="w-4 h-4 text-sky-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatBnDigits = (n: number) => {
    return n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d, 10)]);
  };

  if (!firebaseUser) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="নোটিফিকেশন দেখুন"
        className="relative p-2.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-500 rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? "৯+" : formatBnDigits(unreadCount)}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden transform transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50/80 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-sm">নোটিফিকেশন</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                  {formatBnDigits(unreadCount)} নতুন
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {isMarkingAll ? "প্রসেসিং..." : "সব পড়া হয়েছে"}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">কোনো নোটিফিকেশন নেই</p>
              </div>
            ) : (
              notifications.slice(0, 7).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-50/80 ${
                    !n.isRead ? "bg-emerald-50/30" : ""
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-100 shadow-sm shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p
                        className={`text-xs font-medium truncate ${
                          !n.isRead ? "text-slate-900 font-bold" : "text-slate-700"
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatRelativeTimeBn(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All */}
          <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-1 px-3 rounded-lg hover:bg-emerald-50 transition-colors w-full"
            >
              সব নোটিফিকেশন দেখুন
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
