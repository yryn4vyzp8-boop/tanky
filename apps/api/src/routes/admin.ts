import type { FastifyInstance } from "fastify";
import { isTerminalStatus } from "@tanky/domain";
import { requireAdmin } from "../auth/middleware.js";
import { transactionRepository } from "../repositories/transaction-repository.js";
import { userRepository } from "../repositories/user-repository.js";

const FAILURE_STATUSES = new Set([
  "PAYMENT_FAILED",
  "PUMP_AUTHORIZATION_FAILED",
  "FUELING_FAILED",
  "PAYMENT_CAPTURE_FAILED",
  "TIMEOUT",
]);

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

  app.get("/api/v1/admin/summary", async (_req, reply) => {
    const transactions = transactionRepository.listAll(1000);
    const completed = transactions.filter((t) => t.status === "COMPLETED");
    const failed = transactions.filter((t) => FAILURE_STATUSES.has(t.status));
    const active = transactions.filter((t) => !isTerminalStatus(t.status));
    const totalRevenueRappen = completed.reduce(
      (sum, t) => sum + (t.capturedAmountRappen ?? 0),
      0,
    );
    const totalLiters = completed.reduce((sum, t) => sum + (t.liters ?? 0), 0);

    reply.send({
      userCount: userRepository.count(),
      transactionCount: transactions.length,
      activeTransactionCount: active.length,
      completedTransactionCount: completed.length,
      failedTransactionCount: failed.length,
      failureRate: transactions.length ? failed.length / transactions.length : 0,
      totalRevenueRappen,
      totalLiters,
      averageTransactionAmountRappen: completed.length
        ? Math.round(totalRevenueRappen / completed.length)
        : 0,
    });
  });

  app.get("/api/v1/admin/transactions", async (_req, reply) => {
    reply.send({ transactions: transactionRepository.listAll(200) });
  });

  app.get("/api/v1/admin/users", async (_req, reply) => {
    reply.send({ users: userRepository.listAll() });
  });

  app.get("/api/v1/admin/errors", async (_req, reply) => {
    const transactions = transactionRepository
      .listAll(1000)
      .filter((t) => FAILURE_STATUSES.has(t.status));
    reply.send({ transactions });
  });
}
