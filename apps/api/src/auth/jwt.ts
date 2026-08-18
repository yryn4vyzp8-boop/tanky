import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface TankyJwtPayload {
  sub: string; // user id
  email: string;
  isAdmin: boolean;
}

export function signToken(payload: TankyJwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyToken(token: string): TankyJwtPayload {
  return jwt.verify(token, config.jwtSecret) as TankyJwtPayload;
}
