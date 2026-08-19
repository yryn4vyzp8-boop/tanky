import type { PaymentMethod, PaymentMethodBrand } from "@tanky/domain";
import { db } from "../db/client.js";
import { newId, nowIso } from "../ids.js";

interface PaymentMethodRow {
  id: string;
  user_id: string;
  brand: string;
  last4: string;
  provider_token: string;
  is_default: number;
  created_at: string;
}

function toPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    userId: row.user_id,
    brand: row.brand as PaymentMethodBrand,
    last4: row.last4,
    providerToken: row.provider_token,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

export const paymentMethodRepository = {
  create(input: {
    userId: string;
    brand: PaymentMethodBrand;
    last4: string;
    providerToken: string;
    isDefault?: boolean;
  }): PaymentMethod {
    const id = newId("pm");
    const createdAt = nowIso();
    if (input.isDefault) {
      db.prepare(`UPDATE payment_methods SET is_default = 0 WHERE user_id = ?`).run(input.userId);
    }
    db.prepare(
      `INSERT INTO payment_methods (id, user_id, brand, last4, provider_token, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.userId, input.brand, input.last4, input.providerToken, input.isDefault ? 1 : 0, createdAt);
    return {
      id,
      userId: input.userId,
      brand: input.brand,
      last4: input.last4,
      providerToken: input.providerToken,
      isDefault: Boolean(input.isDefault),
      createdAt,
    };
  },

  listForUser(userId: string): PaymentMethod[] {
    const rows = db
      .prepare(`SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`)
      .all(userId) as unknown as PaymentMethodRow[];
    return rows.map(toPaymentMethod);
  },

  findById(id: string): PaymentMethod | null {
    const row = db.prepare(`SELECT * FROM payment_methods WHERE id = ?`).get(id) as
      | PaymentMethodRow
      | undefined;
    return row ? toPaymentMethod(row) : null;
  },

  updateProviderToken(id: string, providerToken: string, last4: string): void {
    db.prepare(`UPDATE payment_methods SET provider_token = ?, last4 = ? WHERE id = ?`).run(
      providerToken,
      last4,
      id,
    );
  },
};
