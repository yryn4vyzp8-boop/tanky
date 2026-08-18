import type { FuelStation, FuelType, MilliFrancs, Pump, Rappen } from "../types.js";

/**
 * Abstraction over a forecourt/station network. TANKY never talks to a pump
 * controller directly from this codebase — every station operator (or, in
 * production, a real forecourt integration such as Wayne/Gilbarco/Tokheim
 * via a site controller) is reached only through an implementation of this
 * interface, so new station networks can be onboarded without touching
 * transaction logic.
 */
export interface FuelStationProvider {
  readonly name: string;

  getStations(): Promise<FuelStation[]>;
  getStation(stationId: string): Promise<FuelStation | null>;
  getPumps(stationId: string): Promise<Pump[]>;

  /**
   * Reserves a pump for a single transaction ahead of fueling. This is the
   * only thing that makes a pump "ready to dispense" — the client can never
   * unlock a pump itself.
   */
  authorizePump(input: AuthorizePumpInput): Promise<AuthorizePumpResult>;

  /** Begins a fuel dispense session on an already-authorized pump. */
  startFuelTransaction(
    input: StartFuelTransactionInput,
  ): Promise<StartFuelTransactionResult>;

  /** Polls current dispense progress (liters/amount so far, still fueling or done). */
  getFuelTransactionStatus(
    providerFuelSessionId: string,
  ): Promise<FuelTransactionStatusResult>;

  /** Live fueling readout, e.g. for a UI ticking counter. */
  getFuelingData(providerFuelSessionId: string): Promise<FuelingDataResult>;

  /** Confirms the final dispensed amount once fueling has stopped. */
  finalizeFuelTransaction(
    providerFuelSessionId: string,
  ): Promise<FinalizeFuelTransactionResult>;

  /** Cancels a reserved/in-progress session (e.g. user walks away, timeout). */
  cancelFuelTransaction(providerFuelSessionId: string): Promise<{ cancelled: true }>;
}

export interface AuthorizePumpInput {
  stationId: string;
  pumpId: string;
  fuelType: FuelType;
  maxAmountRappen: Rappen;
  idempotencyKey: string;
}

export type AuthorizePumpResult =
  | { outcome: "AUTHORIZED"; providerFuelSessionId: string }
  | { outcome: "PUMP_UNAVAILABLE"; reason: string }
  | { outcome: "DECLINED"; reason: string };

export interface StartFuelTransactionInput {
  providerFuelSessionId: string;
}

export type StartFuelTransactionResult =
  | { outcome: "STARTED" }
  | { outcome: "FAILED"; reason: string };

export type FuelTransactionStatusResult =
  | { status: "AUTHORIZED" }
  | { status: "FUELING" }
  | { status: "COMPLETED" }
  | { status: "FAILED"; reason: string };

export interface FuelingDataResult {
  liters: number;
  amountRappen: Rappen;
  pricePerLiterMilliFrancs: MilliFrancs;
  isComplete: boolean;
}

export type FinalizeFuelTransactionResult =
  | {
      outcome: "FINALIZED";
      liters: number;
      pricePerLiterMilliFrancs: MilliFrancs;
      finalAmountRappen: Rappen;
    }
  | { outcome: "FAILED"; reason: string };
