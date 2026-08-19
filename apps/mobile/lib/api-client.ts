import { Platform } from "react-native";
import Constants from "expo-constants";
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

/**
 * On web this is simply localhost. On a physical device (Expo Go or a dev
 * build), "localhost" would mean the phone itself, not the Mac running the
 * API — so there we derive the Mac's LAN IP from the same address Metro's
 * dev server used to reach the device, and assume the API runs on that same
 * machine on port 4000 (true for local development). Override with
 * EXPO_PUBLIC_API_URL for anything else (a deployed backend, a different
 * port, ...).
 */
function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === "web") return "http://localhost:4000";

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const lanHost = hostUri?.split(":")[0];
  if (lanHost && lanHost !== "localhost") {
    return `http://${lanHost}:4000`;
  }
  return "http://localhost:4000";
}

export const API_BASE_URL = resolveApiBaseUrl();

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
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    // The request never reached the server at all (offline, DNS failure, or
    // — very common on Render's free tier — the API is cold-starting after
    // being idle, which can take up to a minute for the very first request).
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Keine Verbindung zum Server. Falls die App länger nicht genutzt wurde, kann der Server kurz zum Aufwachen brauchen — versuche es in ein paar Sekunden nochmal.",
    );
  }
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "UNKNOWN", body.message ?? "Request failed");
  }
  return body as T;
}

export const api = {
  health: () =>
    request<{
      status: string;
      demoMode: boolean;
      stripeEnabled: boolean;
      stripePublishableKey: string | null;
      service: string;
    }>("/api/v1/health"),

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
    create: (input: {
      brand: PaymentMethodBrand;
      last4: string;
      isDefault?: boolean;
      providerToken?: string;
    }) =>
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
