import { test } from "node:test";
import assert from "node:assert/strict";
import {
  InvalidTransactionTransitionError,
  nextTransactionStatus,
} from "./state-machine.js";

test("happy path walks through every step in order", () => {
  let status = nextTransactionStatus("CREATED", "REQUEST_PAYMENT_AUTHORIZATION");
  assert.equal(status, "PAYMENT_AUTHORIZING");
  status = nextTransactionStatus(status, "PAYMENT_AUTHORIZATION_SUCCEEDED");
  assert.equal(status, "PAYMENT_AUTHORIZED");
  status = nextTransactionStatus(status, "REQUEST_PUMP_AUTHORIZATION");
  assert.equal(status, "PUMP_AUTHORIZING");
  status = nextTransactionStatus(status, "PUMP_AUTHORIZATION_SUCCEEDED");
  assert.equal(status, "PUMP_AUTHORIZED");
  status = nextTransactionStatus(status, "FUELING_STARTED");
  assert.equal(status, "FUELING");
  status = nextTransactionStatus(status, "FUELING_COMPLETED");
  assert.equal(status, "FUELING_COMPLETED");
  status = nextTransactionStatus(status, "FINAL_AMOUNT_RECEIVED");
  assert.equal(status, "FINAL_AMOUNT_RECEIVED");
  status = nextTransactionStatus(status, "REQUEST_PAYMENT_CAPTURE");
  assert.equal(status, "PAYMENT_CAPTURING");
  status = nextTransactionStatus(status, "PAYMENT_CAPTURE_SUCCEEDED");
  assert.equal(status, "PAYMENT_CAPTURED");
  status = nextTransactionStatus(status, "FINALIZE");
  assert.equal(status, "COMPLETED");
});

test("rejects skipping straight to a captured/completed state", () => {
  assert.throws(
    () => nextTransactionStatus("CREATED", "PAYMENT_CAPTURE_SUCCEEDED"),
    InvalidTransactionTransitionError,
  );
  assert.throws(
    () => nextTransactionStatus("CREATED", "FINALIZE"),
    InvalidTransactionTransitionError,
  );
});

test("terminal states accept no further events", () => {
  assert.throws(() =>
    nextTransactionStatus("COMPLETED", "REQUEST_PAYMENT_AUTHORIZATION"),
  );
  assert.throws(() => nextTransactionStatus("TIMEOUT", "CANCEL"));
});

test("cancellation is only legal before fueling starts", () => {
  assert.equal(nextTransactionStatus("CREATED", "CANCEL"), "TRANSACTION_CANCELLED");
  assert.equal(nextTransactionStatus("PUMP_AUTHORIZED", "CANCEL"), "TRANSACTION_CANCELLED");
  assert.throws(() => nextTransactionStatus("FUELING", "CANCEL"));
});
