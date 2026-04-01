"use server";

import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

const COOKIE_NAME = "ontokit-login-session";
const TTL_SECONDS = 600; // 10 minutes

export interface LoginSessionData {
  sessionId: string;
  sessionToken: string;
  authRequestId: string;
  loginName?: string;
  userId?: string;
}

function getEncryptionKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be set for login session encryption");
  }
  // Derive a 256-bit key from the secret by hashing it
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(secret);
  // Pad or truncate to 32 bytes for A256GCM
  const key = new Uint8Array(32);
  key.set(keyMaterial.slice(0, 32));
  return key;
}

export async function setLoginSession(data: LoginSessionData): Promise<void> {
  const key = getEncryptionKey();
  const token = await new EncryptJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .encrypt(key);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: TTL_SECONDS,
  });
}

export async function getLoginSession(): Promise<LoginSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const key = getEncryptionKey();
    const { payload } = await jwtDecrypt(token, key);
    return payload as unknown as LoginSessionData;
  } catch {
    // Token expired or invalid
    return null;
  }
}

export async function clearLoginSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
