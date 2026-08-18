import {
  nextTransactionStatus,
  type FuelType,
  type Receipt,
  type TransactionEvent,
  type TransactionStatus,
} from "@tanky/domain";
import { transactionRepository, type TransactionRecord } from "../repositories/transaction-repository.js";
import { paymentMethodRepository } from "../repositories/payment-method-repository.js";
import { paymentProvider, fuelStationProvider } from "../providers.js";
import { Errors } from "../errors.js";
import { FUEL_TYPE_LABELS } from "@tanky/domain";

function assertOwnership(tx: TransactionRecord, userId: string): void {
  if (tx.userId !== userId) {
    throw Errors.forbidden("This transaction does not belong to you");
  }
}

function requireTransaction(id: string): TransactionRecord {
  const tx = transactionRepository.findById(id);
  if (!tx) throw Errors.notFound(`Transaction ${id} not found`);
  return tx;
}

/** Advances the state machine by one event, persists the new status, and logs it. Throws on illegal transitions. */
function applyEvent(
  tx: TransactionRecord,
  event: TransactionEvent,
  message: string,
  patch: Partial<TransactionRecord> = {},
  metadata: Record<string, unknown> | null = null,
): TransactionRecord {
  const nextStatus: TransactionStatus = nextTransactionStatus(tx.status, event);
  const updated = transactionRepository.update(tx.id, { ...patch, status: nextStatus });
  transactionRepository.addEvent({
    transactionId: tx.id,
    status: nextStatus,
    message,
    metadata,
  });
  return updated;
}

