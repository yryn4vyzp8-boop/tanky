import { randomUUID } from "node:crypto";
import type { FuelStation, Pump } from "../types.js";
import { createSeedStations } from "../seed-data.js";
import type {
  AuthorizePumpInput,
  AuthorizePumpResult,
  FinalizeFuelTransactionResult,
  FuelingDataResult,
  FuelStationProvider,
  FuelTransactionStatusResult,
  StartFuelTransactionInput,
  StartFuelTransactionResult,
} from "./fuel-station-provider.js";
import { DemoControlRegistry } from "./demo-control.js";

const FUELING_DURATION_MS = 7_000;

interface FuelSession {
  id: string;
  stationId: string;
  pumpId: string;
  pricePerLiterMilliFrancs: number;
  maxAmountRappen: number;
  targetAmountRappen: number;
  status: "AUTHORIZED" | "FUELING" | "COMPLETED" | "FAILED";
  startedAt: number | null;
  forceComplete: boolean;
}

/**
 * Fully simulated forecourt/pump network. Deterministic and safe — it never
 * talks to real hardware. Honors the DemoControlRegistry so the Demo Control
 * Panel can force a pump failure, simulate the station being unreachable, or
 * fast-forward a fueling session straight to completion.
 */
export class MockFuelStationProvider implements FuelStationProvider {
  readonly name = "mock-fuel-station-provider";

  private stations: FuelStation[];
  private sessions = new Map<string, FuelSession>();

  constructor(private readonly demoControl?: DemoControlRegistry) {
    this.stations = createSeedStations();
  }

  async getStations(): Promise<FuelStation[]> {
    return this.stations;
  }

  async getStation(stationId: string): Promise<FuelStation | null> {
    return this.stations.find((s) => s.id === stationId) ?? null;
  }

  async getPumps(stationId: string): Promise<Pump[]> {
    const station = await this.getStation(stationId);
    return station?.pumps ?? [];
  }

  async authorizePump(input: AuthorizePumpInput): Promise<AuthorizePumpResult> {
    const scenario = this.demoControl?.consumeIfRelevant("PUMP_FAILURE", "NETWORK_ERROR");
    if (scenario === "NETWORK_ERROR") {
      throw new Error("Simulated network error reaching station (demo)");
    }
    if (scenario === "PUMP_FAILURE") {
      return { outcome: "DECLINED", reason: "Pump reported a fault (demo)" };
    }

    const station = this.stations.find((s) => s.id === input.stationId);
    const pump = station?.pumps.find((p) => p.id === input.pumpId);
    if (!station || !pump) {
      return { outcome: "PUMP_UNAVAILABLE", reason: "Unknown pump" };
    }
    if (pump.status !== "AVAILABLE") {
      return { outcome: "PUMP_UNAVAILABLE", reason: `Pump ${pump.label} is not available` };
    }
    if (!pump.supportedFuelTypes.includes(input.fuelType)) {
      return { outcome: "DECLINED", reason: "Pump does not support this fuel type" };
    }

    const product = station.fuelProducts.find((p) => p.fuelType === input.fuelType);
    if (!product) {
      return { outcome: "DECLINED", reason: "Fuel product not available at this station" };
    }

    await simulateLatency();
    pump.status = "OCCUPIED";

    const sessionId = `fs_${randomUUID()}`;
    const fillFraction = 0.45 + Math.random() * 0.2; // realistic partial fill vs. the pre-auth cap
    this.sessions.set(sessionId, {
      id: sessionId,
      stationId: station.id,
      pumpId: pump.id,
      pricePerLiterMilliFrancs: product.pricePerLiterMilliFrancs,
      maxAmountRappen: input.maxAmountRappen,
      targetAmountRappen: Math.max(1, Math.round(input.maxAmountRappen * fillFraction)),
      status: "AUTHORIZED",
      startedAt: null,
      forceComplete: false,
    });

    return { outcome: "AUTHORIZED", providerFuelSessionId: sessionId };
  }

