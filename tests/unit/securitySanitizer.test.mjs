import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeHtml,
  stripHtmlTags,
  sanitizeText,
  sanitizeSearchQuery,
  sanitizePhone,
  maskPhoneNumber,
  maskNationalId,
  validatePasswordStrength,
  sanitizeAmount,
} from "../../src/lib/utils/security.ts";

describe("Unit: Security Sanitizer & Input Hardening", () => {
  describe("sanitizeHtml", () => {
    it("should escape XSS injection payload characters", () => {
      const malicious = `<script>alert("XSS")</script>`;
      const cleaned = sanitizeHtml(malicious);
      assert.equal(cleaned, "&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;");
      assert.ok(!cleaned.includes("<"));
      assert.ok(!cleaned.includes(">"));
    });

    it("should escape attribute injection with quotes and ampersand", () => {
      const input = `"><img src=x onerror=prompt('Hacked')>&`;
      const cleaned = sanitizeHtml(input);
      assert.ok(!cleaned.includes("<"));
      assert.ok(!cleaned.includes("'"));
      assert.ok(!cleaned.includes('"'));
      assert.ok(cleaned.includes("&amp;"));
    });

    it("should handle empty or nullish inputs gracefully", () => {
      assert.equal(sanitizeHtml(""), "");
      // @ts-expect-error test non-string
      assert.equal(sanitizeHtml(null), "");
    });
  });

  describe("stripHtmlTags", () => {
    it("should strip tags completely leaving clean inner text", () => {
      const input = "<p>Hello <b>GhorBondhu</b> Customer!</p>";
      assert.equal(stripHtmlTags(input), "Hello GhorBondhu Customer!");
    });

    it("should remove unclosed and nested tags", () => {
      const input = "<div><span>Clean Address</span><img src='broken.jpg'>";
      assert.equal(stripHtmlTags(input), "Clean Address");
    });
  });

  describe("sanitizeText", () => {
    it("should remove invisible ASCII control characters and truncate to max length", () => {
      const inputWithControlChars = "Dhanmondi\u0000\u0007 8/A\u001F, Dhaka";
      const cleaned = sanitizeText(inputWithControlChars, 20);
      assert.equal(cleaned, "Dhanmondi 8/A, Dhaka");
      assert.ok(cleaned.length <= 20);
    });
  });

  describe("sanitizeSearchQuery", () => {
    it("should strip query injection symbols and truncate", () => {
      const injectionAttempt = "Cleaning'; DROP TABLE users; -- <script>";
      const cleaned = sanitizeSearchQuery(injectionAttempt);
      assert.ok(!cleaned.includes("<"));
      assert.ok(!cleaned.includes(">"));
    });
  });

  describe("sanitizePhone", () => {
    it("should validate and normalize standard 017 format", () => {
      const { isValid, normalized } = sanitizePhone("01712345678");
      assert.equal(isValid, true);
      assert.equal(normalized, "01712345678");
    });

    it("should normalize +880 international prefix", () => {
      const { isValid, normalized } = sanitizePhone("+8801812345678");
      assert.equal(isValid, true);
      assert.equal(normalized, "01812345678");
    });

    it("should normalize 880 prefix without plus sign", () => {
      const { isValid, normalized } = sanitizePhone("8801912345678");
      assert.equal(isValid, true);
      assert.equal(normalized, "01912345678");
    });

    it("should reject invalid length or landline numbers", () => {
      const invalidShort = sanitizePhone("017123456");
      assert.equal(invalidShort.isValid, false);

      const invalidOperator = sanitizePhone("01212345678"); // 012 is not a valid BD mobile operator prefix
      assert.equal(invalidOperator.isValid, false);
    });
  });

  describe("maskPhoneNumber & maskNationalId", () => {
    it("should mask customer phone number to protect PII", () => {
      const masked = maskPhoneNumber("01712345678");
      assert.equal(masked, "017****5678");
    });

    it("should mask national ID preserving only last 4 digits", () => {
      const masked = maskNationalId("19951234567890");
      assert.equal(masked, "**********7890");
    });
  });

  describe("validatePasswordStrength", () => {
    it("should pass strong passwords meeting all criteria", () => {
      const result = validatePasswordStrength("P@ssw0rd2026!");
      assert.equal(result.isValid, true);
      assert.equal(result.score, 4);
      assert.equal(result.errors.length, 0);
    });

    it("should reject weak passwords and return specific feedback", () => {
      const result = validatePasswordStrength("weak");
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((err) => err.includes("৮ অক্ষরের")));
      assert.ok(result.errors.some((err) => err.includes("বড় হাতের")));
      assert.ok(result.errors.some((err) => err.includes("সংখ্যা")));
    });
  });

  describe("sanitizeAmount", () => {
    it("should reject negative numbers and return fallback", () => {
      assert.equal(sanitizeAmount(-500, 0), 0);
    });

    it("should round float precision issues to 2 decimals", () => {
      assert.equal(sanitizeAmount(100.126), 100.13);
      assert.equal(sanitizeAmount(500.5), 500.5);
    });

    it("should reject NaN and invalid strings", () => {
      assert.equal(sanitizeAmount("invalid", 100), 100);
      assert.equal(sanitizeAmount(NaN, 0), 0);
    });
  });
});
