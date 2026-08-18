/**
 * Core domain types shared by the TANKY backend and the TANKY app.
 *
 * Money is always represented as an integer number of Rappen (CHF cents) —
 * e.g. CHF 80.00 === 8000 — to avoid floating point drift in financial math.
 */

/** Integer number of Rappen (CHF cents). All settled payment amounts use this unit. */
export type Rappen = number;

/**
 * Integer thousandths of a franc (1 MilliFrancs = CHF 0.001). Swiss pump
 * prices are quoted to 3 decimals (e.g. CHF 1.699/L) — this unit preserves
 * that precision. Only ever converted down to Rappen (rounded) at the point
 * a final amount is charged.
 */
export type MilliFrancs = number;

export function milliFrancsToRappen(amountMilliFrancs: MilliFrancs): Rappen {
  return Math.round(amountMilliFrancs / 10);
}

export type FuelType = "PETROL_95" | "PETROL_98" | "DIESEL";

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  PETROL_95: "Bleifrei 95",
  PETROL_98: "Bleifrei 98",
  DIESEL: "Diesel",
};

export interface FuelProduct {
  id: string;
  fuelType: FuelType;
  pricePerLiterMilliFrancs: MilliFrancs;
}

export type PumpStatus = "AVAILABLE" | "OCCUPIED" | "OFFLINE";

export interface Pump {
  id: string;
  stationId: string;
  label: string; // e.g. "6"
  status: PumpStatus;
  supportedFuelTypes: FuelType[];
}

export interface FuelStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  tankyEnabled: boolean;
  opens24h: boolean;
  fuelProducts: FuelProduct[];
  pumps: Pump[];
}

export type PaymentMethodBrand =
  | "VISA"
  | "MASTERCARD"
  | "TWINT"
  | "APPLE_PAY"
  | "GOOGLE_PAY";

export interface PaymentMethod {
  id: string;
  userId: string;
  brand: PaymentMethodBrand;
  /** Never a full PAN — last 4 digits only, sourced from the payment provider token. */
  last4: string;
  providerToken: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Full lifecycle of a single fuel transaction. Every transition is validated
 * and persisted server-side — the client only ever observes this state, it
 * never sets it directly.
 */
export type TransactionStatus =
  | "CREATED"
  | "PAYMENT_AUTHORIZING"
  | "PAYMENT_AUTHORIZED"
  | "PUMP_AUTHORIZING"
  | "PUMP_AUTHORIZED"
  | "FUELING"
  | "FUELING_COMPLETED"
  | "FINAL_AMOUNT_RECEIVED"
  | "PAYMENT_CAPTURING"
  | "PAYMENT_CAPTURED"
  | "COMPLETED"
  // terminal failure / off-ramp states
  | "PAYMENT_FAILED"
  | "PUMP_AUTHORIZATION_FAILED"
  | "FUELING_FAILED"
  | "PAYMENT_CAPTURE_FAILED"
  | "TRANSACTION_CANCELLED"
  | "TIMEOUT";

export const TERMINAL_TRANSACTION_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  "COMPLETED",
  "PAYMENT_FAILED",
  "PUMP_AUTHORIZATION_FAILED",
  "FUELING_FAILED",
  "PAYMENT_CAPTURE_FAILED",
  "TRANSACTION_CANCELLED",
  "TIMEOUT",
]);

export function isTerminalStatus(status: TransactionStatus): boolean {
  return TERMINAL_TRANSACTION_STATUSES.has(status);
}

export interface FuelTransaction {
  id: string;
  userId: string;
  stationId: string;
  pumpId: string;
  fuelType: FuelType;
  paymentMethodId: string;
  status: TransactionStatus;

  maxAuthorizationAmountRappen: Rappen;
  paymentAuthorizationId: string | null;

  providerFuelSessionId: string | null;

  liters: number | null;
  pricePerLiterMilliFrancs: MilliFrancs | null;
  finalAmountRappen: Rappen | null;

  paymentCaptureId: string | null;
  capturedAmountRappen: Rappen | null;
  releasedAmountRappen: Rappen | null;

  idempotencyKey: string;

  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface FuelTransactionEvent {
  id: string;
  transactionId: string;
  status: TransactionStatus;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Receipt {
  transactionId: string;
  stationName: string;
  stationAddress: string;
  pumpLabel: string;
  fuelType: FuelType;
  liters: number;
  pricePerLiterMilliFrancs: MilliFrancs;
  totalAmountRappen: Rappen;
  paymentMethodLabel: string;
  issuedAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  licensePlate: string;
  fuelType: FuelType;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
}
