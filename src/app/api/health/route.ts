import { NextResponse } from "next/server";

/**
 * Health check endpoint for external uptime monitors and container probing.
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  const uptimeSeconds = typeof process.uptime === "function" ? Math.round(process.uptime()) : 0;

  return NextResponse.json(
    {
      status: "healthy",
      service: "GhorBondhu Web Platform",
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
      version: "0.1.0",
      region: "asia-southeast1",
      checks: {
        webRuntime: "ok",
        clientConfiguration: "active",
      },
      latencyMs: Date.now() - startTime,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Health-Status": "OK",
      },
    }
  );
}
