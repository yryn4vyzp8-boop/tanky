import {
  DemoControlRegistry,
  MockFuelStationProvider,
  MockPaymentProvider,
  type FuelStationProvider,
  type PaymentProvider,
} from "@tanky/domain";
import { config } from "./config.js";
import { StripePaymentProvider } from "./providers/stripe-payment-provider.js";

/**
 * The one place TANKY's provider implementations are wired up. Swapping to
 * real providers later means changing only this file — nothing in
 * services/ or routes/ knows whether it's talking to a mock or the real
 * thing, they only ever see the PaymentProvider / FuelStationProvider
 * interfaces from @tanky/domain.
 */
export const demoControl = new DemoControlRegistry();

function createPaymentProvider(): PaymentProvider {
  if (config.paymentProvider === "stripe") {
    if (!config.stripeSecretKey) {
      throw new Error(
        "TANKY_PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY to be set (a sk_test_... key for sandbox use).",
      );
    }
    return new StripePaymentProvider(config.stripeSecretKey);
  }
  return new MockPaymentProvider(demoControl);
}

export const paymentProvider: PaymentProvider = createPaymentProvider();
export const fuelStationProvider: FuelStationProvider = new MockFuelStationProvider(
  demoControl,
);

export const isDemoMode = config.demoMode;
export const isStripeEnabled = config.paymentProvider === "stripe";
