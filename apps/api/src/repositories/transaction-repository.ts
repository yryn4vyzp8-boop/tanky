import type {
  FuelTransaction,
  FuelTransactionEvent,
  FuelType,
  TransactionStatus,
} from "@tanky/domain";
import { db } from "../db/client.js";
import { newId, nowIso } from "../ids.js";

interface TransactionRow {
  id: string;
  idempotency_key: string;
  user_id: string;
  station_id: string;
  pump_id: string;
  pump_label: string;
  station_name: string;
  station_address: string;
  fuel_type: string;
  payment_method_id: string;
  status: string;
  max_authorization_amount_rappen: number;
  payment_authorization_id: string | null;
  provider_fuel_session_id: string | null;
  liters: number | null;
  price_per_liter_milli_francs: number | null;
  final_amount_rappen: number | null;
  payment_capture_id: string | null;
  captured_amount_rappen: number | null;
  released_amount_rappen: number | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TransactionRecord extends FuelTransaction {
  stationName: string;
  stationAddress: string;
  pumpLabel: string;
  failureReason: string | null;
}

function toTransaction(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    userId: row.user_id,
    stationId: row.station_id,
    pumpId: row.pump_id,
    pumpLabel: row.pump_label,
    stationName: row.station_name,
    stationAddress: row.station_address,
    fuelType: row.fuel_type as FuelType,
    paymentMethodId: row.payment_method_id,
    status: row.status as TransactionStatus,
    maxAuthorizationAmountRappen: row.max_authorization_amount_rappen,
    paymentAuthorizationId: row.payment_authorization_id,
    providerFuelSessionId: row.provider_fuel_session_id,
    liters: row.liters,
    pricePerLiterMilliFrancs: row.price_per_liter_milli_francs,
    finalAmountRappen: row.final_amount_rappen,
    paymentCaptureId: row.payment_capture_id,
    capturedAmountRappen: row.captured_amount_rappen,
    releasedAmountRappen: row.released_amount_rappen,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

interface EventRow {
  id: string;
  transaction_id: string;
  status: string;
  message: string;
  metadata_json: string | null;
  created_at: string;
}

function toEvent(row: EventRow): FuelTransactionEvent {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    status: row.status as TransactionStatus,
    message: row.message,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    createdAt: row.created_at,
  };
}

export const transactionRepository = {
  create(input: {
    userId: string;
    stationId: string;
    stationName: string;
    stationAddress: string;
    pumpId: string;
    pumpLabel: string;
    fuelType: FuelType;
    paymentMethodId: string;
    maxAuthorizationAmountRappen: number;
  }): TransactionRecord {
    const id = newId("tx");
    const idempotencyKey = `${id}:root`;
    const now = nowIso();
    db.prepare(
      `INSERT INTO fuel_transactions (
        id, idempotency_key, user_id, station_id, pump_id, pump_label, station_name, station_address,
        fuel_type, payment_method_id, status, max_authorization_amount_rappen, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', ?, ?, ?)`,
    ).run(
      id,
      idempotencyKey,
      input.userId,
      input.stationId,
      input.pumpId,
      input.pumpLabel,
      input.stationName,
      input.stationAddress,
      input.fuelType,
      input.paymentMethodId,
      input.maxAuthorizationAmountRappen,
      now,
      now,
    );
    return this.findById(id)!;
  },

  findById(id: string): TransactionRecord | null {
    const row = db.prepare(`SELECT * FROM fuel_transactions WHERE id = ?`).get(id) as
      | TransactionRow
      | undefined;
    return row ? toTransaction(row) : null;
  },

  listForUser(userId: string): TransactionRecord[] {
    const rows = db
      .prepare(`SELECT * FROM fuel_transactions WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId) as unknown as TransactionRow[];
    return rows.map(toTransaction);
  },

  listAll(limit = 100): TransactionRecord[] {
    const rows = db
      .prepare(`SELECT * FROM fuel_transactions ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as unknown as TransactionRow[];
    return rows.map(toTransaction);
  },

  update(id: string, patch: Partial<TransactionRecord>): TransactionRecord {
    const current = this.findById(id);
    if (!current) throw new Error(`Transaction ${id} not found`);
    const merged = { ...current, ...patch, updatedAt: nowIso() };
    db.prepare(
      `UPDATE fuel_transactions SET
        status = ?, payment_authorization_id = ?, provider_fuel_session_id = ?,
        liters = ?, price_per_liter_milli_francs = ?, final_amount_rappen = ?,
        payment_capture_id = ?, captured_amount_rappen = ?, released_amount_rappen = ?,
        failure_reason = ?, updated_at = ?, completed_at = ?
      WHERE id = ?`,
    ).run(
      merged.status,
      merged.paymentAuthorizationId,
      merged.providerFuelSessionId,
      merged.liters,
      merged.pricePerLiterMilliFrancs,
      merged.finalAmountRappen,
      merged.paymentCaptureId,
      merged.capturedAmountRappen,
      merged.releasedAmountRappen,
      merged.failureReason,
      merged.updatedAt,
      merged.completedAt,
      id,
    );
    return this.findById(id)!;
  },

  addEvent(input: {
    transactionId: string;
    status: TransactionStatus;
    message: string;
    metadata?: Record<string, unknown> | null;
  }): FuelTransactionEvent {
    const id = newId("txevt");
    const createdAt = nowIso();
    db.prepare(
      `INSERT INTO fuel_transaction_events (id, transaction_id, status, message, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.transactionId,
      input.status,
      input.message,
      input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt,
    );
    return {
      id,
      transactionId: input.transactionId,
      status: input.status,
      message: input.message,
      metadata: input.metadata ?? null,
      createdAt,
    };
  },

  listEvents(transactionId: string): FuelTransactionEvent[] {
    const rows = db
      .prepare(`SELECT * FROM fuel_transaction_events WHERE transaction_id = ? ORDER BY created_at ASC`)
      .all(transactionId) as unknown as EventRow[];
    return rows.map(toEvent);
  },

  /**
   * Is there already an in-flight (past CREATED, not yet terminal)
   * transaction on this exact pump? Used to reject a second concurrent
   * authorization attempt at the TANKY layer, on top of the
   * FuelStationProvider's own pump-occupied check — belt and braces for
   * transaction isolation. CREATED itself doesn't count: a transaction that
   * was created but never progressed (client crashed, user abandoned the
   * payment screen) never touched the provider, so it must not permanently
   * block the pump for everyone else.
   */
  findActiveByPump(pumpId: string): TransactionRecord | null {
    const rows = db
      .prepare(`SELECT * FROM fuel_transactions WHERE pump_id = ? ORDER BY created_at DESC`)
      .all(pumpId) as unknown as TransactionRow[];
    const nonBlocking = new Set([
      "CREATED",
      "COMPLETED",
      "PAYMENT_FAILED",
      "PUMP_AUTHORIZATION_FAILED",
      "FUELING_FAILED",
      "PAYMENT_CAPTURE_FAILED",
      "TRANSACTION_CANCELLED",
      "TIMEOUT",
    ]);
    const active = rows.find((r) => !nonBlocking.has(r.status));
    return active ? toTransaction(active) : null;
  },
};
