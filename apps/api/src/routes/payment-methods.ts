import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { paymentMethodRepository } from "../repositories/payment-method-repository.js";

const addPaymentMethodSchema = z.object({
  brand: z.enum(["VISA", "MASTERCARD", "TWINT", "APPLE_PAY", "GOOGLE_PAY"]),
  last4: z.string().regex(/^\d{4}$/, "last4 must be 4 digits"),
  isDefault: z.boolean().optional(),
});

export async function paymentMethodRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/payment-methods", { preHandler: requireAuth }, async (req, reply) => {
    reply.send({ paymentMethods: paymentMethodRepository.listForUser(req.user!.sub) });
  });

  // MVP note: this endpoint never receives a real PAN. In production the
  // client tokenizes the card directly with the payment provider's SDK
  // (Stripe Elements / Apple Pay / TWINT SDK) and only the resulting token
  // ever reaches this server. Here we mint a mock token to stand in for
  // that, since brand/last4 is exactly the shape a real tokenization
  // response would already have handed us.
  app.post("/api/v1/payment-methods", { preHandler: requireAuth }, async (req, reply) => {
    const body = addPaymentMethodSchema.parse(req.body);
    const paymentMethod = paymentMethodRepository.create({
      userId: req.user!.sub,
      brand: body.brand,
      last4: body.last4,
      providerToken: `tok_mock_${randomUUID()}`,
      isDefault: body.isDefault,
    });
    reply.code(201).send({ paymentMethod });
  });
}
