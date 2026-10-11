"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToProviderApplication, getServices, getCategories } from "@/lib/firebase/db";
import { ProviderKycSubmissionSchema } from "@/lib/validators/providerKyc";
import { functions } from "@/lib/firebase/app";
import { httpsCallable } from "firebase/functions";
import type { ProviderApplication, ServiceItem, ServiceCategory } from "@/types";
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Upload,
  User,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  FileText,
  Loader2,
  Check,
  ChevronRight,
  AlertCircle,
  Eye
} from "lucide-react";

const AVAILABLE_AREAS = [
  "ধানমন্ডি (Dhanmondi)",
  "গুলশান (Gulshan)",
  "বনানী (Banani)",
  "উত্তরা (Uttara)",
  "মিরপুর (Mirpur)",
  "মোহাম্মদপুর (Mohammadpur)",
  "বসুন্ধরা (Bashundhara)",
  "বাড্ডা (Badda)",
  "মগবাজার (Moghbazar)",
  "খিলগাঁও (Khilgaon)",
  "মালিবাগ ও রামপুরা",
  "লালমাটিয়া",
];

const DEFAULT_SERVICES = [
  { id: "house-cleaning", label: "বাসা ও রুম ক্লিনিং (House Cleaning)" },
  { id: "kitchen-cleaning", label: "কিচেন ও থালাবাসন ক্লিনিং (Kitchen Cleaning)" },
  { id: "bathroom-cleaning", label: "বাথরুম ক্লিনিং (Bathroom Cleaning)" },
  { id: "laundry-ironing", label: "লন্ড্রি ও কাপড় ইস্ত্রি (Laundry & Ironing)" },
  { id: "cooking-assistance", label: "রান্নায় সাহায্য (Cooking Assistance)" },
  { id: "elderly-help", label: "বয়োবৃদ্ধদের সাহায্য (Elderly Assistance)" },
  { id: "deep-cleaning", label: "ডিপ ও মুভিং ক্লিনিং (Deep Cleaning)" },
];

