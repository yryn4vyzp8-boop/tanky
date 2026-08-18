import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken, type TankyJwtPayload } from "./jwt.js";
import { Errors } from "../errors.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: TankyJwtPayload;
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw Errors.unauthorized("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyToken(token);
  } catch {
    throw Errors.unauthorized("Invalid or expired token");
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (!req.user?.isAdmin) {
    throw Errors.forbidden("Admin access required");
  }
}
