"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/firebase/auth";
import { subscribeToCustomerBookings, getCustomerAddresses } from "@/lib/firebase/db";
import { formatBDT, formatMinutes, getBookingStatusBadge } from "@/lib/utils";
import Link from "next/link";
import { 
  Sparkles, 
  LogOut, 
  Calendar, 
  MapPin, 
  Clock, 
  PlusCircle, 
  ShoppingBag,
  ChevronRight,
  Loader2,
  ArrowRight,
  ListOrdered
} from "lucide-react";
import type { Booking } from "@/types";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function CustomerDashboardPage() {
  const { profile, firebaseUser } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [addressCount, setAddressCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    setIsLoading(true);

    // Subscribe to real-time bookings
    const unsubscribe = subscribeToCustomerBookings(
      firebaseUser.uid,
      (list) => {
        setBookings(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to load customer bookings:", err);
        setIsLoading(false);
      }
    );

    // Fetch address count
    getCustomerAddresses(firebaseUser.uid)
      .then((addrs) => setAddressCount(addrs.length))
      .catch((err) => console.error("Failed to load addresses:", err));

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  const activeBookings = bookings.filter((b) =>
    ["PENDING", "PROVIDER_ASSIGNED", "PROVIDER_ACCEPTED", "ON_THE_WAY", "SERVICE_STARTED"].includes(b.status)
  );

  const completedBookings = bookings.filter((b) =>
    ["SERVICE_COMPLETED", "CUSTOMER_CONFIRMED"].includes(b.status)
  );

  const recentBookings = bookings.slice(0, 3);

  return (
    <AuthGuard allowedRoles={["CUSTOMER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-lg">GhorBondhu</span>
            </Link>

            <div className="flex items-center space-x-4">
              <Link
                href="/bookings"
                className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg transition"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>আমার বুকিংসমূহ</span>
              </Link>

              <NotificationBell />

              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">
                  {profile?.email || firebaseUser?.email}
                </p>
                <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  কাস্টমার অ্যাকাউন্ট
                </span>
              </div>
              <button
                onClick={() => logoutUser()}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="লগআউট"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                স্বাগতম, {profile?.email?.split("@")[0] || "সম্মানিত গ্রাহক"}!
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                আপনার গৃহস্থালী সার্ভিসের সময়সূচি ও রিয়েল-টাইম বুকিং ট্র্যাক করুন।
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/bookings"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm transition"
              >
                <ListOrdered className="w-4 h-4 text-slate-400" />
                <span>সব বুকিং তালিকা</span>
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>নতুন সেবা বুক করুন</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <Link
              href="/bookings"
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:border-brand-300 transition group"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-105 transition">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">চলমান বুকিং</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {isLoading ? "..." : activeBookings.length}
                </p>
              </div>
            </Link>

            <Link
              href="/bookings"
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:border-emerald-300 transition group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">সম্পন্ন সেবা</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {isLoading ? "..." : completedBookings.length}
                </p>
              </div>
            </Link>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">সেভ করা ঠিকানা</p>
                <p className="text-2xl font-extrabold text-slate-900">{addressCount}</p>
              </div>
            </div>
          </div>

          {/* Recent Bookings or Empty State */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-bold text-slate-900">সাম্প্রতিক বুকিং অ্যাক্টিভিটি</h2>
              </div>
              {bookings.length > 0 && (
                <Link
                  href="/bookings"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
                >
                  <span>সবগুলো দেখুন ({bookings.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
                <p className="text-xs">বুকিংয়ের বিবরণ প্রস্তুত হচ্ছে...</p>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">কোনো চলমান বুকিং নেই</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  আপনার বাসা বা অফিসের পরিচ্ছন্নতা, রান্না বা লন্ড্রির জন্য এখনই একজন বিশ্বস্ত সাহায্যকারী বুক করুন।
                </p>
                <div className="mt-5">
                  <Link
                    href="/services"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    <span>উপলব্ধ সার্ভিস দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentBookings.map((b) => {
                  const badge = getBookingStatusBadge(b.status);
                  return (
                    <div
                      key={b.bookingId}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                            {b.bookingNumber}
                          </span>
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {b.serviceNameSnapshot?.bn || "হোম সার্ভিস"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>📅 {b.scheduledDate}</span>
                          <span>⏰ {b.scheduledStartTime} ({formatMinutes(b.selectedDurationMinutes)})</span>
                          <span>📍 {b.locationSnapshot?.area}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">প্রদেয় বিল</span>
                          <span className="text-sm font-extrabold text-brand-700">
                            {formatBDT(b.pricingSnapshot?.customerFinalAmount || 0)}
                          </span>
                        </div>

                        <Link
                          href={`/bookings/${b.bookingId}`}
                          className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold transition shadow-sm"
                        >
                          <span>ট্র্যাক করুন</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
