import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * GhorBondhu Booking State Machine Validator
 * Enforces transition matrix, role permissions, and OTP check
 */
class BookingStateMachine {
  static VALID_TRANSITIONS = {
    PENDING: ["PROVIDER_ASSIGNED", "CANCELLED"],
    PROVIDER_ASSIGNED: ["PROVIDER_ACCEPTED", "PENDING", "CANCELLED"],
    PROVIDER_ACCEPTED: ["ON_THE_WAY", "CANCELLED"],
    ON_THE_WAY: ["SERVICE_STARTED", "CANCELLED"],
    SERVICE_STARTED: ["SERVICE_COMPLETED"],
    SERVICE_COMPLETED: ["CUSTOMER_CONFIRMED", "DISPUTED"],
    CUSTOMER_CONFIRMED: ["DISPUTED"],
    CANCELLED: [],
    DISPUTED: ["RESOLVED", "REFUNDED"],
    RESOLVED: [],
    REFUNDED: [],
  };

  static transition(booking, targetStatus, actor) {
    const { status: currentStatus, customerId, providerId, startOtp } = booking;
    const { uid, role, providedOtp } = actor;

    // 1. Check if transition path exists
    const allowedTargets = BookingStateMachine.VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      throw new Error(`Illegal state transition from ${currentStatus} to ${targetStatus}`);
    }

    // 2. Validate Actor Authority
    switch (targetStatus) {
      case "PROVIDER_ASSIGNED":
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "SYSTEM") {
          throw new Error("Only admin/system can assign a provider");
        }
        break;

      case "PROVIDER_ACCEPTED":
      case "ON_THE_WAY":
      case "SERVICE_COMPLETED":
        if (uid !== providerId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
          throw new Error(`Only assigned provider ${providerId} can transition to ${targetStatus}`);
        }
        break;

      case "SERVICE_STARTED":
        if (uid !== providerId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
          throw new Error("Only assigned provider can start service");
        }
        // Validate start OTP
        if (providedOtp !== startOtp) {
          throw new Error("Invalid start OTP provided by customer");
        }
        break;

      case "CUSTOMER_CONFIRMED":
        if (uid !== customerId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
          throw new Error("Only customer can confirm job completion");
        }
        break;

      case "CANCELLED":
        if (uid !== customerId && uid !== providerId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
          throw new Error("Unauthorized to cancel booking");
        }
        break;

      case "DISPUTED":
        if (uid !== customerId && role !== "ADMIN" && role !== "SUPER_ADMIN") {
          throw new Error("Only customer or admin can dispute a booking");
        }
        break;

      case "RESOLVED":
      case "REFUNDED":
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
          throw new Error("Only admin or super admin can resolve disputes");
        }
        break;
    }

    return {
      ...booking,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    };
  }
}

describe("Integration: Booking Lifecycle State Machine & Role Gates", () => {
  const sampleBooking = {
    bookingId: "bk_1001",
    bookingNumber: "GB-84921",
    customerId: "cust_alice",
    providerId: "prov_karim",
    startOtp: "4829",
    status: "PENDING",
  };

  it("should complete a full golden-path lifecycle successfully", () => {
    let booking = { ...sampleBooking };

    // Step 1: Admin assigns Karim
    booking = BookingStateMachine.transition(booking, "PROVIDER_ASSIGNED", {
      uid: "admin_1",
      role: "ADMIN",
    });
    assert.equal(booking.status, "PROVIDER_ASSIGNED");

    // Step 2: Karim accepts
    booking = BookingStateMachine.transition(booking, "PROVIDER_ACCEPTED", {
      uid: "prov_karim",
      role: "PROVIDER",
    });
    assert.equal(booking.status, "PROVIDER_ACCEPTED");

    // Step 3: Karim departs
    booking = BookingStateMachine.transition(booking, "ON_THE_WAY", {
      uid: "prov_karim",
      role: "PROVIDER",
    });
    assert.equal(booking.status, "ON_THE_WAY");

    // Step 4: Karim arrives and validates customer OTP
    booking = BookingStateMachine.transition(booking, "SERVICE_STARTED", {
      uid: "prov_karim",
      role: "PROVIDER",
      providedOtp: "4829", // Correct OTP
    });
    assert.equal(booking.status, "SERVICE_STARTED");

    // Step 5: Karim completes service
    booking = BookingStateMachine.transition(booking, "SERVICE_COMPLETED", {
      uid: "prov_karim",
      role: "PROVIDER",
    });
    assert.equal(booking.status, "SERVICE_COMPLETED");

    // Step 6: Alice confirms satisfaction
    booking = BookingStateMachine.transition(booking, "CUSTOMER_CONFIRMED", {
      uid: "cust_alice",
      role: "CUSTOMER",
    });
    assert.equal(booking.status, "CUSTOMER_CONFIRMED");
  });

  it("should reject SERVICE_STARTED if invalid OTP is provided", () => {
    const booking = {
      ...sampleBooking,
      status: "ON_THE_WAY",
    };

    assert.throws(
      () => {
        BookingStateMachine.transition(booking, "SERVICE_STARTED", {
          uid: "prov_karim",
          role: "PROVIDER",
          providedOtp: "0000", // Wrong OTP
        });
      },
      /Invalid start OTP/
    );
  });

  it("should prevent unauthorized provider from accepting someone else's assigned job", () => {
    const booking = {
      ...sampleBooking,
      status: "PROVIDER_ASSIGNED",
    };

    assert.throws(
      () => {
        BookingStateMachine.transition(booking, "PROVIDER_ACCEPTED", {
          uid: "prov_hacker", // Malicious / different provider
          role: "PROVIDER",
        });
      },
      /Only assigned provider/
    );
  });

  it("should reject illegal state jumps (e.g. PENDING -> SERVICE_COMPLETED)", () => {
    const booking = { ...sampleBooking, status: "PENDING" };

    assert.throws(
      () => {
        BookingStateMachine.transition(booking, "SERVICE_COMPLETED", {
          uid: "prov_karim",
          role: "PROVIDER",
        });
      },
      /Illegal state transition from PENDING to SERVICE_COMPLETED/
    );
  });

  it("should allow customer cancellation when booking is PENDING", () => {
    const booking = { ...sampleBooking, status: "PENDING" };

    const cancelled = BookingStateMachine.transition(booking, "CANCELLED", {
      uid: "cust_alice",
      role: "CUSTOMER",
    });
    assert.equal(cancelled.status, "CANCELLED");
  });

  it("should forbid cancellation after service has already started", () => {
    const booking = { ...sampleBooking, status: "SERVICE_STARTED" };

    assert.throws(
      () => {
        BookingStateMachine.transition(booking, "CANCELLED", {
          uid: "cust_alice",
          role: "CUSTOMER",
        });
      },
      /Illegal state transition from SERVICE_STARTED to CANCELLED/
    );
  });

  it("should allow dispute transition only after service completion", () => {
    const completedBooking = { ...sampleBooking, status: "SERVICE_COMPLETED" };

    const disputed = BookingStateMachine.transition(completedBooking, "DISPUTED", {
      uid: "cust_alice",
      role: "CUSTOMER",
    });
    assert.equal(disputed.status, "DISPUTED");
  });
});
