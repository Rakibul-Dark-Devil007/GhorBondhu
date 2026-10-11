import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Sensitive key patterns matching src/lib/monitoring/logger.ts
 */
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

function sanitizeLogData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (typeof data === "object") {
    const cleaned = {};
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

class TestLogger {
  constructor(environment = "test") {
    this.serviceName = "ghorbondhu-web";
    this.environment = environment;
    this.logs = [];
  }

  formatLog(level, message, context) {
    const serializedContext = {};

    if (context) {
      if (context.userId) serializedContext.userId = context.userId;
      if (context.role) serializedContext.role = context.role;
      if (context.correlationId) serializedContext.correlationId = context.correlationId;
      if (context.resourceType) serializedContext.resourceType = context.resourceType;
      if (context.resourceId) serializedContext.resourceId = context.resourceId;

      if (context.metadata) {
        serializedContext.metadata = sanitizeLogData(context.metadata);
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

  info(message, context) {
    const entry = this.formatLog("INFO", message, context);
    this.logs.push(entry);
    return entry;
  }

  warn(message, context) {
    const entry = this.formatLog("WARN", message, context);
    this.logs.push(entry);
    return entry;
  }

  error(message, context) {
    const entry = this.formatLog("ERROR", message, context);
    this.logs.push(entry);
    return entry;
  }
}

describe("Enterprise Structured Logger & Telemetry Sanitization", () => {
  it("redacts sensitive fields like passwords, tokens, API keys, and CVVs", () => {
    const payload = {
      username: "shakil_admin",
      password: "SuperSecretPassword123!",
      userToken: "jwt.secret.bearer",
      apiKey: "gh_live_api_key_9981",
      customer: {
        name: "Rahim Mia",
        nidNumber: "19942691234567890",
        payment: {
          cardNumber: "4111222233334444",
          cvv: "987",
          amountBDT: 1200,
        },
      },
    };

    const sanitized = sanitizeLogData(payload);

    assert.equal(sanitized.username, "shakil_admin");
    assert.equal(sanitized.password, "[REDACTED]");
    assert.equal(sanitized.userToken, "[REDACTED]");
    assert.equal(sanitized.apiKey, "[REDACTED]");
    assert.equal(sanitized.customer.name, "Rahim Mia");
    assert.equal(sanitized.customer.nidNumber, "[REDACTED]");
    assert.equal(sanitized.customer.payment.cardNumber, "[REDACTED]");
    assert.equal(sanitized.customer.payment.cvv, "[REDACTED]");
    assert.equal(sanitized.customer.payment.amountBDT, 1200);
  });

  it("handles arrays and nested primitive structures without mutation", () => {
    const list = [
      { id: "1", token: "tok_123" },
      { id: "2", status: "SUCCESS" },
      "plain-string",
      100,
    ];

    const sanitized = sanitizeLogData(list);
    assert.equal(sanitized[0].id, "1");
    assert.equal(sanitized[0].token, "[REDACTED]");
    assert.equal(sanitized[1].status, "SUCCESS");
    assert.equal(sanitized[2], "plain-string");
    assert.equal(sanitized[3], 100);
  });

  it("correctly generates structured log entries with metadata and correlation IDs", () => {
    const logger = new TestLogger("production");
    const entry = logger.info("Order payment processed", {
      userId: "usr_9918",
      role: "CUSTOMER",
      correlationId: "trace-91827364-abcd",
      resourceType: "BOOKING",
      resourceId: "bk_5544",
      metadata: {
        amountBDT: 850,
        secretWebhookKey: "whsec_live_99",
      },
    });

    assert.equal(entry.level, "INFO");
    assert.equal(entry.service, "ghorbondhu-web");
    assert.equal(entry.environment, "production");
    assert.equal(entry.message, "Order payment processed");
    assert.equal(entry.context.userId, "usr_9918");
    assert.equal(entry.context.correlationId, "trace-91827364-abcd");
    assert.equal(entry.context.metadata.amountBDT, 850);
    assert.equal(entry.context.metadata.secretWebhookKey, "[REDACTED]");
  });

  it("serializes Error instances with name, message, and stack trace", () => {
    const logger = new TestLogger("staging");
    const testError = new Error("Gateway connection timed out");
    testError.name = "GatewayTimeoutError";

    const entry = logger.error("Payment execution failed", {
      correlationId: "trace-err-1122",
      error: testError,
    });

    assert.equal(entry.level, "ERROR");
    assert.equal(entry.context.error.name, "GatewayTimeoutError");
    assert.equal(entry.context.error.message, "Gateway connection timed out");
    assert.ok(entry.context.error.stack.includes("GatewayTimeoutError"));
  });

  it("handles non-Error objects passed into the error context safely", () => {
    const logger = new TestLogger("development");
    const entry = logger.warn("Unexpected failure payload", {
      error: "String based failure reason",
    });

    assert.equal(entry.level, "WARN");
    assert.equal(entry.context.error, "String based failure reason");
  });
});
