import Stripe from "stripe";
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
} from "@tanky/domain";

/**
 * Real Stripe integration, running in whatever mode the configured secret
 * key is for — a sk_test_... key means every charge is a Stripe test-mode
 * charge (Stripe's own test cards, e.g. 4242 4242 4242 4242, no real money
 * ever moves); a live key would mean real charges, which this project never
 * ships configured for. Implements the same authorize/capture/release/
 * refund contract as MockPaymentProvider, so the transaction engine and
 * every screen are completely unaware which one is behind the interface.
 *
 * Maps our pre-auth-then-capture model directly onto Stripe's PaymentIntent
 * with capture_method: "manual" — authorize() creates + confirms the
 * PaymentIntent up to the hold amount, capture() captures up to (but never
 * more than) that amount and Stripe releases the remainder automatically.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe-payment-provider";

  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async authorize(input: AuthorizeInput): Promise<AuthorizeResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: input.maxAmountRappen,
          currency: "chf",
          payment_method: input.paymentMethodProviderToken,
          confirm: true,
          capture_method: "manual",
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          metadata: input.metadata,
        },
        { idempotencyKey: input.idempotencyKey },
      );

      if (intent.status === "requires_capture") {
        return { outcome: "AUTHORIZED", authorizationId: intent.id };
      }
      return {
        outcome: "DECLINED",
        declineReason: `Unexpected PaymentIntent status: ${intent.status}`,
      };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError) {
        return { outcome: "DECLINED", declineReason: err.message };
      }
      throw err;
    }
  }

  async capture(input: CaptureInput): Promise<CaptureResult> {
    try {
      const intent = await this.stripe.paymentIntents.capture(
        input.authorizationId,
        { amount_to_capture: input.amountRappen },
        { idempotencyKey: input.idempotencyKey },
      );
      return {
        outcome: "CAPTURED",
        captureId: intent.id,
        capturedAmountRappen: intent.amount_received,
        releasedAmountRappen: intent.amount - intent.amount_received,
      };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError || err instanceof Stripe.errors.StripeInvalidRequestError) {
        return { outcome: "DECLINED", declineReason: err.message };
      }
      throw err;
    }
  }

  async release(input: ReleaseInput): Promise<ReleaseResult> {
    await this.stripe.paymentIntents.cancel(input.authorizationId, undefined, {
      idempotencyKey: input.idempotencyKey,
    });
    return { outcome: "RELEASED" };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create(
        { payment_intent: input.captureId, amount: input.amountRappen },
        { idempotencyKey: input.idempotencyKey },
      );
      return { outcome: "REFUNDED", refundId: refund.id };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        return { outcome: "FAILED", reason: err.message };
      }
      throw err;
    }
  }
}
