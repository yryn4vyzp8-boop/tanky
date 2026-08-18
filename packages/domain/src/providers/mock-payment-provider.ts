import { randomUUID } from "node:crypto";
import type {
  AuthorizeInput,
  AuthorizeResult,
  CaptureInput,
  CaptureResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  ReleaseInput,
  ReleaseResult,
} from "./payment-provider.js";
import type { DemoScenario } from "./demo-control.js";
import { DemoControlRegistry } from "./demo-control.js";

interface Hold {
  id: string;
  maxAmountRappen: number;
  captured: boolean;
}

/**
 * Fully simulated payment provider. Deterministic and safe by construction —
 * it can never move real money. Honors the DemoControlRegistry so the Demo
 * Control Panel can force a decline at authorization or capture time, or
 * simulate the provider being unreachable.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock-payment-provider";

  private holds = new Map<string, Hold>();
  private processedIdempotencyKeys = new Map<string, unknown>();

  constructor(private readonly demoControl?: DemoControlRegistry) {}

  async authorize(input: AuthorizeInput): Promise<AuthorizeResult> {
    const cached = this.processedIdempotencyKeys.get(input.idempotencyKey);
    if (cached) return cached as AuthorizeResult;

    const scenario = this.demoControl?.consumeIfRelevant(
      "PAYMENT_AUTHORIZATION_FAILURE",
      "NETWORK_ERROR",
    );
    if (scenario === "NETWORK_ERROR") {
      throw new Error("Simulated network error reaching payment provider (demo)");
    }
    if (scenario === "PAYMENT_AUTHORIZATION_FAILURE") {
      const result: AuthorizeResult = {
        outcome: "DECLINED",
        declineReason: "Card declined by issuer (demo)",
      };
      this.processedIdempotencyKeys.set(input.idempotencyKey, result);
      return result;
    }

    await simulateLatency();
    const authorizationId = `auth_${randomUUID()}`;
    this.holds.set(authorizationId, {
      id: authorizationId,
      maxAmountRappen: input.maxAmountRappen,
      captured: false,
    });
    const result: AuthorizeResult = { outcome: "AUTHORIZED", authorizationId };
    this.processedIdempotencyKeys.set(input.idempotencyKey, result);
    return result;
  }

  async capture(input: CaptureInput): Promise<CaptureResult> {
    const cached = this.processedIdempotencyKeys.get(input.idempotencyKey);
    if (cached) return cached as CaptureResult;

    const scenario = this.demoControl?.consumeIfRelevant(
      "PAYMENT_CAPTURE_FAILURE",
      "NETWORK_ERROR",
    );
    if (scenario === "NETWORK_ERROR") {
      throw new Error("Simulated network error reaching payment provider (demo)");
    }
    if (scenario === "PAYMENT_CAPTURE_FAILURE") {
      const result: CaptureResult = {
        outcome: "DECLINED",
        declineReason: "Capture rejected by issuer (demo)",
      };
      this.processedIdempotencyKeys.set(input.idempotencyKey, result);
      return result;
    }

    const hold = this.holds.get(input.authorizationId);
    if (!hold) {
      const result: CaptureResult = {
        outcome: "DECLINED",
        declineReason: "No such authorization",
      };
      return result;
    }
    if (hold.captured) {
      const result = this.processedIdempotencyKeys.get(
        `capture-completed:${input.authorizationId}`,
      ) as CaptureResult | undefined;
      if (result) return result;
    }
    if (input.amountRappen > hold.maxAmountRappen) {
      throw new Error(
        `Capture amount ${input.amountRappen} exceeds authorized max ${hold.maxAmountRappen}`,
      );
    }

    await simulateLatency();
    hold.captured = true;
    const result: CaptureResult = {
      outcome: "CAPTURED",
      captureId: `cap_${randomUUID()}`,
      capturedAmountRappen: input.amountRappen,
      releasedAmountRappen: hold.maxAmountRappen - input.amountRappen,
    };
    this.processedIdempotencyKeys.set(input.idempotencyKey, result);
    this.processedIdempotencyKeys.set(`capture-completed:${input.authorizationId}`, result);
    return result;
  }

  async release(input: ReleaseInput): Promise<ReleaseResult> {
    const cached = this.processedIdempotencyKeys.get(input.idempotencyKey);
    if (cached) return cached as ReleaseResult;
    await simulateLatency();
    this.holds.delete(input.authorizationId);
    const result: ReleaseResult = { outcome: "RELEASED" };
    this.processedIdempotencyKeys.set(input.idempotencyKey, result);
    return result;
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const cached = this.processedIdempotencyKeys.get(input.idempotencyKey);
    if (cached) return cached as RefundResult;
    await simulateLatency();
    const result: RefundResult = { outcome: "REFUNDED", refundId: `re_${randomUUID()}` };
    this.processedIdempotencyKeys.set(input.idempotencyKey, result);
    return result;
  }
}

function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
}

export type { DemoScenario };
