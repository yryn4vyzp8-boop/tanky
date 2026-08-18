import { userRepository } from "../repositories/user-repository.js";
import { paymentMethodRepository } from "../repositories/payment-method-repository.js";
import { vehicleRepository } from "../repositories/vehicle-repository.js";
import { hashPassword } from "../auth/password.js";

const DEMO_PASSWORD = "tanky-demo-2026";

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
    last4: "1234",
    providerToken: "tok_mock_seed_visa",
    isDefault: true,
  });
  paymentMethodRepository.create({
    userId: demoUser.id,
    brand: "MASTERCARD",
    last4: "5588",
    providerToken: "tok_mock_seed_mastercard",
  });
  paymentMethodRepository.create({
    userId: demoUser.id,
    brand: "TWINT",
    last4: "0099",
    providerToken: "tok_mock_seed_twint",
  });

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
