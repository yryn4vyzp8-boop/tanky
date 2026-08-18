import type { FuelStation, FuelType, MilliFrancs } from "./types.js";

const FUEL_PRODUCT_SET: { fuelType: FuelType; pricePerLiterMilliFrancs: MilliFrancs }[] = [
  { fuelType: "PETROL_95", pricePerLiterMilliFrancs: 1699 },
  { fuelType: "PETROL_98", pricePerLiterMilliFrancs: 1799 },
  { fuelType: "DIESEL", pricePerLiterMilliFrancs: 1789 },
];

function makePumps(stationId: string, count: number, fuelTypes: FuelType[]) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${stationId}-pump-${i + 1}`,
    stationId,
    label: String(i + 1),
    status: "AVAILABLE" as const,
    supportedFuelTypes: fuelTypes,
  }));
}

function priceVariant(base: MilliFrancs, deltaMilliFrancs: number): MilliFrancs {
  return base + deltaMilliFrancs;
}

function makeStation(input: {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  pumpCount: number;
  priceDeltaMilliFrancs: number;
}): FuelStation {
  const fuelTypes = FUEL_PRODUCT_SET.map((p) => p.fuelType);
  return {
    id: input.id,
    name: input.name,
    brand: input.brand,
    address: input.address,
    city: input.city,
    lat: input.lat,
    lng: input.lng,
    tankyEnabled: true,
    opens24h: true,
    fuelProducts: FUEL_PRODUCT_SET.map((p) => ({
      id: `${input.id}-${p.fuelType.toLowerCase()}`,
      fuelType: p.fuelType,
      pricePerLiterMilliFrancs: priceVariant(
        p.pricePerLiterMilliFrancs,
        input.priceDeltaMilliFrancs,
      ),
    })),
    pumps: makePumps(input.id, input.pumpCount, fuelTypes),
  };
}

/**
 * Realistic-but-fictional Swiss demo stations. Names are clearly generic
 * ("Example Fuel Station ...") — no real station brand or address is used.
 */
export function createSeedStations(): FuelStation[] {
  return [
    makeStation({
      id: "station-luzern",
      name: "Example Fuel Station Luzern",
      brand: "TANKY Partner",
      address: "Seebrücke 12",
      city: "Luzern",
      lat: 47.0505,
      lng: 8.3064,
      pumpCount: 8,
      priceDeltaMilliFrancs: 0,
    }),
    makeStation({
      id: "station-zug",
      name: "Example Fuel Station Zug",
      brand: "TANKY Partner",
      address: "Baarerstrasse 45",
      city: "Zug",
      lat: 47.1662,
      lng: 8.5155,
      pumpCount: 6,
      priceDeltaMilliFrancs: 30,
    }),
    makeStation({
      id: "station-zurich",
      name: "Example Fuel Station Zürich",
      brand: "TANKY Partner",
      address: "Hardstrasse 201",
      city: "Zürich",
      lat: 47.3833,
      lng: 8.5217,
      pumpCount: 12,
      priceDeltaMilliFrancs: -10,
    }),
    makeStation({
      id: "station-bern",
      name: "Example Fuel Station Bern",
      brand: "TANKY Partner",
      address: "Bolligenstrasse 89",
      city: "Bern",
      lat: 46.9530,
      lng: 7.4474,
      pumpCount: 10,
      priceDeltaMilliFrancs: -20,
    }),
  ];
}
