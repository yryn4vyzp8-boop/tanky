import type { FuelType } from "@tanky/domain";
import { FUEL_TYPE_LABELS } from "@tanky/domain";

export function formatChf(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2)}`;
}

export function formatLiters(liters: number): string {
  return `${liters.toFixed(2)} L`;
}

export function formatPricePerLiter(milliFrancs: number): string {
  return `CHF ${(milliFrancs / 1000).toFixed(3)}/L`;
}

export function fuelTypeLabel(fuelType: FuelType): string {
  return FUEL_TYPE_LABELS[fuelType];
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
