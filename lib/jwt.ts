import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "catalogflow_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to a random value of at least 24 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token?: string) {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole,
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}

