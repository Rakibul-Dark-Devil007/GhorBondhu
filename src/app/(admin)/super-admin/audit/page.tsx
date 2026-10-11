"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { subscribeToAuditLogs } from "@/lib/firebase/db";
import type { AuditLogEntry } from "@/types";
import {
  FileText,
  ArrowLeft,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  X,
  Loader2,
  Calendar,
  Activity,
  Layers,
  Code2
} from "lucide-react";

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [resourceFilter, setResourceFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToAuditLogs(
      (data) => {
        setLogs(data);
        setIsLoading(false);
      },
      100,
      (err) => {
        console.error("Error subscribing to audit logs:", err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (roleFilter !== "ALL" && log.actorRole !== roleFilter) return false;
      if (resourceFilter !== "ALL" && log.resourceType !== resourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = (log.action || "").toLowerCase().includes(q);
        const matchActor = (log.actorId || "").toLowerCase().includes(q);
        const matchResource = (log.resourceId || "").toLowerCase().includes(q);
        return matchAction || matchActor || matchResource;
      }
      return true;
    });
  }, [logs, roleFilter, resourceFilter, searchQuery]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">SUPER ADMIN</span>;
      case "ADMIN":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">ADMIN</span>;
      case "PROVIDER":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PROVIDER</span>;
      case "CUSTOMER":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">CUSTOMER</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">{role}</span>;
    }
  };

  return (
    <AuthGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/super-admin"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="সুপার অ্যাডমিন ড্যাশবোর্ডে ফিরুন"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-base font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>অডিট ট্রেইল ও সিকিউরিটি লগ কনসোল</span>
                </h1>
                <p className="text-xs text-slate-400">
                  রিয়েল-টাইম সিস্টেম মিউটেশন, পারমিশন পরিবর্তন ও প্ল্যাটফর্ম অ্যাকশন হিস্ট্রি
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
                IMMUTABLE AUDIT STREAM
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="অ্যাকশন, অ্যাক্টর আইডি বা রিসোর্স আইডি খুঁজুন..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-semibold">রোল:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">সকল রোল</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="PROVIDER">PROVIDER</option>
                  <option value="CUSTOMER">CUSTOMER</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-semibold">রিসোর্স:</span>
                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">সকল রিসোর্স</option>
                  <option value="USER">USER</option>
                  <option value="BOOKING">BOOKING</option>
                  <option value="PAYMENT">PAYMENT</option>
                  <option value="SYSTEM_SETTING">SYSTEM_SETTING</option>
                  <option value="SERVICE">SERVICE</option>
                  <option value="PROMO_CODE">PROMO_CODE</option>
                  <option value="DISPUTE">DISPUTE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {isLoading ? (
              <div className="p-16 text-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">অডিট রেকর্ড লোড হচ্ছে...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-16 text-center">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">কোনো অডিট রেকর্ড পাওয়া যায়নি</h3>
                <p className="text-xs text-slate-500 mt-1">নির্বাচিত ফিল্টারের সাথে মেলানো কোনো সিকিউরিটি ইভেন্ট নেই।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-4">টাইমস্ট্যাম্প</th>
                      <th className="py-3.5 px-4">অ্যাক্টর রোল ও আইডি</th>
                      <th className="py-3.5 px-4">অ্যাকশন</th>
                      <th className="py-3.5 px-4">টার্গেট রিসোর্স</th>
                      <th className="py-3.5 px-4">রিসোর্স আইডি</th>
                      <th className="py-3.5 px-4 text-right">মেটাডেটা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredLogs.map((log) => (
                      <tr key={log.logId} className="hover:bg-slate-850/50 transition">
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("bn-BD", {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          })}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getRoleBadge(log.actorRole)}
                            <span className="text-slate-300 font-semibold">{log.actorId.slice(0, 10)}...</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-amber-300">
                          {log.action}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {log.resourceType}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          {log.resourceId ? log.resourceId.slice(0, 14) : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-bold transition border border-slate-700"
                          >
                            <Eye className="w-3 h-3" />
                            <span>বিস্তারিত</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Metadata Inspection Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Code2 className="w-5 h-5" />
                  <h3 className="font-bold text-white text-base">অডিট ইভেন্ট মেটাডেটা</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px]">অ্যাকশন:</span>
                    <span className="text-amber-400 font-bold">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">টাইমস্ট্যাম্প:</span>
                    <span className="text-slate-300">{new Date(selectedLog.timestamp).toISOString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">অ্যাক্টর আইডি:</span>
                    <span className="text-slate-300">{selectedLog.actorId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">রিসোর্স:</span>
                    <span className="text-emerald-400">{selectedLog.resourceType} ({selectedLog.resourceId})</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-1 font-sans font-bold">ইভেন্ট মেটাডেটা পে-লোড (JSON):</span>
                  <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto max-h-60">
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
