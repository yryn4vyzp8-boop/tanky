import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { userRepository } from "../repositories/user-repository.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signToken } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";
import { Errors } from "../errors.js";
import { db } from "../db/client.js";
import { newId, nowIso } from "../ids.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(u: { id: string; email: string; firstName: string; lastName: string; phone: string | null; createdAt: string }) {
  return u;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);
    if (userRepository.findByEmail(body.email)) {
      throw Errors.conflict("An account with this email already exists");
    }
    const user = userRepository.create({
      email: body.email,
      passwordHash: hashPassword(body.password),
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone ?? null,
    });
    db.prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(newId("audit"), user.id, "USER_REGISTERED", JSON.stringify({ email: user.email }), nowIso());

    const token = signToken({ sub: user.id, email: user.email, isAdmin: user.isAdmin });
    reply.code(201).send({ token, user: toPublicUser(user) });
  });

  app.post("/api/v1/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = userRepository.findByEmail(body.email);
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw Errors.unauthorized("Invalid email or password");
    }
    const token = signToken({ sub: user.id, email: user.email, isAdmin: user.isAdmin });
    reply.send({ token, user: toPublicUser(user) });
  });

  app.get("/api/v1/auth/me", { preHandler: requireAuth }, async (req, reply) => {
    const user = userRepository.findById(req.user!.sub);
    if (!user) throw Errors.notFound("User not found");
    reply.send({ user: toPublicUser(user), isAdmin: user.isAdmin });
  });
}
