"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { logger } from "@/lib/monitoring/logger";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logger.fatal("Critical Root Layout Crash", {
      metadata: { digest: error.digest },
      error,
    });
  }, [error]);

  return (
    <html lang="bn">
      <body className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-900/60 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            গুরুতর সিস্টেম ত্রুটি
          </h1>

          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            অ্যাপ্লিকেশনের মূল রুট ফ্রেমে একটি ত্রুটি ঘটেছে। অনুগ্রহ করে পেজটি রিফ্রেশ বা পুনরায় চেষ্টা করুন।
          </p>

          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition shadow"
          >
            <RotateCcw className="w-4 h-4" />
            অ্যাপ্লিকেশন রিলোড করুন
          </button>
        </div>
      </body>
    </html>
  );
}