export const transactionService = {
  async create(
    userId: string,
    input: {
      stationId: string;
      pumpId: string;
      fuelType: FuelType;
      paymentMethodId: string;
      maxAuthorizationAmountRappen: number;
    },
  ): Promise<TransactionRecord> {
    const paymentMethod = paymentMethodRepository.findById(input.paymentMethodId);
    if (!paymentMethod || paymentMethod.userId !== userId) {
      throw Errors.badRequest("Unknown payment method");
    }
    if (input.maxAuthorizationAmountRappen <= 0) {
      throw Errors.badRequest("maxAuthorizationAmountRappen must be positive");
    }

    const station = await fuelStationProvider.getStation(input.stationId);
    if (!station) throw Errors.badRequest("Unknown station");
    const pump = station.pumps.find((p) => p.id === input.pumpId);
    if (!pump) throw Errors.badRequest("Unknown pump");

    // Belt-and-braces transaction isolation check: this is on top of (not
    // instead of) the provider's own pump-occupied check in authorizePump.
    const existingActive = transactionRepository.findActiveByPump(input.pumpId);
    if (existingActive) {
      throw Errors.conflict(`Pump ${pump.label} already has an active transaction`);
    }

    const tx = transactionRepository.create({
      userId,
      stationId: station.id,
      stationName: station.name,
      stationAddress: `${station.address}, ${station.city}`,
      pumpId: pump.id,
      pumpLabel: pump.label,
      fuelType: input.fuelType,
      paymentMethodId: input.paymentMethodId,
      maxAuthorizationAmountRappen: input.maxAuthorizationAmountRappen,
    });
    transactionRepository.addEvent({
      transactionId: tx.id,
      status: "CREATED",
      message: `Transaction created for pump ${pump.label} at ${station.name}`,
    });
    return tx;
  },

  /**
   * Orchestrates payment authorization followed by pump authorization as a
   * single call — from the user's point of view this is one "unlocking the
   * pump" step. If the pump can't be authorized after the payment hold
   * succeeded, the hold is released immediately rather than left dangling.
   */
  async authorizeAndUnlockPump(id: string, userId: string): Promise<TransactionRecord> {
    let tx = requireTransaction(id);
    assertOwnership(tx, userId);
    if (tx.status !== "CREATED") {
      throw Errors.conflict(`Cannot authorize from status ${tx.status}`);
    }

    const paymentMethod = paymentMethodRepository.findById(tx.paymentMethodId)!;

    tx = applyEvent(tx, "REQUEST_PAYMENT_AUTHORIZATION", "Requesting payment authorization");

    let authResult;
    try {
      authResult = await paymentProvider.authorize({
        paymentMethodProviderToken: paymentMethod.providerToken,
        maxAmountRappen: tx.maxAuthorizationAmountRappen,
        currency: "CHF",
        idempotencyKey: `${tx.id}:payment-authorize`,
        metadata: { transactionId: tx.id },
      });
    } catch (err) {
      tx = applyEvent(
        tx,
        "PAYMENT_AUTHORIZATION_DECLINED",
        "Payment provider unreachable",
        { failureReason: (err as Error).message },
      );
      return tx;
    }

    if (authResult.outcome === "DECLINED") {
      return applyEvent(
        tx,
        "PAYMENT_AUTHORIZATION_DECLINED",
        `Payment authorization declined: ${authResult.declineReason}`,
        { failureReason: authResult.declineReason },
      );
    }

    tx = applyEvent(
      tx,
      "PAYMENT_AUTHORIZATION_SUCCEEDED",
      `Payment authorized for up to CHF ${(tx.maxAuthorizationAmountRappen / 100).toFixed(2)}`,
      { paymentAuthorizationId: authResult.authorizationId },
    );

    tx = applyEvent(tx, "REQUEST_PUMP_AUTHORIZATION", "Requesting pump authorization");

    let pumpResult;
    try {
      pumpResult = await fuelStationProvider.authorizePump({
        stationId: tx.stationId,
        pumpId: tx.pumpId,
        fuelType: tx.fuelType,
        maxAmountRappen: tx.maxAuthorizationAmountRappen,
        idempotencyKey: `${tx.id}:pump-authorize`,
      });
    } catch (err) {
      await releaseHold(tx, "Releasing hold after station unreachable");
      return applyEvent(
        tx,
        "PUMP_AUTHORIZATION_DECLINED",
        "Fuel station unreachable",
        { failureReason: (err as Error).message },
      );
    }

    if (pumpResult.outcome !== "AUTHORIZED") {
      await releaseHold(tx, "Releasing hold after pump authorization failed");
      return applyEvent(
        tx,
        "PUMP_AUTHORIZATION_DECLINED",
        `Pump authorization failed: ${pumpResult.reason}`,
        { failureReason: pumpResult.reason },
      );
    }

    return applyEvent(
      tx,
      "PUMP_AUTHORIZATION_SUCCEEDED",
      `Pump ${tx.pumpLabel} unlocked and ready`,
      { providerFuelSessionId: pumpResult.providerFuelSessionId },
    );
  },

  async startFueling(id: string, userId: string): Promise<TransactionRecord> {
    let tx = requireTransaction(id);
    assertOwnership(tx, userId);
    if (tx.status !== "PUMP_AUTHORIZED") {
      throw Errors.conflict(`Cannot start fueling from status ${tx.status}`);
    }

    tx = applyEvent(tx, "FUELING_STARTED", "Fueling started");

    const result = await fuelStationProvider.startFuelTransaction({
      providerFuelSessionId: tx.providerFuelSessionId!,
    });

    if (result.outcome === "FAILED") {
      await releaseHold(tx, "Releasing hold after fueling failed to start");
      return applyEvent(tx, "FUELING_ERRORED", `Fueling failed to start: ${result.reason}`, {
        failureReason: result.reason,
      });
    }

    return tx;
  },

  /** Live readout only — does not mutate the persisted transaction. */
  async getFuelingProgress(id: string, userId: string) {
    const tx = requireTransaction(id);
    assertOwnership(tx, userId);
    if (tx.status !== "FUELING" && tx.status !== "FUELING_COMPLETED") {
      throw Errors.conflict(`Transaction is not fueling (status ${tx.status})`);
    }
    return fuelStationProvider.getFuelingData(tx.providerFuelSessionId!);
  },

  /**
   * Orchestrates: confirm fueling stopped -> record final amount -> capture
   * payment -> complete. This whole sequence is meant to be invisible to
   * the user ("automatisch bezahlt") so it happens as one backend call.
   * Safe to call more than once — a call against an already-COMPLETED
   * transaction is a no-op.
   */
  async finalizeAndCapture(id: string, userId: string): Promise<TransactionRecord> {
    let tx = requireTransaction(id);
    assertOwnership(tx, userId);

    if (tx.status === "COMPLETED") return tx;
    if (tx.status !== "FUELING") {
      throw Errors.conflict(`Cannot finalize from status ${tx.status}`);
    }

    let finalizeResult;
    try {
      finalizeResult = await fuelStationProvider.finalizeFuelTransaction(
        tx.providerFuelSessionId!,
      );
    } catch (err) {
      await releaseHold(tx, "Releasing hold after station unreachable during finalize");
      return applyEvent(tx, "FUELING_ERRORED", "Fuel station unreachable while finalizing", {
        failureReason: (err as Error).message,
      });
    }

    if (finalizeResult.outcome === "FAILED") {
      throw Errors.unprocessable(finalizeResult.reason);
    }

    tx = applyEvent(
      tx,
      "FUELING_COMPLETED",
      `Fueling completed: ${finalizeResult.liters.toFixed(2)} L`,
    );

    tx = applyEvent(
      tx,
      "FINAL_AMOUNT_RECEIVED",
      `Final amount: CHF ${(finalizeResult.finalAmountRappen / 100).toFixed(2)}`,
      {
        liters: finalizeResult.liters,
        pricePerLiterMilliFrancs: finalizeResult.pricePerLiterMilliFrancs,
        finalAmountRappen: finalizeResult.finalAmountRappen,
      },
    );

    tx = applyEvent(tx, "REQUEST_PAYMENT_CAPTURE", "Requesting payment capture");

    let captureResult;
    try {
      captureResult = await paymentProvider.capture({
        authorizationId: tx.paymentAuthorizationId!,
        amountRappen: finalizeResult.finalAmountRappen,
        idempotencyKey: `${tx.id}:payment-capture`,
      });
    } catch (err) {
      return applyEvent(tx, "PAYMENT_CAPTURE_DECLINED", "Payment provider unreachable during capture", {
        failureReason: (err as Error).message,
      });
    }

    if (captureResult.outcome === "DECLINED") {
      return applyEvent(
        tx,
        "PAYMENT_CAPTURE_DECLINED",
        `Payment capture declined: ${captureResult.declineReason}`,
        { failureReason: captureResult.declineReason },
      );
    }

    tx = applyEvent(
      tx,
      "PAYMENT_CAPTURE_SUCCEEDED",
      `Payment captured: CHF ${(captureResult.capturedAmountRappen / 100).toFixed(2)}`,
      {
        paymentCaptureId: captureResult.captureId,
        capturedAmountRappen: captureResult.capturedAmountRappen,
        releasedAmountRappen: captureResult.releasedAmountRappen,
      },
    );

    tx = applyEvent(tx, "FINALIZE", "Transaction completed", {
      completedAt: new Date().toISOString(),
    });

    return tx;
  },

  async cancel(id: string, userId: string): Promise<TransactionRecord> {
    let tx = requireTransaction(id);
    assertOwnership(tx, userId);

    if (tx.paymentAuthorizationId) {
      await releaseHold(tx, "Releasing hold: transaction cancelled");
    }
    if (tx.providerFuelSessionId) {
      await fuelStationProvider.cancelFuelTransaction(tx.providerFuelSessionId);
    }

    return applyEvent(tx, "CANCEL", "Transaction cancelled by user");
  },

  getForUser(id: string, userId: string): TransactionRecord {
    const tx = requireTransaction(id);
    assertOwnership(tx, userId);
    return tx;
  },

  listForUser(userId: string): TransactionRecord[] {
    return transactionRepository.listForUser(userId);
  },

  listEvents(id: string, userId: string) {
    const tx = requireTransaction(id);
    assertOwnership(tx, userId);
    return transactionRepository.listEvents(id);
  },

  getReceipt(id: string, userId: string): Receipt {
    const tx = requireTransaction(id);
    assertOwnership(tx, userId);
    if (tx.status !== "COMPLETED" || tx.finalAmountRappen === null || tx.liters === null) {
      throw Errors.conflict("Receipt is only available for completed transactions");
    }
    const paymentMethod = paymentMethodRepository.findById(tx.paymentMethodId);
    return {
      transactionId: tx.id,
      stationName: tx.stationName,
      stationAddress: tx.stationAddress,
      pumpLabel: tx.pumpLabel,
      fuelType: tx.fuelType,
      liters: tx.liters,
      pricePerLiterMilliFrancs: tx.pricePerLiterMilliFrancs!,
      totalAmountRappen: tx.capturedAmountRappen ?? tx.finalAmountRappen,
      paymentMethodLabel: paymentMethod
        ? `${paymentMethod.brand} ••••${paymentMethod.last4}`
        : "Unknown",
      issuedAt: tx.completedAt ?? tx.updatedAt,
    };
  },
};

async function releaseHold(tx: TransactionRecord, message: string): Promise<void> {
  if (!tx.paymentAuthorizationId) return;
  try {
    await paymentProvider.release({
      authorizationId: tx.paymentAuthorizationId,
      idempotencyKey: `${tx.id}:payment-release`,
    });
    transactionRepository.addEvent({ transactionId: tx.id, status: tx.status, message });
  } catch {
    // Best-effort: if release itself fails (e.g. simulated network error),
    // the hold will simply expire on the provider side. Not fatal to the
    // transaction's own failure path.
  }
}

// Re-exported for routes that want fuel-type display labels without a second import.
export { FUEL_TYPE_LABELS };
