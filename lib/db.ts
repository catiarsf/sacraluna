import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const basePath =
  process.env.SQLITE_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  (process.env.NODE_ENV === "production" ? "/data" : process.cwd());

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

const dbPath = path.join(basePath, "data.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'cliente',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS consultores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  password TEXT,
  preco_por_min REAL NOT NULL DEFAULT 1.0,
  preco_chat REAL NOT NULL DEFAULT 1.0,
  preco_voz REAL NOT NULL DEFAULT 1.0,
  percentagem_ganho REAL NOT NULL DEFAULT 40,
  foto_url TEXT,
  especialidades TEXT,
  apresentacao TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  destaque INTEGER NOT NULL DEFAULT 0,
  online INTEGER NOT NULL DEFAULT 0,
  ocupado INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER,

  pack_1_qtd INTEGER NOT NULL DEFAULT 1,
  pack_1_preco REAL NOT NULL DEFAULT 1,

  pack_2_qtd INTEGER NOT NULL DEFAULT 3,
  pack_2_preco REAL NOT NULL DEFAULT 3,

  pack_3_qtd INTEGER NOT NULL DEFAULT 5,
  pack_3_preco REAL NOT NULL DEFAULT 5,

  pack_4_qtd INTEGER NOT NULL DEFAULT 10,
  pack_4_preco REAL NOT NULL DEFAULT 10,

  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  balance_eur REAL NOT NULL DEFAULT 0,
  earned_eur REAL NOT NULL DEFAULT 0,
  spent_eur REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(user_type, user_id)
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  cliente_id INTEGER,
  consultor_id INTEGER NOT NULL,
  cliente_nome TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  price_per_min REAL NOT NULL DEFAULT 0,
  started_at INTEGER,
  ended_at INTEGER,
  billed_seconds INTEGER NOT NULL DEFAULT 0,
  total_charged_eur REAL NOT NULL DEFAULT 0,
  consultor_earned_eur REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  session_id TEXT,
  type TEXT NOT NULL,
  amount_eur REAL NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS pergunta_pedidos (
  id TEXT PRIMARY KEY,
  cliente_id INTEGER,
  consultor_id INTEGER NOT NULL,
  pacote INTEGER NOT NULL,
  preco_eur REAL NOT NULL,
  status TEXT DEFAULT 'aguarda_pagamento',
  stripe_payment_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  respondido_at INTEGER
);

CREATE TABLE IF NOT EXISTS pergunta_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id TEXT NOT NULL,
  pergunta TEXT,
  resposta TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  responded_at INTEGER
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS servicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_eur REAL NOT NULL DEFAULT 0,
  imagem_url TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS pedidos_servicos (
  id TEXT PRIMARY KEY,
  servico_id INTEGER NOT NULL,
  nome_cliente TEXT NOT NULL,
  email_cliente TEXT NOT NULL,
  telefone_cliente TEXT,
  notas TEXT,
  preco_eur REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  stripe_session_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  paid_at INTEGER,
  FOREIGN KEY(servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  resumo TEXT,
  conteudo TEXT,
  imagem_url TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS contactos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  assunto TEXT,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  responded_at INTEGER
);
`);

/* MIGRAÇÕES SEGURAS */
try { db.exec(`ALTER TABLE consultores ADD COLUMN telefone TEXT;`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN telefone TEXT;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN preco_chat REAL NOT NULL DEFAULT 1.0;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN preco_voz REAL NOT NULL DEFAULT 1.0;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN percentagem_ganho REAL NOT NULL DEFAULT 40;`); } catch {}

try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_1_qtd INTEGER NOT NULL DEFAULT 1;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_1_preco REAL NOT NULL DEFAULT 1;`); } catch {}

try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_2_qtd INTEGER NOT NULL DEFAULT 3;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_2_preco REAL NOT NULL DEFAULT 3;`); } catch {}

try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_3_qtd INTEGER NOT NULL DEFAULT 5;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_3_preco REAL NOT NULL DEFAULT 5;`); } catch {}

try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_4_qtd INTEGER NOT NULL DEFAULT 10;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_4_preco REAL NOT NULL DEFAULT 10;`); } catch {}

try { db.exec(`ALTER TABLE contactos ADD COLUMN telefone TEXT;`); } catch {}
try { db.exec(`ALTER TABLE contactos ADD COLUMN assunto TEXT;`); } catch {}
try { db.exec(`ALTER TABLE contactos ADD COLUMN status TEXT NOT NULL DEFAULT 'novo';`); } catch {}
try { db.exec(`ALTER TABLE contactos ADD COLUMN responded_at INTEGER;`); } catch {}
/* WALLET */
function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getOrCreateWallet(userType: string, userId: number) {
  let wallet = db
    .prepare("SELECT * FROM wallets WHERE user_type = ? AND user_id = ?")
    .get(userType, userId) as any;

  if (!wallet) {
    db.prepare(`
      INSERT INTO wallets (user_type, user_id, balance_eur, earned_eur, spent_eur)
      VALUES (?, ?, 0, 0, 0)
    `).run(userType, userId);

    wallet = db
      .prepare("SELECT * FROM wallets WHERE user_type = ? AND user_id = ?")
      .get(userType, userId) as any;
  }

  return wallet;
}

export function creditWallet(params: {
  userType: string;
  userId: number;
  amount: number;
  description?: string;
  sessionId?: string | null;
}) {
  const { userType, userId, amount, description, sessionId } = params;

  if (!amount || amount <= 0) {
    throw new Error("Valor de crédito inválido.");
  }

  const tx = db.transaction(() => {
    const wallet = getOrCreateWallet(userType, userId);
    const newBalance = round2(Number(wallet.balance_eur || 0) + amount);

    db.prepare(`
      UPDATE wallets
      SET balance_eur = ?, updated_at = strftime('%s','now')
      WHERE id = ?
    `).run(newBalance, wallet.id);

    db.prepare(`
      INSERT INTO wallet_transactions (
        wallet_id, session_id, type, amount_eur, description
      ) VALUES (?, ?, 'credit', ?, ?)
    `).run(
      wallet.id,
      sessionId ?? null,
      round2(amount),
      description ?? "Crédito wallet"
    );

    return { ...wallet, balance_eur: newBalance };
  });

  return tx();
}

export function debitWallet(params: {
  userType: string;
  userId: number;
  amount: number;
  description?: string;
  sessionId?: string | null;
}) {
  const { userType, userId, amount, description, sessionId } = params;

  if (!amount || amount <= 0) {
    throw new Error("Valor de débito inválido.");
  }

  const tx = db.transaction(() => {
    const wallet = getOrCreateWallet(userType, userId);
    const currentBalance = round2(Number(wallet.balance_eur || 0));

    if (currentBalance < amount) {
      throw new Error("Saldo insuficiente.");
    }

    const newBalance = round2(currentBalance - amount);
    const newSpent = round2(Number(wallet.spent_eur || 0) + amount);

    db.prepare(`
      UPDATE wallets
      SET balance_eur = ?, spent_eur = ?, updated_at = strftime('%s','now')
      WHERE id = ?
    `).run(newBalance, newSpent, wallet.id);

    db.prepare(`
      INSERT INTO wallet_transactions (
        wallet_id, session_id, type, amount_eur, description
      ) VALUES (?, ?, 'debit', ?, ?)
    `).run(
      wallet.id,
      sessionId ?? null,
      round2(-amount),
      description ?? "Débito wallet"
    );

    return {
      ...wallet,
      balance_eur: newBalance,
      spent_eur: newSpent,
    };
  });

  return tx();
}

export default db;
export { db };