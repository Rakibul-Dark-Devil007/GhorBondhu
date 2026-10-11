"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerProvider, mapAuthError } from "@/lib/firebase/auth";
import { ProviderRegisterSchema } from "@/lib/validators/auth";
import { Sparkles, Loader2, AlertCircle, ArrowRight, ShieldCheck, Check } from "lucide-react";

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
];

const AVAILABLE_SERVICES = [
  { id: "house-cleaning", label: "বাসা ও রুম ক্লিনিং (House Cleaning)" },
  { id: "kitchen-cleaning", label: "কিচেন ও থালাবাসন ক্লিনিং (Kitchen Cleaning)" },
  { id: "bathroom-cleaning", label: "বাথরুম ক্লিনিং (Bathroom Cleaning)" },
  { id: "laundry-ironing", label: "লন্ড্রি ও কাপড় ইস্ত্রি (Laundry & Ironing)" },
  { id: "cooking-assistance", label: "রান্নায় সাহায্য (Cooking Assistance)" },
  { id: "elderly-help", label: "বয়োবৃদ্ধদের সাহায্য (Elderly Assistance)" },
];

export default function ProviderRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "FEMALE" as "MALE" | "FEMALE" | "OTHER",
    serviceAreas: [] as string[],
    servicesOffered: [] as string[],
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleArea = (area: string) => {
    setFormData((prev) => {
      const exists = prev.serviceAreas.includes(area);
      return {
        ...prev,
        serviceAreas: exists
          ? prev.serviceAreas.filter((a) => a !== area)
          : [...prev.serviceAreas, area],
      };
    });
  };

  const toggleService = (serviceId: string) => {
    setFormData((prev) => {
      const exists = prev.servicesOffered.includes(serviceId);
      return {
        ...prev,
        servicesOffered: exists
          ? prev.servicesOffered.filter((s) => s !== serviceId)
          : [...prev.servicesOffered, serviceId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const validation = ProviderRegisterSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerProvider(formData);
      router.push("/provider-dashboard");
    } catch (err: any) {
      setServerError(mapAuthError(err.code || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">GhorBondhu</span>
          </Link>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            সার্ভিস প্রোভাইডার (কর্মী) হিসেবে যুক্ত হোন
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            স্বাধীনভাবে কাজ করুন, সঠিক সময়ে সম্মানজনক উপার্জন করুন।
          </p>
        </div>

        {/* Verification Notice */}
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-800 text-sm">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <span className="font-semibold">নিরাপত্তা ও যাচাই নীতি:</span> রেজিস্ট্রেশন সম্পন্ন করার পর আপনাকে ড্যাশবোর্ড থেকে এনআইডি (NID) কার্ডের ছবি জমা দিতে হবে। অ্যাডমিন কর্তৃক যাচাই (Verification) সম্পন্ন হলেই আপনি বুকিং রিকোয়েস্ট গ্রহণ করতে পারবেন।
          </div>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  আপনার পুরো নাম
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="এনআইডি অনুযায়ী নাম"
                  className={`mt-1 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.fullName
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  লিঙ্গ (Gender)
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20 transition"
                >
                  <option value="FEMALE">মহিলা (Female)</option>
                  <option value="MALE">পুরুষ (Male)</option>
                  <option value="OTHER">অন্যান্য (Other)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className={`mt-1 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.phoneNumber
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  ইমেইল ঠিকানা
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="provider@example.com"
                  className={`mt-1 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.email
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            {/* Services Offered Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                আপনি কোন কোন সেবা প্রদান করতে চান? (কমপক্ষে ১টি)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_SERVICES.map((srv) => {
                  const isSelected = formData.servicesOffered.includes(srv.id);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => toggleService(srv.id)}
                      className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between ${
                        isSelected
                          ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <span>{srv.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-brand-600 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.servicesOffered && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.servicesOffered}</p>
              )}
            </div>

            {/* Service Areas Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                আপনার কাজের পছন্দের এলাকা (কমপক্ষে ১টি)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_AREAS.map((area) => {
                  const isSelected = formData.serviceAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className={`p-2.5 rounded-lg border text-left text-xs font-medium transition flex items-center justify-between ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      <span className="truncate">{area}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.serviceAreas && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.serviceAreas}</p>
              )}
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  পাসওয়ার্ড
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="ন্যূনতম ৬ অক্ষর"
                  className={`mt-1 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.password
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  className={`mt-1 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.confirmPassword
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>তথ্য সংরক্ষণ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>আবেদন জমা দিন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              ইতিমধ্যে সার্ভিস অ্যাকাউন্ট আছে?{" "}
              <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                লগইন করুন
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
