import { NextRequest, NextResponse } from "next/server";

/**
 * Ingests client-side unhandled errors and exceptions for centralized APM monitoring.
 * POST /api/telemetry/errors
 */
export async function POST(req: NextRequest) {
  try {
    const errorPayload = await req.json();

    // Log in standardized Google Cloud Error Reporting JSON format
    const gcpStructuredError = {
      "@type": "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent",
      message: errorPayload.message || "Unhandled client-side exception",
      serviceContext: {
        service: "ghorbondhu-web-client",
        version: "0.1.0",
      },
      context: {
        httpRequest: {
          userAgent: req.headers.get("user-agent") || "",
          referrer: req.headers.get("referer") || "",
          remoteIp: req.ip || req.headers.get("x-forwarded-for") || "",
        },
        user: errorPayload.context?.userId || "anonymous",
        reportLocation: {
          filePath: errorPayload.context?.error?.stack ? "client-stack" : "unknown",
        },
      },
      errorDetails: errorPayload,
      timestamp: new Date().toISOString(),
    };

    console.error("[ClientErrorTelemetry]", JSON.stringify(gcpStructuredError));

    return NextResponse.json({ success: true, loggedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
