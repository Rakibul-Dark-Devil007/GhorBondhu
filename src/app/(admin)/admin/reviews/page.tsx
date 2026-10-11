"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToAllReviews } from "@/lib/firebase/db";
import type { Review } from "@/types";
import {
  Star,
  ArrowLeft,
  Search,
  Filter,
  Loader2,
  Calendar,
  User,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  CheckCircle2
} from "lucide-react";

export default function AdminReviewsPage() {
  const { profile } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "ALL">("ALL");

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAllReviews(
      (data) => {
        setReviews(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe to reviews:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered reviews
  const filteredReviews = reviews.filter((rev) => {
    // Rating filter
    if (ratingFilter !== "ALL" && rev.rating !== ratingFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCustomer = rev.customerName?.toLowerCase().includes(q);
      const matchProvider = (rev.providerName || "").toLowerCase().includes(q);
      const matchBooking = rev.bookingNumber?.toLowerCase().includes(q);
      const matchComment = rev.comment?.toLowerCase().includes(q);
      const matchService =
        rev.serviceNameBn?.toLowerCase().includes(q) ||
        rev.serviceName?.bn?.toLowerCase().includes(q) ||
        rev.serviceName?.en?.toLowerCase().includes(q);

      return matchCustomer || matchProvider || matchBooking || matchComment || matchService;
    }

    return true;
  });

  // Metrics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : "5.0";
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const lowRatingCount = reviews.filter((r) => r.rating <= 2).length;

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Admin Navigation */}
        <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/admin-dashboard"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="ড্যাশবোর্ডে ফিরুন"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <span className="font-bold text-white text-base">কাস্টমার রিভিউ ও রেটিং মনিটরিং</span>
                <span className="block text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                  Quality Assurance & Moderation Console
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <span className="hidden sm:inline">অ্যাডমিন কনসোল</span>
              <span className="font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                {profile?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
          {/* Header & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
                <span>গ্রাহক রেটিং ও কোয়ালিটি কন্ট্রোল</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                গ্রাহকদের সরাসরি মূল্যায়ন, সেবা সন্তুষ্টি এবং প্রোভাইডারদের কাজের মান পর্যবেক্ষণ করুন।
              </p>
            </div>

            <Link
              href="/admin/bookings"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm self-start sm:self-auto flex items-center space-x-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>বুকিং ব্যবস্থাপনা</span>
            </Link>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">মোট রিভিউ</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-3">{totalReviews} টি</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">প্ল্যাটফর্ম গড় রেটিং</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-3">★ {avgRating}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">৫-স্টার রেটিং</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-3">
                {fiveStarCount} টি{" "}
                <span className="text-xs text-slate-400 font-normal">
                  ({totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 0}%)
                </span>
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">অসন্তোষজনক (≤ ২ স্টার)</span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-3">{lowRatingCount} টি</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="গ্রাহকের নাম, কর্মীর নাম, বুকিং নম্বর বা মন্তব্য লিখে খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Rating Filters */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setRatingFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    ratingFilter === "ALL"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  সব রেটিং ({reviews.length})
                </button>

                {[5, 4, 3, 2, 1].map((r) => {
                  const count = reviews.filter((item) => item.rating === r).length;
                  return (
                    <button
                      key={r}
                      onClick={() => setRatingFilter(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-1 ${
                        ratingFilter === r
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>★ {r}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">রিভিউ ডেটা লোড হচ্ছে...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-sm">
              <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">কোনো রিভিউ পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || ratingFilter !== "ALL"
                  ? "নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো রিভিউ পাওয়া যায়নি।"
                  : "এখনো প্ল্যাটফর্মে কোনো বুকিং রিভিউ জমা পড়েনি।"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.reviewId || rev.id || rev.bookingId}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-amber-300 transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Booking & Rating */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                          #{rev.bookingNumber}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 mt-1.5">
                          {rev.serviceName?.bn || rev.serviceNameBn || "সার্ভিস"}
                        </h4>
                      </div>

                      <div className="flex items-center text-amber-400 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                        <span className="text-xs font-black text-slate-800 ml-1.5">
                          {rev.rating}.0
                        </span>
                      </div>
                    </div>

                    {/* Parties: Customer & Provider */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">গ্রাহক:</span>
                        <strong className="text-slate-800 font-semibold">{rev.customerName || "অজ্ঞাত"}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">প্রোভাইডার:</span>
                        <strong className="text-slate-800 font-semibold">{rev.providerName || "অজ্ঞাত"}</strong>
                      </div>
                    </div>

                    {/* Tags */}
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rev.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100"
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Comment */}
                    {rev.comment ? (
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 italic leading-relaxed">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">কোনো লিখিত মন্তব্য প্রদান করা হয়নি।</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {new Date(rev.createdAt).toLocaleDateString("bn-BD", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ভেরিফাইড অর্ডার</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
