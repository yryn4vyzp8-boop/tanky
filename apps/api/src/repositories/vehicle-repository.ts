import type { FuelType, Vehicle } from "@tanky/domain";
import { db } from "../db/client.js";
import { newId, nowIso } from "../ids.js";

interface VehicleRow {
  id: string;
  user_id: string;
  make: string;
  model: string;
  license_plate: string;
  fuel_type: string;
}

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    userId: row.user_id,
    make: row.make,
    model: row.model,
    licensePlate: row.license_plate,
    fuelType: row.fuel_type as FuelType,
  };
}

export const vehicleRepository = {
  create(input: {
    userId: string;
    make: string;
    model: string;
    licensePlate: string;
    fuelType: FuelType;
  }): Vehicle {
    const id = newId("vehicle");
    db.prepare(
      `INSERT INTO vehicles (id, user_id, make, model, license_plate, fuel_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.userId, input.make, input.model, input.licensePlate, input.fuelType, nowIso());
    return { id, userId: input.userId, make: input.make, model: input.model, licensePlate: input.licensePlate, fuelType: input.fuelType };
  },

  listForUser(userId: string): Vehicle[] {
    const rows = db
      .prepare(`SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId) as unknown as VehicleRow[];
    return rows.map(toVehicle);
  },
};
