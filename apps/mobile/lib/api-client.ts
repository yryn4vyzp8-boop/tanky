import type {
  FuelStation,
  FuelTransaction,
  FuelTransactionEvent,
  FuelType,
  PaymentMethod,
  PaymentMethodBrand,
  Receipt,
  User,
  Vehicle,
} from "@tanky/domain";
import { tokenStorage } from "./storage";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Mirrors the API's TransactionRecord: a FuelTransaction plus a few display fields snapshotted at creation time. */
export interface TransactionRecord extends FuelTransaction {
  stationName: string;
  stationAddress: string;
  pumpLabel: string;
  failureReason: string | null;
}

export interface FuelingProgress {
  liters: number;
  amountRappen: number;
  pricePerLiterMilliFrancs: number;
  isComplete: boolean;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await tokenStorage.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "UNKNOWN", body.message ?? "Request failed");
  }
  return body as T;
}

export const api = {
  auth: {
    register: (input: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
      request<{ token: string; user: User }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    login: (input: { email: string; password: string }) =>
      request<{ token: string; user: User }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    me: () => request<{ user: User; isAdmin: boolean }>("/api/v1/auth/me"),
  },

  stations: {
    list: () => request<{ stations: FuelStation[] }>("/api/v1/stations"),
    get: (id: string) => request<{ station: FuelStation }>(`/api/v1/stations/${id}`),
  },

  vehicles: {
    list: () => request<{ vehicles: Vehicle[] }>("/api/v1/vehicles"),
    create: (input: { make: string; model: string; licensePlate: string; fuelType: FuelType }) =>
      request<{ vehicle: Vehicle }>("/api/v1/vehicles", { method: "POST", body: JSON.stringify(input) }),
  },

  paymentMethods: {
    list: () => request<{ paymentMethods: PaymentMethod[] }>("/api/v1/payment-methods"),
    create: (input: { brand: PaymentMethodBrand; last4: string; isDefault?: boolean }) =>
      request<{ paymentMethod: PaymentMethod }>("/api/v1/payment-methods", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },

  transactions: {
    list: () => request<{ transactions: TransactionRecord[] }>("/api/v1/transactions"),
    get: (id: string) => request<{ transaction: TransactionRecord }>(`/api/v1/transactions/${id}`),
    events: (id: string) => request<{ events: FuelTransactionEvent[] }>(`/api/v1/transactions/${id}/events`),
    create: (input: {
      stationId: string;
      pumpId: string;
      fuelType: FuelType;
      paymentMethodId: string;
      maxAuthorizationAmountRappen: number;
    }) => request<{ transaction: TransactionRecord }>("/api/v1/transactions", { method: "POST", body: JSON.stringify(input) }),
    authorize: (id: string) =>
      request<{ transaction: TransactionRecord }>(`/api/v1/transactions/${id}/authorize`, { method: "POST" }),
    startFueling: (id: string) =>
      request<{ transaction: TransactionRecord }>(`/api/v1/transactions/${id}/start-fueling`, { method: "POST" }),
    fuelingProgress: (id: string) => request<FuelingProgress>(`/api/v1/transactions/${id}/fueling`),
    finalize: (id: string) =>
      request<{ transaction: TransactionRecord }>(`/api/v1/transactions/${id}/finalize`, { method: "POST" }),
    cancel: (id: string) =>
      request<{ transaction: TransactionRecord }>(`/api/v1/transactions/${id}/cancel`, { method: "POST" }),
    receipt: (id: string) => request<{ receipt: Receipt }>(`/api/v1/transactions/${id}/receipt`),
  },

  demo: {
    status: () => request<{ demoMode: boolean; armedScenario: string }>("/api/v1/demo/status"),
    armScenario: (scenario: string) =>
      request<{ armedScenario: string }>("/api/v1/demo/scenario", { method: "POST", body: JSON.stringify({ scenario }) }),
    reset: () => request<{ armedScenario: string }>("/api/v1/demo/reset", { method: "POST" }),
  },

  admin: {
    summary: () =>
      request<{
        userCount: number;
        transactionCount: number;
        activeTransactionCount: number;
        completedTransactionCount: number;
        failedTransactionCount: number;
        failureRate: number;
        totalRevenueRappen: number;
        totalLiters: number;
        averageTransactionAmountRappen: number;
      }>("/api/v1/admin/summary"),
    transactions: () => request<{ transactions: TransactionRecord[] }>("/api/v1/admin/transactions"),
    users: () => request<{ users: User[] }>("/api/v1/admin/users"),
    errors: () => request<{ transactions: TransactionRecord[] }>("/api/v1/admin/errors"),
  },
};
