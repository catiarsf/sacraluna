// lib/auth.ts
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import type { SessionOptions } from "iron-session";

export type Role = "cliente" | "consultor" | "admin";

export type SessionUser = {
  id: number;
  role: Role;
  nome: string;
  email: string;
};

export type SessionData = {
  user?: SessionUser;
};

const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionPassword || sessionPassword.length < 32) {
  throw new Error(
    "SESSION_PASSWORD em falta ou demasiado curta. Usa uma password com pelo menos 32 caracteres no .env.local"
  );
}

const sessionOptions: SessionOptions = {
  cookieName: "sacraluna_session",
  password: sessionPassword,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore as any, sessionOptions);
}

export function requireLogin(session: SessionData) {
  if (!session?.user) {
    return { ok: false, status: 401, error: "Sem login." };
  }
  return { ok: true };
}

export function requireRole(session: SessionData, role: Role) {
  if (!session?.user) {
    return { ok: false, status: 401, error: "Sem login." };
  }

  if (session.user.role !== role) {
    return { ok: false, status: 403, error: "Sem permissão." };
  }

  return { ok: true };
}

export const requireCliente = (s: SessionData) => requireRole(s, "cliente");
export const requireConsultor = (s: SessionData) => requireRole(s, "consultor");
export const requireAdmin = (s: SessionData) => requireRole(s, "admin");