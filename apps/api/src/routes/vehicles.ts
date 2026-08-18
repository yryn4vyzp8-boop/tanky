import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { vehicleRepository } from "../repositories/vehicle-repository.js";

const createVehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  licensePlate: z.string().min(1),
  fuelType: z.enum(["PETROL_95", "PETROL_98", "DIESEL"]),
});

export async function vehicleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/vehicles", { preHandler: requireAuth }, async (req, reply) => {
    reply.send({ vehicles: vehicleRepository.listForUser(req.user!.sub) });
  });

  app.post("/api/v1/vehicles", { preHandler: requireAuth }, async (req, reply) => {
    const body = createVehicleSchema.parse(req.body);
    const vehicle = vehicleRepository.create({ userId: req.user!.sub, ...body });
    reply.code(201).send({ vehicle });
  });
}
