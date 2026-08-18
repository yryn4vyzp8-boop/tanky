import type { User } from "@tanky/domain";
import { db } from "../db/client.js";
import { newId, nowIso } from "../ids.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_admin: number;
  created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

export interface UserWithSecrets extends User {
  passwordHash: string;
  isAdmin: boolean;
}

export const userRepository = {
  create(input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    isAdmin?: boolean;
  }): UserWithSecrets {
    const id = newId("user");
    const createdAt = nowIso();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_admin, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.email.toLowerCase(),
      input.passwordHash,
      input.firstName,
      input.lastName,
      input.phone ?? null,
      input.isAdmin ? 1 : 0,
      createdAt,
    );
    return {
      id,
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      createdAt,
      passwordHash: input.passwordHash,
      isAdmin: Boolean(input.isAdmin),
    };
  },

  findByEmail(email: string): UserWithSecrets | null {
    const row = db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(email.toLowerCase()) as UserRow | undefined;
    if (!row) return null;
    return { ...toUser(row), passwordHash: row.password_hash, isAdmin: Boolean(row.is_admin) };
  },

  findById(id: string): UserWithSecrets | null {
    const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
    if (!row) return null;
    return { ...toUser(row), passwordHash: row.password_hash, isAdmin: Boolean(row.is_admin) };
  },

  count(): number {
    const row = db.prepare(`SELECT COUNT(*) as n FROM users`).get() as { n: number };
    return row.n;
  },

  listAll(): User[] {
    const rows = db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all() as unknown as UserRow[];
    return rows.map(toUser);
  },
};
