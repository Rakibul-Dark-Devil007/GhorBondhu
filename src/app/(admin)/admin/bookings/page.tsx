"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToAllBookings, getAllProviderApplications } from "@/lib/firebase/db";
import { formatBDT, formatMinutes, getBookingStatusBadge } from "@/lib/utils";
import { functions } from "@/lib/firebase/app";
import { httpsCallable } from "firebase/functions";
import type { Booking, ProviderApplication } from "@/types";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  Calendar,
  ArrowLeft,
  Search,
  User,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  ShieldCheck,
  Send,
  Eye,
  Filter
} from "lucide-react";

type FilterTab = "ALL" | "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [verifiedProviders, setVerifiedProviders] = useState<ProviderApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Assign Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAllBookings(
      (list) => {
        setBookings(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to load all bookings:", err);
        setIsLoading(false);
      }
    );

    // Fetch verified providers for assignment modal
    getAllProviderApplications("VERIFIED")
      .then((apps) => setVerifiedProviders(apps))
      .catch((err) => console.error("Failed to load verified providers:", err));

    return () => unsubscribe();
  }, []);

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    active: bookings.filter((b) =>
      ["PROVIDER_ACCEPTED", "PROVIDER_ASSIGNED", "ON_THE_WAY", "SERVICE_STARTED"].includes(b.status)
    ).length,
    completed: bookings.filter((b) =>
      ["SERVICE_COMPLETED", "CUSTOMER_CONFIRMED"].includes(b.status)
    ).length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "PENDING" && b.status !== "PENDING") return false;
    if (
      activeTab === "ACTIVE" &&
      !["PROVIDER_ACCEPTED", "PROVIDER_ASSIGNED", "ON_THE_WAY", "SERVICE_STARTED"].includes(b.status)
    )
      return false;
    if (
      activeTab === "COMPLETED" &&
      !["SERVICE_COMPLETED", "CUSTOMER_CONFIRMED"].includes(b.status)
    )
      return false;
    if (activeTab === "CANCELLED" && b.status !== "CANCELLED") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const num = b.bookingNumber?.toLowerCase().includes(q);
      const cust = b.customerSnapshot?.fullName?.toLowerCase().includes(q);
      const prov = b.providerSnapshot?.fullName?.toLowerCase().includes(q);
      const srv = b.serviceNameSnapshot?.bn?.toLowerCase().includes(q);
      const area = b.locationSnapshot?.area?.toLowerCase().includes(q);
      return num || cust || prov || srv || area;
    }

    return true;
  });

  const handleOpenAssign = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedProviderId(booking.providerId || (verifiedProviders[0]?.providerId || ""));
    setAdminNote("");
    setAssignError(null);
    setAssignSuccess(null);
  };

  const handleAssignProvider = async () => {
    if (!selectedBooking || !selectedProviderId) {
      setAssignError("অনুগ্রহ করে একজন ভেরিফাইড প্রোভাইডার নির্বাচন করুন।");
      return;
    }

    setAssignError(null);
    setIsAssigning(true);

    try {
      const assignFn = httpsCallable(functions, "adminAssignProvider");
      const res: any = await assignFn({
        bookingId: selectedBooking.bookingId,
        providerId: selectedProviderId,
        adminNote: adminNote.trim() || undefined,
      });

      if (res.data?.success) {
        setAssignSuccess(res.data.message);
        setTimeout(() => {
          setSelectedBooking(null);
        }, 1200);
      } else {
        throw new Error(res.data?.message || "অ্যাসাইন করতে ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      setAssignError(err.message || "একটি ত্রুটি হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Admin Navbar */}
        <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/admin-dashboard"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="font-bold text-white text-base">বুকিং ও ডিসপ্যাচ ম্যানেজমেন্ট</h1>
                <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                  অপারেশনস কন্ট্রোল
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <NotificationBell className="text-slate-300" />
              <Link
                href="/admin-dashboard"
                className="text-xs font-semibold text-slate-300 hover:text-amber-400 px-3 py-1.5 rounded-lg transition"
              >
                ড্যাশবোর্ড
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                সকল কাস্টমার বুকিং ও ডিসপ্যাচ
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                প্ল্যাটফর্মের সকল সার্ভিস অর্ডারের লাইভ প্রগ্রেস দেখুন এবং প্রয়োজনে প্রোভাইডার ম্যানুয়ালি অ্যাসাইন করুন।
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="বুকিং নম্বর, গ্রাহক বা প্রোভাইডার..."
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>সবগুলো</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "ALL" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === "PENDING"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>কর্মী বরাদ্দ বাকি</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "PENDING" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-700"
                }`}
              >
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === "ACTIVE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>চলমান সেবা</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "ACTIVE" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"
                }`}
              >
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === "COMPLETED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>সম্পন্ন</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "COMPLETED" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {counts.completed}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("CANCELLED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === "CANCELLED"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>বাতিলকৃত</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "CANCELLED" ? "bg-rose-700 text-white" : "bg-rose-50 text-rose-700"
                }`}
              >
                {counts.cancelled}
              </span>
            </button>
          </div>

          {/* Bookings Table */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
              <p className="text-xs">বুকিং তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-sm my-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">কোনো বুকিং পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 mt-1">
                আপনার নির্বাচিত ফিল্টারের সাথে মিল রেখে কোনো রেকর্ড খুঁজে পাওয়া যায়নি।
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">বুকিং নম্বর</th>
                      <th className="px-5 py-3.5">সার্ভিস ও সময়</th>
                      <th className="px-5 py-3.5">গ্রাহক ও এলাকা</th>
                      <th className="px-5 py-3.5">বরাদ্দকৃত কর্মী</th>
                      <th className="px-5 py-3.5">বিল</th>
                      <th className="px-5 py-3.5">স্ট্যাটাস</th>
                      <th className="px-5 py-3.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => {
                      const badge = getBookingStatusBadge(b.status);
                      const isUnassigned = !b.providerId || b.status === "PENDING";

                      return (
                        <tr key={b.bookingId} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {b.bookingNumber}
                            </span>
                            <span className="block text-[11px] text-slate-400 mt-1">
                              {b.createdAt ? new Date(b.createdAt).toLocaleDateString("bn-BD") : ""}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <strong className="text-slate-900 block font-bold">
                              {b.serviceNameSnapshot?.bn}
                            </strong>
                            <span className="text-[11px] text-slate-500">
                              {b.scheduledDate} ({b.scheduledStartTime})
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-800 block">
                              {b.customerSnapshot?.fullName || "গ্রাহক"}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {b.locationSnapshot?.area}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {b.providerSnapshot ? (
                              <div>
                                <span className="font-bold text-slate-900 flex items-center space-x-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{b.providerSnapshot.fullName}</span>
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {b.providerSnapshot.phoneNumber}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-amber-200">
                                কর্মী বাকি
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-extrabold text-brand-700 block">
                              {formatBDT(b.pricingSnapshot?.customerFinalAmount || 0)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              নেট কর্মী: {formatBDT(b.pricingSnapshot?.providerEarningAmount || 0)}
                            </span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {b.status !== "SERVICE_COMPLETED" && b.status !== "CANCELLED" ? (
                              <button
                                onClick={() => handleOpenAssign(b)}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
                              >
                                {isUnassigned ? "কর্মী অ্যাসাইন" : "পরিবর্তন"}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">নিষ্পন্ন</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Admin Provider Assignment Modal */}
          {selectedBooking && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      ম্যানুয়াল ডিসপ্যাচ
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1">
                      {selectedBooking.serviceNameSnapshot?.bn} ({selectedBooking.bookingNumber})
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span>গ্রাহকের এলাকা:</span>
                    <strong className="text-slate-900">{selectedBooking.locationSnapshot?.area}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>তারিখ ও সময়:</span>
                    <strong className="text-slate-900">{selectedBooking.scheduledDate} ({selectedBooking.scheduledStartTime})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>প্রোভাইডার নেট আয়:</span>
                    <strong className="text-emerald-700">{formatBDT(selectedBooking.pricingSnapshot?.providerEarningAmount || 0)}</strong>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      ভেরিফাইড প্রোভাইডার নির্বাচন করুন:
                    </label>
                    <select
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                    >
                      <option value="">-- প্রোভাইডার বেছে নিন --</option>
                      {verifiedProviders.map((prov) => (
                        <option key={prov.providerId} value={prov.providerId}>
                          {prov.fullName} ({prov.phoneNumber}) — {prov.selectedAreas?.join(", ") || "সকল এলাকা"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      অ্যাডমিন নোট (ঐচ্ছিক):
                    </label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="যেমন: জরুরি ভিত্তিতে নিকটস্থ কর্মী অ্যাসাইন করা হলো"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  {assignError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {assignError}
                    </div>
                  )}

                  {assignSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      {assignSuccess}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    disabled={isAssigning}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
                  >
                    বাতিল
                  </button>

                  <button
                    type="button"
                    onClick={handleAssignProvider}
                    disabled={isAssigning || !selectedProviderId}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>অ্যাসাইন হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>কর্মী বরাদ্দ নিশ্চিত করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
