import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { transactionService } from "../services/transaction-service.js";

const createTransactionSchema = z.object({
  stationId: z.string().min(1),
  pumpId: z.string().min(1),
  fuelType: z.enum(["PETROL_95", "PETROL_98", "DIESEL"]),
  paymentMethodId: z.string().min(1),
  maxAuthorizationAmountRappen: z.number().int().positive(),
});

export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/api/v1/transactions", async (req, reply) => {
    reply.send({ transactions: transactionService.listForUser(req.user!.sub) });
  });

  app.post("/api/v1/transactions", async (req, reply) => {
    const body = createTransactionSchema.parse(req.body);
    const tx = await transactionService.create(req.user!.sub, body);
    reply.code(201).send({ transaction: tx });
  });

  app.get<{ Params: { id: string } }>("/api/v1/transactions/:id", async (req, reply) => {
    const tx = transactionService.getForUser(req.params.id, req.user!.sub);
    reply.send({ transaction: tx });
  });

  app.get<{ Params: { id: string } }>("/api/v1/transactions/:id/events", async (req, reply) => {
    const events = transactionService.listEvents(req.params.id, req.user!.sub);
    reply.send({ events });
  });

  app.post<{ Params: { id: string } }>(
    "/api/v1/transactions/:id/authorize",
    async (req, reply) => {
      const tx = await transactionService.authorizeAndUnlockPump(req.params.id, req.user!.sub);
      reply.send({ transaction: tx });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/transactions/:id/start-fueling",
    async (req, reply) => {
      const tx = await transactionService.startFueling(req.params.id, req.user!.sub);
      reply.send({ transaction: tx });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/transactions/:id/fueling",
    async (req, reply) => {
      const progress = await transactionService.getFuelingProgress(req.params.id, req.user!.sub);
      reply.send(progress);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/transactions/:id/finalize",
    async (req, reply) => {
      const tx = await transactionService.finalizeAndCapture(req.params.id, req.user!.sub);
      reply.send({ transaction: tx });
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/v1/transactions/:id/cancel",
    async (req, reply) => {
      const tx = await transactionService.cancel(req.params.id, req.user!.sub);
      reply.send({ transaction: tx });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/transactions/:id/receipt",
    async (req, reply) => {
      const receipt = transactionService.getReceipt(req.params.id, req.user!.sub);
      reply.send({ receipt });
    },
  );
}
