import type { TransactionStatus } from "./types.js";

/**
 * Every event that can legally move a fuel transaction from one status to
 * another. The client never sends a target status directly — it sends an
 * intent (e.g. "start fueling") and the backend decides, via this table,
 * whether that's a legal transition from the transaction's current status.
 * This is what stops a tampered client from jumping straight to
 * PAYMENT_CAPTURED or COMPLETED.
 */
export type TransactionEvent =
  | "REQUEST_PAYMENT_AUTHORIZATION"
  | "PAYMENT_AUTHORIZATION_SUCCEEDED"
  | "PAYMENT_AUTHORIZATION_DECLINED"
  | "REQUEST_PUMP_AUTHORIZATION"
  | "PUMP_AUTHORIZATION_SUCCEEDED"
  | "PUMP_AUTHORIZATION_DECLINED"
  | "FUELING_STARTED"
  | "FUELING_ERRORED"
  | "FUELING_COMPLETED"
  | "FINAL_AMOUNT_RECEIVED"
  | "REQUEST_PAYMENT_CAPTURE"
  | "PAYMENT_CAPTURE_SUCCEEDED"
  | "PAYMENT_CAPTURE_DECLINED"
  | "FINALIZE"
  | "CANCEL"
  | "TIMED_OUT";

type TransitionTable = {
  [S in TransactionStatus]?: Partial<Record<TransactionEvent, TransactionStatus>>;
};

export const TRANSITION_TABLE: TransitionTable = {
  CREATED: {
    REQUEST_PAYMENT_AUTHORIZATION: "PAYMENT_AUTHORIZING",
    CANCEL: "TRANSACTION_CANCELLED",
    TIMED_OUT: "TIMEOUT",
  },
  PAYMENT_AUTHORIZING: {
    PAYMENT_AUTHORIZATION_SUCCEEDED: "PAYMENT_AUTHORIZED",
    PAYMENT_AUTHORIZATION_DECLINED: "PAYMENT_FAILED",
    TIMED_OUT: "TIMEOUT",
  },
  PAYMENT_AUTHORIZED: {
    REQUEST_PUMP_AUTHORIZATION: "PUMP_AUTHORIZING",
    CANCEL: "TRANSACTION_CANCELLED",
    TIMED_OUT: "TIMEOUT",
  },
  PUMP_AUTHORIZING: {
    PUMP_AUTHORIZATION_SUCCEEDED: "PUMP_AUTHORIZED",
    PUMP_AUTHORIZATION_DECLINED: "PUMP_AUTHORIZATION_FAILED",
    TIMED_OUT: "TIMEOUT",
  },
  PUMP_AUTHORIZED: {
    FUELING_STARTED: "FUELING",
    CANCEL: "TRANSACTION_CANCELLED",
    TIMED_OUT: "TIMEOUT",
  },
  FUELING: {
    FUELING_COMPLETED: "FUELING_COMPLETED",
    FUELING_ERRORED: "FUELING_FAILED",
  },
  FUELING_COMPLETED: {
    FINAL_AMOUNT_RECEIVED: "FINAL_AMOUNT_RECEIVED",
  },
  FINAL_AMOUNT_RECEIVED: {
    REQUEST_PAYMENT_CAPTURE: "PAYMENT_CAPTURING",
  },
  PAYMENT_CAPTURING: {
    PAYMENT_CAPTURE_SUCCEEDED: "PAYMENT_CAPTURED",
    PAYMENT_CAPTURE_DECLINED: "PAYMENT_CAPTURE_FAILED",
  },
  PAYMENT_CAPTURED: {
    FINALIZE: "COMPLETED",
  },

  // Terminal states accept no further events.
  COMPLETED: {},
  PAYMENT_FAILED: {},
  PUMP_AUTHORIZATION_FAILED: {},
  FUELING_FAILED: {},
  PAYMENT_CAPTURE_FAILED: {},
  TRANSACTION_CANCELLED: {},
  TIMEOUT: {},
};

export class InvalidTransactionTransitionError extends Error {
  constructor(
    public readonly currentStatus: TransactionStatus,
    public readonly event: TransactionEvent,
  ) {
    super(
      `Illegal transaction transition: cannot apply "${event}" while status is "${currentStatus}"`,
    );
    this.name = "InvalidTransactionTransitionError";
  }
}

export function nextTransactionStatus(
  currentStatus: TransactionStatus,
  event: TransactionEvent,
): TransactionStatus {
  const nextStatus = TRANSITION_TABLE[currentStatus]?.[event];
  if (!nextStatus) {
    throw new InvalidTransactionTransitionError(currentStatus, event);
  }
  return nextStatus;
}

export function canApplyEvent(
  currentStatus: TransactionStatus,
  event: TransactionEvent,
): boolean {
  return TRANSITION_TABLE[currentStatus]?.[event] !== undefined;
}
