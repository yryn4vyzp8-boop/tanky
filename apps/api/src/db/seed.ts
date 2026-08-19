import { userRepository } from "../repositories/user-repository.js";
import { paymentMethodRepository } from "../repositories/payment-method-repository.js";
import { vehicleRepository } from "../repositories/vehicle-repository.js";
import { hashPassword } from "../auth/password.js";
import { isStripeEnabled } from "../providers.js";

const DEMO_PASSWORD = "tanky-demo-2026";

/**
 * Stripe publishes these as static, reusable PaymentMethod ids specifically
 * for server-side test-mode API calls (https://stripe.com/docs/testing) —
 * no Elements/tokenization flow needed to use them. Real PaymentIntents
 * created against them succeed exactly like a real test-mode card would.
 * A mock-token id like "tok_mock_seed_visa" is not a real Stripe object and
 * fails with an invalid-payment-method error the moment Stripe is the
 * active provider, so which one we seed has to follow the same switch.
 */
const STRIPE_TEST_PAYMENT_METHOD = {
  VISA: "pm_card_visa",
  MASTERCARD: "pm_card_mastercard",
} as const;

/** Seeds a ready-to-drive demo account so the app is usable within seconds of first start. */
export function seedDemoData(): void {
  if (userRepository.count() > 0) return;

  const demoUser = userRepository.create({
    email: "demo@tanky.ch",
    passwordHash: hashPassword(DEMO_PASSWORD),
    firstName: "Max",
    lastName: "Muster",
    phone: "+41 79 123 45 67",
  });

  userRepository.create({
    email: "admin@tanky.ch",
    passwordHash: hashPassword(DEMO_PASSWORD),
    firstName: "TANKY",
    lastName: "Admin",
    isAdmin: true,
  });

  paymentMethodRepository.create({
    userId: demoUser.id,
    brand: "VISA",
    last4: "4242",
    providerToken: isStripeEnabled ? STRIPE_TEST_PAYMENT_METHOD.VISA : "tok_mock_seed_visa",
    isDefault: true,
  });
  paymentMethodRepository.create({
    userId: demoUser.id,
    brand: "MASTERCARD",
    last4: "4444",
    providerToken: isStripeEnabled ? STRIPE_TEST_PAYMENT_METHOD.MASTERCARD : "tok_mock_seed_mastercard",
  });
  // TWINT has no static test-mode PaymentMethod id to seed against Stripe
  // (it's a redirect-based method, not a saved reusable card) — only seed
  // it in mock mode, where every provider token is fake anyway.
  if (!isStripeEnabled) {
    paymentMethodRepository.create({
      userId: demoUser.id,
      brand: "TWINT",
      last4: "0099",
      providerToken: "tok_mock_seed_twint",
    });
  }

  vehicleRepository.create({
    userId: demoUser.id,
    make: "Mercedes-AMG",
    model: "GLC 63",
    licensePlate: "LU 123 456",
    fuelType: "PETROL_98",
  });

  // eslint-disable-next-line no-console
  console.log(
    `[tanky] Seeded demo account demo@tanky.ch / ${DEMO_PASSWORD} and admin@tanky.ch / ${DEMO_PASSWORD}`,
  );
}
