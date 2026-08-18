import type { Rappen } from "../types.js";

/**
 * Abstraction over any card/wallet payment network (Visa, Mastercard, TWINT,
 * Apple Pay, Google Pay, ...). TANKY never talks to a network directly —
 * every payment operation goes through an implementation of this interface,
 * so a new provider can be plugged in without touching transaction logic.
 *
 * All amounts are integer Rappen. All operations are expected to be
 * idempotent when called twice with the same idempotencyKey.
 */
export interface PaymentProvider {
  readonly name: string;

  /**
   * Places a hold for up to `maxAmountRappen` on the given payment method.
   * The eventual capture may be for less than this amount (it never can be
   * for more).
   */
  authorize(input: AuthorizeInput): Promise<AuthorizeResult>;

  /**
   * Captures `amountRappen` (<= the original authorization) and releases
   * the remainder of the hold back to the customer.
   */
  capture(input: CaptureInput): Promise<CaptureResult>;

  /** Releases a hold entirely without capturing anything (e.g. on cancel). */
  release(input: ReleaseInput): Promise<ReleaseResult>;

  /** Refunds a previously captured payment, in part or in full. */
  refund(input: RefundInput): Promise<RefundResult>;
}

export interface AuthorizeInput {
  paymentMethodProviderToken: string;
  maxAmountRappen: Rappen;
  currency: "CHF";
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export type AuthorizeResult =
  | { outcome: "AUTHORIZED"; authorizationId: string }
  | { outcome: "DECLINED"; declineReason: string };

export interface CaptureInput {
  authorizationId: string;
  amountRappen: Rappen;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export type CaptureResult =
  | {
      outcome: "CAPTURED";
      captureId: string;
      capturedAmountRappen: Rappen;
      releasedAmountRappen: Rappen;
    }
  | { outcome: "DECLINED"; declineReason: string };

export interface ReleaseInput {
  authorizationId: string;
  idempotencyKey: string;
}

export type ReleaseResult = { outcome: "RELEASED" };

export interface RefundInput {
  captureId: string;
  amountRappen: Rappen;
  idempotencyKey: string;
}

export type RefundResult =
  | { outcome: "REFUNDED"; refundId: string }
  | { outcome: "FAILED"; reason: string };
