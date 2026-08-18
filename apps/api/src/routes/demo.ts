import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { demoControl, isDemoMode } from "../providers.js";

const scenarioSchema = z.object({
  scenario: z.enum([
    "NONE",
    "PAYMENT_AUTHORIZATION_FAILURE",
    "PAYMENT_CAPTURE_FAILURE",
    "PUMP_FAILURE",
    "NETWORK_ERROR",
    "FORCE_COMPLETE_FUELING",
  ]),
});

/**
 * Demo Control Panel endpoints. These let an operator steer a live demo
 * transaction toward a specific failure mode (or fast-forward fueling to
 * completion) without bypassing the real transaction engine — arming a
 * scenario here only changes what the Mock providers return on their next
 * relevant call; every state transition still goes through the same
 * transaction service and state machine as a normal run.
 */
export async function demoRoutes(app: FastifyInstance): Promise<void> {
  if (!isDemoMode) return;

  app.get("/api/v1/demo/status", async (_req, reply) => {
    reply.send({ demoMode: true, armedScenario: demoControl.current() });
  });

  app.post("/api/v1/demo/scenario", async (req, reply) => {
    const body = scenarioSchema.parse(req.body);
    demoControl.arm(body.scenario);
    reply.send({ armedScenario: demoControl.current() });
  });

  app.post("/api/v1/demo/reset", async (_req, reply) => {
    demoControl.reset();
    reply.send({ armedScenario: demoControl.current() });
  });
}
