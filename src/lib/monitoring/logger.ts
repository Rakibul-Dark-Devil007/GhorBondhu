/**
 * GhorBondhu (ঘরবন্ধু) - Enterprise Structured Logger & Telemetry
 * Provides structured JSON logging, PII redaction, secret masking,
 * and correlation tracing for both browser and server runtimes.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogContext {
  userId?: string;
  role?: string;
  correlationId?: string;
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, unknown>;
  error?: Error | unknown;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  environment: string;
  service: string;
  context?: Record<string, unknown>;
}

// Sensitive key patterns to automatically redact from log metadata
const SENSITIVE_KEYS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /api[_-]?key/i,
  /nid/i,
  /card[_-]?number/i,
  /cvv/i,
];

/**
 * Recursively redacts sensitive values from log objects to avoid accidental data leaks.
 */
export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (typeof data === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEYS.some((pattern) => pattern.test(key));
      if (isSensitive) {
        cleaned[key] = "[REDACTED]";
      } else if (typeof value === "object") {
        cleaned[key] = sanitizeLogData(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  return String(data);
}

class Logger {
  private serviceName = "ghorbondhu-web";
  private environment = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development";

  private formatLog(level: LogLevel, message: string, context?: LogContext): StructuredLog {
    const serializedContext: Record<string, unknown> = {};

    if (context) {
      if (context.userId) serializedContext.userId = context.userId;
      if (context.role) serializedContext.role = context.role;
      if (context.correlationId) serializedContext.correlationId = context.correlationId;
      if (context.resourceType) serializedContext.resourceType = context.resourceType;
      if (context.resourceId) serializedContext.resourceId = context.resourceId;

      if (context.metadata) {
        serializedContext.metadata = sanitizeLogData(context.metadata) as Record<string, unknown>;
      }

      if (context.error) {
        if (context.error instanceof Error) {
          serializedContext.error = {
            name: context.error.name,
            message: context.error.message,
            stack: context.error.stack,
          };
        } else {
          serializedContext.error = String(context.error);
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      service: this.serviceName,
      context: Object.keys(serializedContext).length > 0 ? serializedContext : undefined,
    };
  }

  debug(message: string, context?: LogContext): void {
    if (this.environment === "production") return; // Suppress debug in production
    const entry = this.formatLog("DEBUG", message, context);
    console.debug(`[DEBUG] ${entry.timestamp} - ${entry.message}`, entry.context || "");
  }

  info(message: string, context?: LogContext): void {
    const entry = this.formatLog("INFO", message, context);
    console.info(`[INFO] ${entry.timestamp} - ${entry.message}`, entry.context || "");
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.formatLog("WARN", message, context);
    console.warn(`[WARN] ${entry.timestamp} - ${entry.message}`, entry.context || "");
  }

  error(message: string, context?: LogContext): void {
    const entry = this.formatLog("ERROR", message, context);
    console.error(`[ERROR] ${entry.timestamp} - ${entry.message}`, entry.context || "");

    // In client browser, optionally forward critical error to backend telemetry intake
    if (typeof window !== "undefined" && this.environment !== "test") {
      try {
        fetch("/api/telemetry/errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
          keepalive: true,
        }).catch(() => {
          // Non-blocking telemetry delivery
        });
      } catch {
        // Suppress intake network errors
      }
    }
  }

  fatal(message: string, context?: LogContext): void {
    const entry = this.formatLog("FATAL", message, context);
    console.error(`🚨 [FATAL] ${entry.timestamp} - ${entry.message}`, entry.context || "");
  }
}

export const logger = new Logger();
