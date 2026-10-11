"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToCustomerBookings } from "@/lib/firebase/db";
import { formatBDT, formatMinutes, getBookingStatusBadge } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/types";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlusCircle,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  CreditCard
} from "lucide-react";

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED";

const ACTIVE_STATUSES: BookingStatus[] = [
  "PENDING",
  "PROVIDER_ASSIGNED",
  "PROVIDER_ACCEPTED",
  "ON_THE_WAY",
  "SERVICE_STARTED",
];

const COMPLETED_STATUSES: BookingStatus[] = [
  "SERVICE_COMPLETED",
  "CUSTOMER_CONFIRMED",
];

export default function CustomerBookingsPage() {
  const { firebaseUser } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    setIsLoading(true);
    const unsubscribe = subscribeToCustomerBookings(
      firebaseUser.uid,
      (updatedList) => {
        setBookings(updatedList);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe to customer bookings:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  // Counts
  const counts = {
    all: bookings.length,
    active: bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length,
    completed: bookings.filter((b) => COMPLETED_STATUSES.includes(b.status)).length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  // Filtered list
  const filteredBookings = bookings.filter((b) => {
    // Tab filter
    if (activeTab === "ACTIVE" && !ACTIVE_STATUSES.includes(b.status)) return false;
    if (activeTab === "COMPLETED" && !COMPLETED_STATUSES.includes(b.status)) return false;
    if (activeTab === "CANCELLED" && b.status !== "CANCELLED") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = b.bookingNumber?.toLowerCase().includes(q);
      const matchBn = b.serviceNameSnapshot?.bn?.toLowerCase().includes(q);
      const matchEn = b.serviceNameSnapshot?.en?.toLowerCase().includes(q);
      const matchArea = b.locationSnapshot?.area?.toLowerCase().includes(q);
      return matchNum || matchBn || matchEn || matchArea;
    }

    return true;
  });

  return (
    <AuthGuard allowedRoles={["CUSTOMER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/customer-dashboard"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                title="ড্যাশবোর্ডে ফিরে যান"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-lg hidden sm:inline">GhorBondhu</span>
              </Link>
            </div>

            <div className="flex items-center space-x-3">
              <NotificationBell />
              <Link
                href="/customer-dashboard"
                className="text-xs font-semibold text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg transition"
              >
                ড্যাশবোর্ড
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>নতুন সেবা বুকিং</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          {/* Page Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">আমার বুকিং ও সেবার ইতিহাস</h1>
              <p className="text-sm text-slate-600 mt-1">
                আপনার গৃহস্থালী সার্ভিসের রিয়েল-টাইম লাইভ স্ট্যাটাস ট্র্যাক ও অর্ডার বিবরণী দেখুন।
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="বুকিং নম্বর বা সার্ভিস খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
                activeTab === "ALL"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>সবগুলো</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "ALL" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
                activeTab === "ACTIVE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>চলমান সেবা</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "ACTIVE" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-600"
                }`}
              >
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
                activeTab === "COMPLETED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>সম্পন্ন</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "COMPLETED" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {counts.completed}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("CANCELLED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 ${
                activeTab === "CANCELLED"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>বাতিলকৃত</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "CANCELLED" ? "bg-rose-700 text-white" : "bg-rose-50 text-rose-600"
                }`}
              >
                {counts.cancelled}
              </span>
            </button>
          </div>

          {/* Bookings List */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
              <p className="text-sm">বুকিং তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">কোনো বুকিং পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                {searchQuery
                  ? "আপনার অনুসন্ধানের সাথে মিল রেখে কোনো রেকর্ড খুঁজে পাওয়া যায়নি।"
                  : "আপনার এই ক্যাটাগরিতে কোনো বুকিং নেই। পরিচ্ছন্নতা, রান্না বা লন্ড্রির জন্য বিশ্বস্ত সাহায্যকারী বুক করুন।"}
              </p>
              <div className="mt-6">
                <Link
                  href="/services"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>নতুন সেবা বেছে নিন</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBookings.map((b) => {
                const badge = getBookingStatusBadge(b.status);
                return (
                  <div
                    key={b.bookingId}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                              {b.bookingNumber}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {b.createdAt ? new Date(b.createdAt).toLocaleDateString("bn-BD") : ""}
                            </span>
                          </div>
                          <h2 className="text-base font-bold text-slate-900 mt-1.5 line-clamp-1">
                            {b.serviceNameSnapshot?.bn || "হোম সার্ভিস"}
                          </h2>
                          <p className="text-xs text-slate-400">
                            {b.serviceNameSnapshot?.en}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </div>
                      </div>

                      {/* Schedule & Location Details */}
                      <div className="grid grid-cols-2 gap-3 py-4 text-xs text-slate-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>তারিখ: <strong className="text-slate-800">{b.scheduledDate}</strong></span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>সময়: <strong className="text-slate-800">{b.scheduledStartTime} ({formatMinutes(b.selectedDurationMinutes)})</strong></span>
                        </div>

                        <div className="flex items-center space-x-2 col-span-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">ঠিকানা: <strong className="text-slate-800">{b.locationSnapshot?.area}, {b.locationSnapshot?.city}</strong></span>
                        </div>
                      </div>

                      {/* Provider preview if assigned */}
                      {b.providerSnapshot && (
                        <div className="bg-slate-50 rounded-2xl p-3 mb-4 flex items-center justify-between text-xs border border-slate-100">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                              {b.providerSnapshot.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{b.providerSnapshot.fullName}</p>
                              <p className="text-[10px] text-slate-500">ভেরিফাইড সার্ভিস প্রোভাইডার</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            ★ {b.providerSnapshot.ratingAvg?.toFixed(1) || "5.0"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">মোট প্রদেয় বিল</span>
                        <span className="text-base font-extrabold text-brand-700">
                          {formatBDT(b.pricingSnapshot?.customerFinalAmount || 0)}
                        </span>
                      </div>

                      <Link
                        href={`/bookings/${b.bookingId}`}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold transition shadow-sm"
                      >
                        <span>লাইভ ট্র্যাকিং</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
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
