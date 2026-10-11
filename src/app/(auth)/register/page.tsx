"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerCustomer, mapAuthError } from "@/lib/firebase/auth";
import { CustomerRegisterSchema } from "@/lib/validators/auth";
import { Sparkles, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const validation = CustomerRegisterSchema.safeParse(formData);
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
      await registerCustomer(formData);
      router.push("/customer-dashboard");
    } catch (err: any) {
      setServerError(mapAuthError(err.code || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">GhorBondhu</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">
          কাস্টমার অ্যাকাউন্ট খুলুন
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          ইতিমধ্যে একাউন্ট আছে?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-500">
            লগইন করুন
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                আপনার পুরো নাম
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="যেমন: মো: আরিফুল ইসলাম"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.fullName
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                ইমেইল ঠিকানা
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
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

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                মোবাইল নম্বর
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="017XXXXXXXX"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.phoneNumber
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                পাসওয়ার্ড
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="ন্যূনতম ৬ অক্ষর"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                    fieldErrors.password
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20"
                  }`}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-md shadow-brand-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>রেজিস্ট্রেশন সম্পন্ন করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              সার্ভিস কর্মী হিসেবে কাজ করতে চান?{" "}
              <Link
                href="/provider-register"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                কর্মী রেজিস্ট্রেশন ফরম
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