  async startFuelTransaction(
    input: StartFuelTransactionInput,
  ): Promise<StartFuelTransactionResult> {
    const session = this.sessions.get(input.providerFuelSessionId);
    if (!session || session.status !== "AUTHORIZED") {
      return { outcome: "FAILED", reason: "No authorized session to start" };
    }
    await simulateLatency();
    session.status = "FUELING";
    session.startedAt = Date.now();
    return { outcome: "STARTED" };
  }

  async getFuelTransactionStatus(
    providerFuelSessionId: string,
  ): Promise<FuelTransactionStatusResult> {
    const session = this.sessions.get(providerFuelSessionId);
    if (!session) return { status: "FAILED", reason: "Unknown session" };
    if (session.status === "AUTHORIZED") return { status: "AUTHORIZED" };
    if (session.status === "FAILED") return { status: "FAILED", reason: "Session failed" };
    const data = this.computeFuelingProgress(session);
    return { status: data.isComplete ? "COMPLETED" : "FUELING" };
  }

  async getFuelingData(providerFuelSessionId: string): Promise<FuelingDataResult> {
    const session = this.sessions.get(providerFuelSessionId);
    if (!session) {
      return { liters: 0, amountRappen: 0, pricePerLiterMilliFrancs: 0, isComplete: true };
    }
    if (this.demoControl?.consumeIfRelevant("FORCE_COMPLETE_FUELING")) {
      session.forceComplete = true;
    }
    return this.computeFuelingProgress(session);
  }

  async finalizeFuelTransaction(
    providerFuelSessionId: string,
  ): Promise<FinalizeFuelTransactionResult> {
    const session = this.sessions.get(providerFuelSessionId);
    if (!session) return { outcome: "FAILED", reason: "Unknown session" };

    const progress = this.computeFuelingProgress(session);
    if (!progress.isComplete) {
      return { outcome: "FAILED", reason: "Fueling is still in progress" };
    }

    await simulateLatency();
    session.status = "COMPLETED";
    const station = this.stations.find((s) => s.id === session.stationId);
    const pump = station?.pumps.find((p) => p.id === session.pumpId);
    if (pump) pump.status = "AVAILABLE";

    return {
      outcome: "FINALIZED",
      liters: progress.liters,
      pricePerLiterMilliFrancs: session.pricePerLiterMilliFrancs,
      finalAmountRappen: progress.amountRappen,
    };
  }

  async cancelFuelTransaction(providerFuelSessionId: string): Promise<{ cancelled: true }> {
    const session = this.sessions.get(providerFuelSessionId);
    if (session) {
      session.status = "FAILED";
      const station = this.stations.find((s) => s.id === session.stationId);
      const pump = station?.pumps.find((p) => p.id === session.pumpId);
      if (pump) pump.status = "AVAILABLE";
    }
    return { cancelled: true };
  }

  private computeFuelingProgress(session: FuelSession): FuelingDataResult {
    if (session.status === "COMPLETED" || session.forceComplete) {
      const liters = round2(
        (session.targetAmountRappen * 10) / session.pricePerLiterMilliFrancs,
      );
      return {
        liters,
        amountRappen: session.targetAmountRappen,
        pricePerLiterMilliFrancs: session.pricePerLiterMilliFrancs,
        isComplete: true,
      };
    }
    if (session.status !== "FUELING" || session.startedAt === null) {
      return {
        liters: 0,
        amountRappen: 0,
        pricePerLiterMilliFrancs: session.pricePerLiterMilliFrancs,
        isComplete: false,
      };
    }
    const elapsedMs = Date.now() - session.startedAt;
    const fraction = Math.min(1, elapsedMs / FUELING_DURATION_MS);
    const amountRappen = Math.round(session.targetAmountRappen * fraction);
    const liters = round2((amountRappen * 10) / session.pricePerLiterMilliFrancs);
    return {
      liters,
      amountRappen,
      pricePerLiterMilliFrancs: session.pricePerLiterMilliFrancs,
      isComplete: fraction >= 1,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 200));
}