export default function ProviderVerificationPage() {
  const router = useRouter();
  const { firebaseUser, profile } = useAuthStore();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    nidNumber: "",
    dateOfBirth: "1995-01-01",
    gender: "FEMALE" as "MALE" | "FEMALE" | "OTHER",
    presentAddress: "",
    permanentAddress: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "স্বামী / অভিভাবক",
    yearsOfExperience: 2,
    experienceDescription: "",
    nidFrontUrl: "",
    nidBackUrl: "",
    profilePhotoUrl: "",
    selectedServices: ["house-cleaning", "kitchen-cleaning"] as string[],
    selectedAreas: ["ধানমন্ডি (Dhanmondi)"] as string[],
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    setIsLoading(true);
    const unsubscribe = subscribeToProviderApplication(
      firebaseUser.uid,
      (app) => {
        setApplication(app);
        if (app) {
          // Pre-fill form if existing
          setFormData((prev) => ({
            ...prev,
            fullName: app.fullName || prev.fullName,
            phoneNumber: app.phoneNumber || prev.phoneNumber,
            nidNumber: app.nidNumber || prev.nidNumber,
            dateOfBirth: app.dateOfBirth || prev.dateOfBirth,
            gender: app.gender || prev.gender,
            presentAddress: app.presentAddress || prev.presentAddress,
            permanentAddress: app.permanentAddress || prev.permanentAddress,
            emergencyContactName: app.emergencyContactName || prev.emergencyContactName,
            emergencyContactPhone: app.emergencyContactPhone || prev.emergencyContactPhone,
            emergencyContactRelation: app.emergencyContactRelation || prev.emergencyContactRelation,
            yearsOfExperience: app.yearsOfExperience ?? prev.yearsOfExperience,
            experienceDescription: app.experienceDescription || prev.experienceDescription,
            nidFrontUrl: app.nidFrontUrl || prev.nidFrontUrl,
            nidBackUrl: app.nidBackUrl || prev.nidBackUrl,
            profilePhotoUrl: app.profilePhotoUrl || prev.profilePhotoUrl,
            selectedServices: app.selectedServices?.length ? app.selectedServices : prev.selectedServices,
            selectedAreas: app.selectedAreas?.length ? app.selectedAreas : prev.selectedAreas,
          }));
        } else if (profile) {
          setFormData((prev) => ({
            ...prev,
            phoneNumber: (profile as any).phoneNumber || "",
          }));
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to fetch provider application:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid, profile]);

  // Image Upload Handler (reads to base64 data-URL for instant preview & zero-setup upload)
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: "nidFrontUrl" | "nidBackUrl" | "profilePhotoUrl"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট (2MB) হতে হবে।");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        [targetField]: dataUrl,
      }));
      setFieldErrors((prev) => ({ ...prev, [targetField]: "" }));
    };
    reader.readAsDataURL(file);
  };

  const toggleService = (id: string) => {
    setFormData((prev) => {
      const exists = prev.selectedServices.includes(id);
      return {
        ...prev,
        selectedServices: exists
          ? prev.selectedServices.filter((s) => s !== id)
          : [...prev.selectedServices, id],
      };
    });
  };

  const toggleArea = (area: string) => {
    setFormData((prev) => {
      const exists = prev.selectedAreas.includes(area);
      return {
        ...prev,
        selectedAreas: exists
          ? prev.selectedAreas.filter((a) => a !== area)
          : [...prev.selectedAreas, area],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setFieldErrors({});

    const validation = ProviderKycSubmissionSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      setSubmitError("অনুগ্রহ করে ফর্মের চিহ্নিত ভুলগুলো সংশোধন করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const submitKycFn = httpsCallable(functions, "submitProviderKyc");
      const res: any = await submitKycFn(formData);

      if (res.data?.success) {
        setSubmitSuccess("আপনার আবেদন সফলভাবে জমা হয়েছে! অ্যাডমিন টিম যাচাই করছে।");
      } else {
        throw new Error(res.data?.message || "আবেদন জমা দিতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      setSubmitError(err.message || "একটি ত্রুটি হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">ভেরিফিকেশন পেজ লোড হচ্ছে...</p>
      </div>
    );
  }

  const currentStatus = application?.status || "PENDING";

  return (
    <AuthGuard allowedRoles={["PROVIDER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/provider-dashboard"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                title="ড্যাশবোর্ডে ফিরে যান"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-base">GhorBondhu পার্টনার ভেরিফিকেশন</span>
              </div>
            </div>

            <Link
              href="/provider-dashboard"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-600 px-3 py-1.5 rounded-lg transition"
            >
              ড্যাশবোর্ড
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
          {/* Header Description */}
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              পরিচয়পত্র (NID) ও ব্যাকগ্রাউন্ড যাচাই
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              গ্রাহকের নিরাপত্তা এবং প্ল্যাটফর্মের মান বজায় রাখতে প্রতিটি কর্মীর জাতীয় পরিচয়পত্র ও ব্যক্তিগত তথ্য যাচাই বাধ্যতামূলক।
            </p>
          </div>

          {/* VERIFIED State Card */}
          {currentStatus === "VERIFIED" && (
            <div className="bg-white rounded-3xl border border-emerald-200 p-8 text-center shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">অভিনন্দন! আপনার অ্যাকাউন্ট ভেরিফাইড</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                আপনার জাতীয় পরিচয়পত্র ও ব্যক্তিগত তথ্য অ্যাডমিন টিম দ্বারা সফলভাবে অনুমোদিত হয়েছে। আপনি এখন এলাকাভিত্তিক সরাসরি গ্রাহকদের বুকিং গ্রহণ করতে পারেন।
              </p>
              <div className="pt-4">
                <Link
                  href="/provider-dashboard"
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                >
                  <span>প্রোভাইডার ড্যাশবোর্ডে যান</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* UNDER_REVIEW State Card */}
          {currentStatus === "UNDER_REVIEW" && (
            <div className="bg-white rounded-3xl border border-blue-200 p-8 shadow-sm space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <span>যাচাইকরণ প্রক্রিয়াধীন</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    আপনার কেওয়াইসি আবেদন পর্যালোচনার জন্য জমা হয়েছে
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    আমাদের ভেরিফিকেশন টিম আপনার জমা দেওয়া এনআইডি ও তথ্য খতিয়ে দেখছে। সাধারণ ২৪ ঘণ্টার মধ্যে অনুমোদন বা মতামত প্রদান করা হবে।
                  </p>
                </div>
              </div>

              {/* Submitted Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">আবেদনকারীর নাম</span>
                  <span className="font-bold text-slate-800">{application?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">এনআইডি নম্বর</span>
                  <span className="font-mono font-bold text-slate-800">{application?.nidNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">জরুরি অভিভাবকের নাম ও ফোন</span>
                  <span className="font-bold text-slate-800">
                    {application?.emergencyContactName} ({application?.emergencyContactRelation}) - {application?.emergencyContactPhone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">নির্বাচিত কাজের ক্ষেত্র</span>
                  <span className="font-bold text-slate-800">
                    {application?.selectedServices?.length || 0} টি সার্ভিস, {application?.selectedAreas?.length || 0} টি এলাকা
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-[11px] text-slate-400">
                  জমা দেওয়ার তারিখ: {application?.submittedAt ? new Date(application.submittedAt).toLocaleDateString("bn-BD") : ""}
                </p>
                <Link
                  href="/provider-dashboard"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  ড্যাশবোর্ডে ফিরুন
                </Link>
              </div>
            </div>
          )}

          {/* REJECTED Banner (Visible only if status is REJECTED) */}
          {currentStatus === "REJECTED" && (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-sm flex items-start space-x-4 text-rose-900">
              <AlertCircle className="w-8 h-8 text-rose-600 shrink-0 mt-1" />
              <div className="text-xs space-y-2 flex-1">
                <h3 className="text-base font-bold text-rose-950">
                  আপনার পূর্ববর্তী আবেদনটি প্রত্যাখ্যাত হয়েছে
                </h3>
                {application?.reviewNotes && (
                  <div className="bg-white/80 p-3 rounded-xl border border-rose-200 font-medium">
                    অ্যাডমিনের কারণ: <span className="font-bold">{application.reviewNotes}</span>
                  </div>
                )}
                <p className="text-rose-800">
                  দয়া করে নিচের ফর্মে আপনার ভুল তথ্য বা অস্পষ্ট এনআইডি ছবি পরিবর্তন করে পুনরায় জমা দিন।
                </p>
              </div>
            </div>
          )}

          {/* Submission Form (Shown when PENDING, REJECTED, or if user wants to update) */}
          {(currentStatus === "PENDING" || currentStatus === "REJECTED") && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {submitError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* 1. Personal Information */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">১. ব্যক্তিগত তথ্য</h2>
                    <p className="text-xs text-slate-500">আপনার জাতীয় পরিচয়পত্র অনুযায়ী সঠিক নাম ও ঠিকানা দিন</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      পূর্ণ নাম (NID অনুযায়ী) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        setFieldErrors({ ...fieldErrors, fullName: "" });
                      }}
                      placeholder="যেমন: মোসাঃ খাদিজা বেগম"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.fullName && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      মোবাইল নম্বর <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, phoneNumber: e.target.value });
                        setFieldErrors({ ...fieldErrors, phoneNumber: "" });
                      }}
                      placeholder="০১৭xxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.phoneNumber && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.phoneNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      জন্মতারিখ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      লিঙ্গ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="FEMALE">মহিলা (Female)</option>
                      <option value="MALE">পুরুষ (Male)</option>
                      <option value="OTHER">অন্যান্য (Other)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      বর্তমান ঠিকানা (যেখানে এখন বসবাস করছেন) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.presentAddress}
                      onChange={(e) => {
                        setFormData({ ...formData, presentAddress: e.target.value });
                        setFieldErrors({ ...fieldErrors, presentAddress: "" });
                      }}
                      placeholder="বাড়ি নং, রোড নং, এলাকা, ঢাকা"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.presentAddress && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.presentAddress}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      স্থায়ী ঠিকানা (গ্রামের বাড়ি/পৈত্রিক ঠিকানা) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.permanentAddress}
                      onChange={(e) => {
                        setFormData({ ...formData, permanentAddress: e.target.value });
                        setFieldErrors({ ...fieldErrors, permanentAddress: "" });
                      }}
                      placeholder="গ্রাম/ওয়ার্ড, ডাকঘর, উপজেলা/থানা, জেলা"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.permanentAddress && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.permanentAddress}</p>}
                  </div>
                </div>
              </div>

              {/* 2. NID Upload & Document Verification */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">২. জাতীয় পরিচয়পত্র (NID)</h2>
                    <p className="text-xs text-slate-500">পরিষ্কার ও স্পষ্ট ছবি আপলোড করুন</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      এনআইডি নম্বর (১০, ১৩ বা ১৭ ডিজিট) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nidNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, nidNumber: e.target.value });
                        setFieldErrors({ ...fieldErrors, nidNumber: "" });
                      }}
                      placeholder="যেমন: 19852691234567890"
                      className="w-full sm:w-80 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.nidNumber && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.nidNumber}</p>}
                  </div>

                  {/* NID Front & Back Upload Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* NID Front */}
                    <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-800 mb-2">
                        এনআইডি সামনের অংশের ছবি <span className="text-rose-500">*</span>
                      </span>

                      {formData.nidFrontUrl ? (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formData.nidFrontUrl}
                            alt="NID Front Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <label className="cursor-pointer px-3 py-1.5 bg-white text-slate-900 font-bold text-[11px] rounded-lg shadow">
                              ছবি পরিবর্তন করুন
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, "nidFrontUrl")}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center py-6 px-4">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-semibold text-emerald-700">ছবি নির্বাচন করুন</span>
                          <span className="text-[10px] text-slate-400 mt-1">PNG, JPG সর্বোচ্চ 2MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, "nidFrontUrl")}
                            className="hidden"
                          />
                        </label>
                      )}
                      {fieldErrors.nidFrontUrl && <p className="text-rose-500 text-[11px] mt-2">{fieldErrors.nidFrontUrl}</p>}
                    </div>

                    {/* NID Back */}
                    <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-800 mb-2">
                        এনআইডি পেছনের অংশের ছবি <span className="text-rose-500">*</span>
                      </span>

                      {formData.nidBackUrl ? (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formData.nidBackUrl}
                            alt="NID Back Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <label className="cursor-pointer px-3 py-1.5 bg-white text-slate-900 font-bold text-[11px] rounded-lg shadow">
                              ছবি পরিবর্তন করুন
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, "nidBackUrl")}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center py-6 px-4">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-semibold text-emerald-700">ছবি নির্বাচন করুন</span>
                          <span className="text-[10px] text-slate-400 mt-1">PNG, JPG সর্বোচ্চ 2MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, "nidBackUrl")}
                            className="hidden"
                          />
                        </label>
                      )}
                      {fieldErrors.nidBackUrl && <p className="text-rose-500 text-[11px] mt-2">{fieldErrors.nidBackUrl}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Emergency Contact */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">৩. জরুরি অভিভাবক / রেফারেন্স</h2>
                    <p className="text-xs text-slate-500">জরুরি প্রয়োজনে যোগাযোগের জন্য অভিভাবকের সঠিক বিবরণ দিন</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      অভিভাবকের নাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => {
                        setFormData({ ...formData, emergencyContactName: e.target.value });
                        setFieldErrors({ ...fieldErrors, emergencyContactName: "" });
                      }}
                      placeholder="যেমন: মোশাররফ হোসেন"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.emergencyContactName && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.emergencyContactName}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      সম্পর্ক <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactRelation}
                      onChange={(e) => {
                        setFormData({ ...formData, emergencyContactRelation: e.target.value });
                        setFieldErrors({ ...fieldErrors, emergencyContactRelation: "" });
                      }}
                      placeholder="যেমন: স্বামী, বাবা, মা"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.emergencyContactRelation && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.emergencyContactRelation}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1.5">
                      অভিভাবকের ফোন নম্বর <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, emergencyContactPhone: e.target.value });
                        setFieldErrors({ ...fieldErrors, emergencyContactPhone: "" });
                      }}
                      placeholder="০১৮xxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {fieldErrors.emergencyContactPhone && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.emergencyContactPhone}</p>}
                  </div>
                </div>
              </div>

              {/* 4. Experience, Services & Areas */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">৪. দক্ষতা, অভিজ্ঞতা ও কর্ম এলাকা</h2>
                    <p className="text-xs text-slate-500">আপনি কোন কাজগুলো পারেন এবং কোন এলাকায় কাজ করতে চান</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">
                        কাজের অভিজ্ঞতা (বছর)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={formData.yearsOfExperience}
                        onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">
                        অভিজ্ঞতার সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)
                      </label>
                      <input
                        type="text"
                        value={formData.experienceDescription}
                        onChange={(e) => setFormData({ ...formData, experienceDescription: e.target.value })}
                        placeholder="যেমন: ৩ বছর বিভিন্ন বাসায় রান্না ও পরিচ্ছন্নতার অভিজ্ঞতা রয়েছে"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Services Offered Selection */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">
                      যে সেবাগুলো প্রদান করতে চান (কমপক্ষে ১টি সিলেক্ট করুন): <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {DEFAULT_SERVICES.map((srv) => {
                        const isSelected = formData.selectedServices.includes(srv.id);
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => toggleService(srv.id)}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                              isSelected
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span>{srv.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {fieldErrors.selectedServices && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.selectedServices}</p>}
                  </div>

                  {/* Areas Selection */}
                  <div className="pt-2">
                    <label className="block text-slate-700 font-semibold mb-2">
                      যে এলাকাগুলোতে কাজ করতে পারবেন: <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_AREAS.map((area) => {
                        const isSelected = formData.selectedAreas.includes(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleArea(area)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                              isSelected
                                ? "bg-emerald-600 border-emerald-600 text-white font-bold shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {area}
                          </button>
                        );
                      })}
                    </div>
                    {fieldErrors.selectedAreas && <p className="text-rose-500 text-[11px] mt-1">{fieldErrors.selectedAreas}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button Bar */}
              <div className="flex items-center justify-end space-x-4 pt-2">
                <Link
                  href="/provider-dashboard"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
                >
                  বাতিল
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>আবেদন জমা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{currentStatus === "REJECTED" ? "সংশোধিত আবেদন পুনরায় জমা দিন" : "কেওয়াইসি আবেদন জমা দিন"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
