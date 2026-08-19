import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "tanky-local-dev-secret-do-not-use-in-production",
  jwtExpiresIn: "7d",
  dbPath: process.env.TANKY_DB_PATH ?? join(__dirname, "..", "data", "tanky.db"),
  /**
   * Demo mode is what makes the Mock providers active and exposes the
   * /api/v1/demo/* control-panel endpoints. It is ON by default because this
   * MVP ships without any real payment/forecourt credentials — there is no
   * "real provider" to fall back to yet. Flip this only once real provider
   * implementations exist.
   */
  demoMode: process.env.TANKY_DEMO_MODE !== "false",
  corsOrigin: process.env.TANKY_CORS_ORIGIN ?? "*",
  /**
   * "mock" (default) uses MockPaymentProvider — fully simulated, can never
   * move money. "stripe" uses real Stripe PaymentIntents; whether that's a
   * test-mode or live charge depends entirely on whether stripeSecretKey is
   * a sk_test_... or sk_live_... key — this app is never configured with a
   * live key.
   */
  paymentProvider: (process.env.TANKY_PAYMENT_PROVIDER ?? "mock") as "mock" | "stripe",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? null,
  /** Not secret — safe to serve to the client (see GET /api/v1/health). */
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
} as const;
