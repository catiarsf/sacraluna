// app/api/seed-admin/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "admin@sacraluna.pt";
const ADMIN_PASS = "Admin1234!";
const ADMIN_NOME = "Admin";

function blockedInProduction() {
  // Segurança mínima: não deixar seed em produção sem chave
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.SEED_ADMIN_SECRET;
  return isProd && !secret;
}

function checkSecret(req: Request) {
  // opcional: se definires SEED_ADMIN_SECRET no .env.local,
  // tens de passar ?secret=... na URL
  const secret = process.env.SEED_ADMIN_SECRET;
  if (!secret) return true;

  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

async function seedAdmin(req: Request) {
  if (blockedInProduction()) {
    return NextResponse.json(
      { error: "Seed bloqueado em produção (define SEED_ADMIN_SECRET)." },
      { status: 403 }
    );
  }

  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Secret inválido." }, { status: 403 });
  }

  // 1) Já existe admin com este email?
  const existing = db
    .prepare("SELECT id, role FROM users WHERE email=?")
    .get(ADMIN_EMAIL) as any;

  if (existing) {
    // se existir mas não for admin, atualiza
    if (existing.role !== "admin") {
      db.prepare("UPDATE users SET role='admin' WHERE id=?").run(existing.id);
    }
    return NextResponse.json({
      ok: true,
      message: "Admin já existia (confirmado/atualizado).",
      email: ADMIN_EMAIL,
    });
  }

  // 2) Criar admin
  const password_hash = await bcrypt.hash(ADMIN_PASS, 10);

  db.prepare(
    "INSERT INTO users (nome, email, password_hash, role) VALUES (?, ?, ?, ?)"
  ).run(ADMIN_NOME, ADMIN_EMAIL, password_hash, "admin");

  return NextResponse.json({
    ok: true,
    message: "Admin criado com sucesso.",
    email: ADMIN_EMAIL,
    pass: ADMIN_PASS,
  });
}

// Para ser MUITO fácil: podes chamar no browser (GET)
export async function GET(req: Request) {
  return seedAdmin(req);
}

// E também via POST (mais “correto”)
export async function POST(req: Request) {
  return seedAdmin(req);
}