"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { logger } from "@/lib/monitoring/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Automatically report exception to centralized telemetry
    logger.error("Unhandled client error in route tree", {
      metadata: { digest: error.digest },
      error,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          অনাকাঙ্ক্ষিত ত্রুটি ঘটেছে
        </h1>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          দুঃখিত, অ্যাপ্লিকেশনটি রেন্ডার করার সময় একটি প্রযুক্তিগত ত্রুটি হয়েছে। আমাদের ইঞ্জিনিয়ারিং টিমকে বিষয়টি অবগত করা হয়েছে।
        </p>

        {error.digest && (
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono">
            রেফারেন্স আইডি: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            পুনরায় চেষ্টা করুন
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
          >
            <Home className="w-4 h-4" />
            হোমপেজে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}
