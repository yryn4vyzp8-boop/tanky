import type { FastifyInstance } from "fastify";
import { fuelStationProvider } from "../providers.js";
import { Errors } from "../errors.js";

export async function stationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/stations", async (_req, reply) => {
    const stations = await fuelStationProvider.getStations();
    reply.send({ stations });
  });

  app.get<{ Params: { id: string } }>("/api/v1/stations/:id", async (req, reply) => {
    const station = await fuelStationProvider.getStation(req.params.id);
    if (!station) throw Errors.notFound("Station not found");
    reply.send({ station });
  });
}
