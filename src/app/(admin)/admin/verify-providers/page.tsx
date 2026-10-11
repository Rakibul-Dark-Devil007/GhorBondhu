"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToAllProviderApplications } from "@/lib/firebase/db";
import { functions } from "@/lib/firebase/app";
import { httpsCallable } from "firebase/functions";
import type { ProviderApplication, ProviderVerificationStatus } from "@/types";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  FileText,
  Loader2,
  AlertCircle,
  Eye,
  Check,
  ChevronRight,
  ExternalLink
} from "lucide-react";

type FilterTab = "UNDER_REVIEW" | "ALL" | "VERIFIED" | "REJECTED";

export default function AdminVerifyProvidersPage() {
  const { claims } = useAuthStore();
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("UNDER_REVIEW");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Modal State
  const [selectedApp, setSelectedApp] = useState<ProviderApplication | null>(null);
  const [decision, setDecision] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [reviewNotes, setReviewNotes] = useState("সকল তথ্য ও এনআইডি সঠিক পাওয়া গেছে।");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Image Zoom Modal
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAllProviderApplications(
      (list) => {
        setApplications(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to load provider applications:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const counts = {
    underReview: applications.filter((a) => a.status === "UNDER_REVIEW").length,
    all: applications.length,
    verified: applications.filter((a) => a.status === "VERIFIED").length,
    rejected: applications.filter((a) => a.status === "REJECTED").length,
  };

  const filteredApps = applications.filter((app) => {
    if (activeTab === "UNDER_REVIEW" && app.status !== "UNDER_REVIEW") return false;
    if (activeTab === "VERIFIED" && app.status !== "VERIFIED") return false;
    if (activeTab === "REJECTED" && app.status !== "REJECTED") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.fullName?.toLowerCase().includes(q);
      const matchPhone = app.phoneNumber?.toLowerCase().includes(q);
      const matchNid = app.nidNumber?.toLowerCase().includes(q);
      return matchName || matchPhone || matchNid;
    }

    return true;
  });

  const handleOpenReview = (app: ProviderApplication) => {
    setSelectedApp(app);
    setDecision("VERIFIED");
    setReviewNotes("সকল তথ্য ও এনআইডি যাচাই করে সঠিক পাওয়া গেছে।");
    setReviewError(null);
    setReviewSuccess(null);
  };

  const handleSubmitReview = async () => {
    if (!selectedApp) return;
    if (!reviewNotes.trim()) {
      setReviewError("পর্যালোচনা নোট বা কারণ লেখা বাধ্যতামূলক।");
      return;
    }

    setReviewError(null);
    setIsSubmittingReview(true);

    try {
      const reviewFn = httpsCallable(functions, "reviewProviderApplication");
      const res: any = await reviewFn({
        providerId: selectedApp.providerId,
        decision,
        reviewNotes: reviewNotes.trim(),
      });

      if (res.data?.success) {
        setReviewSuccess(res.data.message);
        setTimeout(() => {
          setSelectedApp(null);
        }, 1200);
      } else {
        throw new Error(res.data?.message || "সিদ্ধান্ত সম্পন্ন করা যায়নি।");
      }
    } catch (err: any) {
      setReviewError(err.message || "একটি ত্রুটি হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <PermissionGate permission="canVerifyProviders">
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Top Admin Navbar */}
          <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link
                  href="/admin-dashboard"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="অ্যাডমিন ড্যাশবোর্ডে ফিরুন"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="font-bold text-white text-base">প্রোভাইডার কেওয়াইসি কিউ</h1>
                  <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                    এনআইডি ও ব্যাকগ্রাউন্ড ভেরিফিকেশন
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
                <Link
                  href="/admin/users"
                  className="text-xs font-semibold text-slate-300 hover:text-amber-400 px-3 py-1.5 rounded-lg transition"
                >
                  ইউজার ডিরেক্টরি
                </Link>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  সার্ভিস প্রোভাইডার যাচাইকরণ কিউ
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  নতুন রেজিস্টার্ড কর্মীদের জাতীয় পরিচয়পত্র ও ব্যক্তিগত তথ্য যাচাই করে অনুমোদন বা প্রত্যাখ্যান করুন।
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="নাম, ফোন বা NID দিয়ে খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab("UNDER_REVIEW")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === "UNDER_REVIEW"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>অপেক্ষমাণ আবেদন</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === "UNDER_REVIEW" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {counts.underReview}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>সব আবেদন</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === "ALL" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("VERIFIED")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === "VERIFIED"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>অনুমোদিত</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === "VERIFIED" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {counts.verified}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("REJECTED")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === "REJECTED"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>বাতিলকৃত</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === "REJECTED" ? "bg-rose-700 text-white" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {counts.rejected}
                </span>
              </button>
            </div>

            {/* Application List */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
                <p className="text-xs">কেওয়াইসি আবেদন তালিকা প্রস্তুত হচ্ছে...</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-sm my-8">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">কোনো আবেদন অপেক্ষমাণ নেই</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery
                    ? "আপনার অনুসন্ধানের সাথে মিল রেখে কোনো আবেদন পাওয়া যায়নি।"
                    : "এই মুহূর্তে পর্যালোচনার জন্য কোনো নতুন প্রোভাইডার আবেদন নেই।"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredApps.map((app) => {
                  const isUnderReview = app.status === "UNDER_REVIEW";
                  const isVerified = app.status === "VERIFIED";
                  const isRejected = app.status === "REJECTED";

                  return (
                    <div
                      key={app.applicationId}
                      className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Card Header */}
                        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shadow-inner">
                              {app.fullName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{app.fullName}</h3>
                              <p className="text-[11px] text-slate-400">{app.phoneNumber}</p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isUnderReview
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : isVerified
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isUnderReview
                                  ? "bg-amber-500 animate-ping"
                                  : isVerified
                                  ? "bg-emerald-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            <span>
                              {isUnderReview ? "অপেক্ষমাণ" : isVerified ? "অনুমোদিত" : "প্রত্যাখ্যাত"}
                            </span>
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="py-3 space-y-2 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">এনআইডি নম্বর:</span>
                            <span className="font-mono font-bold text-slate-800">{app.nidNumber}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">অভিজ্ঞতা:</span>
                            <span className="font-semibold text-slate-800">{app.yearsOfExperience} বছর</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">বর্তমান এলাকা:</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                              {app.presentAddress}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">আবেদনের তারিখ:</span>
                            <span className="text-slate-500 text-[11px]">
                              {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("bn-BD") : ""}
                            </span>
                          </div>
                        </div>

                        {/* Document Previews Mini */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          {app.nidFrontUrl && (
                            <button
                              type="button"
                              onClick={() => setViewingImage(app.nidFrontUrl)}
                              className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group text-left"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={app.nidFrontUrl} alt="NID Front" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-bold">
                                NID Front
                              </div>
                            </button>
                          )}
                          {app.nidBackUrl && (
                            <button
                              type="button"
                              onClick={() => setViewingImage(app.nidBackUrl)}
                              className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group text-left"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={app.nidBackUrl} alt="NID Back" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-bold">
                                NID Back
                              </div>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Action Button */}
                      <div className="pt-4 border-t border-slate-100 mt-4">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(app)}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>আবেদন পর্যালোচনা ও সিদ্ধান্ত</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* Full Review & Decision Modal */}
          {selectedApp && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95">
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      কেওয়াইসি ভেরিফিকেশন প্যানেল
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                      {selectedApp.fullName}
                    </h3>
                    <p className="text-xs text-slate-500">ফোন: {selectedApp.phoneNumber}</p>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                {/* NID Documents View */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    জাতীয় পরিচয়পত্র (NID) ডকুমেন্টস
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">সামনের অংশ:</span>
                      <div
                        onClick={() => setViewingImage(selectedApp.nidFrontUrl)}
                        className="cursor-pointer aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedApp.nidFrontUrl}
                          alt="NID Front"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                          বড় করে দেখুন 🔍
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">পেছনের অংশ:</span>
                      <div
                        onClick={() => setViewingImage(selectedApp.nidBackUrl)}
                        className="cursor-pointer aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedApp.nidBackUrl}
                          alt="NID Back"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                          বড় করে দেখুন 🔍
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Applicant Profile Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-medium">এনআইডি নম্বর</span>
                    <strong className="font-mono text-slate-900 text-sm">{selectedApp.nidNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">জন্মতারিখ ও লিঙ্গ</span>
                    <strong className="text-slate-900">{selectedApp.dateOfBirth} ({selectedApp.gender})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">বর্তমান ঠিকানা</span>
                    <strong className="text-slate-900">{selectedApp.presentAddress}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">স্থায়ী ঠিকানা</span>
                    <strong className="text-slate-900">{selectedApp.permanentAddress}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">জরুরি অভিভাবক ও সম্পর্ক</span>
                    <strong className="text-slate-900">{selectedApp.emergencyContactName} ({selectedApp.emergencyContactRelation})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">অভিভাবকের ফোন নম্বর</span>
                    <strong className="text-slate-900">{selectedApp.emergencyContactPhone}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block font-medium">কাজের অভিজ্ঞতা ও দক্ষতা</span>
                    <p className="text-slate-800 mt-0.5">
                      {selectedApp.yearsOfExperience} বছর অভিজ্ঞতা — {selectedApp.experienceDescription || "কোনো অতিরিক্ত নোট দেওয়া হয়নি"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block font-medium">নির্বাচিত কাজের ক্ষেত্র ও এলাকা</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedApp.selectedServices?.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {s}
                        </span>
                      ))}
                      {selectedApp.selectedAreas?.map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Action Form */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    ভেরিফিকেশন সিদ্ধান্ত নির্বাচন করুন
                  </h4>

                  {/* Decision Radio/Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDecision("VERIFIED");
                        setReviewNotes("সকল তথ্য ও এনআইডি যাচাই করে সঠিক পাওয়া গেছে।");
                      }}
                      className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                        decision === "VERIFIED"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>অনুমোদন করুন (VERIFIED)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDecision("REJECTED");
                        setReviewNotes("এনআইডি ছবি অস্পষ্ট, অনুগ্রহ করে পরিষ্কার ছবি দিয়ে পুনরায় আবেদন করুন।");
                      }}
                      className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                        decision === "REJECTED"
                          ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>প্রত্যাখ্যান করুন (REJECTED)</span>
                    </button>
                  </div>

                  {/* Review Notes */}
                  <div>
                    <label className="block text-slate-700 font-semibold text-xs mb-1.5">
                      পর্যালোচনা নোট / প্রোভাইডারের জন্য বার্তা (বাধ্যতামূলক):
                    </label>
                    <textarea
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="সিদ্ধান্তের কারণ বা নোট লিখুন..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  {reviewError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {reviewError}
                    </div>
                  )}

                  {reviewSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      {reviewSuccess}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(null)}
                      disabled={isSubmittingReview}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
                    >
                      বাতিল
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview || !reviewNotes.trim()}
                      className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 ${
                        decision === "VERIFIED"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                          : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                      }`}
                    >
                      {isSubmittingReview ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>প্রক্রিয়াধীন...</span>
                        </>
                      ) : (
                        <span>সিদ্ধান্ত নিশ্চিত করুন</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Image Preview Modal */}
          {viewingImage && (
            <div
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setViewingImage(null)}
            >
              <div className="relative max-w-3xl max-h-[85vh] w-full flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewingImage}
                  alt="Document View"
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
                />
                <button
                  onClick={() => setViewingImage(null)}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </PermissionGate>
    </AuthGuard>
  );
}
