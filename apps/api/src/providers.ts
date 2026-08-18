import {
  DemoControlRegistry,
  MockFuelStationProvider,
  MockPaymentProvider,
  type FuelStationProvider,
  type PaymentProvider,
} from "@tanky/domain";
import { config } from "./config.js";

/**
 * The one place TANKY's provider implementations are wired up. Swapping to
 * real providers later means changing only this file — nothing in
 * services/ or routes/ knows whether it's talking to a mock or the real
 * thing, they only ever see the PaymentProvider / FuelStationProvider
 * interfaces from @tanky/domain.
 */
export const demoControl = new DemoControlRegistry();

export const paymentProvider: PaymentProvider = new MockPaymentProvider(demoControl);
export const fuelStationProvider: FuelStationProvider = new MockFuelStationProvider(
  demoControl,
);

export const isDemoMode = config.demoMode;
