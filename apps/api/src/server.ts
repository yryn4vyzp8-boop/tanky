import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { runMigrations } from "./db/client.js";
import { seedDemoData } from "./db/seed.js";
import { isDemoMode, isStripeEnabled } from "./providers.js";
import { HttpError } from "./errors.js";
import { InvalidTransactionTransitionError } from "@tanky/domain";
import { ZodError } from "zod";

import { authRoutes } from "./routes/auth.js";
import { stationRoutes } from "./routes/stations.js";
import { vehicleRoutes } from "./routes/vehicles.js";
import { paymentMethodRoutes } from "./routes/payment-methods.js";
import { transactionRoutes } from "./routes/transactions.js";
import { demoRoutes } from "./routes/demo.js";
import { adminRoutes } from "./routes/admin.js";

runMigrations();
seedDemoData();

const app = Fastify({ logger: true });

await app.register(cors, { origin: config.corsOrigin });

app.get("/api/v1/health", async () => ({
  status: "ok",
  demoMode: isDemoMode,
  stripeEnabled: isStripeEnabled,
  stripePublishableKey: isStripeEnabled ? config.stripePublishableKey : null,
  service: "tanky-api",
}));

await app.register(authRoutes);
await app.register(stationRoutes);
await app.register(vehicleRoutes);
await app.register(paymentMethodRoutes);
await app.register(transactionRoutes);
await app.register(demoRoutes);
await app.register(adminRoutes);

app.setErrorHandler((error, _req, reply) => {
  if (error instanceof HttpError) {
    reply.code(error.statusCode).send({ error: error.code, message: error.message });
    return;
  }
  if (error instanceof InvalidTransactionTransitionError) {
    reply.code(409).send({ error: "INVALID_TRANSITION", message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    reply.code(400).send({ error: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid input", issues: error.issues });
    return;
  }
  app.log.error(error);
  reply.code(500).send({ error: "INTERNAL_ERROR", message: "Something went wrong" });
});

app.listen({ port: config.port, host: config.host }).then(() => {
  app.log.info(
    `TANKY API listening on http://localhost:${config.port} (demoMode=${isDemoMode})`,
  );
});
