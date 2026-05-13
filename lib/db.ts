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
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS candidaturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  especialidade TEXT,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'cliente',
  bloqueado INTEGER NOT NULL DEFAULT 0,
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
  voip_ativo INTEGER NOT NULL DEFAULT 1,
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

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  session_id TEXT,
  type TEXT NOT NULL,
  amount_eur REAL NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
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

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  sent_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
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
  consultor_id INTEGER,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_tipo TEXT NOT NULL DEFAULT 'fixo',
  preco_eur REAL NOT NULL DEFAULT 0,
  preco_texto TEXT,
  comissao_tipo TEXT NOT NULL DEFAULT 'percentagem',
  comissao_valor REAL NOT NULL DEFAULT 40,
  imagem_url TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  prazo_estimado TEXT,
  tipo_entrega TEXT DEFAULT 'ficheiro_texto',
  campos_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER
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

CREATE TABLE IF NOT EXISTS tickets_servicos (
  id TEXT PRIMARY KEY,
  pedido_servico_id TEXT,
  cliente_id INTEGER,
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  consultor_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  servico_nome TEXT NOT NULL,
  preco_eur REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pago',
  prioridade TEXT NOT NULL DEFAULT 'normal',
  dados_servico TEXT,
  observacoes_cliente TEXT,
  observacoes_internas TEXT,
  stripe_session_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  entregue_at INTEGER,
  fechado_at INTEGER
);

CREATE TABLE IF NOT EXISTS ticket_mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  autor_tipo TEXT NOT NULL,
  autor_id INTEGER,
  mensagem TEXT NOT NULL,
  visibilidade TEXT NOT NULL DEFAULT 'cliente_consultor_admin',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS ticket_anexos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  enviado_por_tipo TEXT NOT NULL,
  enviado_por_id INTEGER,
  nome_ficheiro TEXT NOT NULL,
  caminho_ficheiro TEXT NOT NULL,
  tipo_ficheiro TEXT,
  tamanho INTEGER DEFAULT 0,
  visivel_cliente INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilizador_tipo TEXT NOT NULL,
  utilizador_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida INTEGER NOT NULL DEFAULT 0,
  link_interno TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
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

CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY,
  consultor_id INTEGER,
  cliente_id INTEGER,
  cliente_nome TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  call_sid TEXT,
  price_per_min REAL NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_charged_eur REAL NOT NULL DEFAULT 0,
  consultor_earned_eur REAL NOT NULL DEFAULT 0,
  billed INTEGER NOT NULL DEFAULT 0,
  recording_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  started_at INTEGER,
  ended_at INTEGER
);
`);

/* MIGRAÇÕES SEGURAS */
try { db.exec(`ALTER TABLE users ADD COLUMN telefone TEXT;`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN bloqueado INTEGER NOT NULL DEFAULT 0;`); } catch {}

try { db.exec(`ALTER TABLE consultores ADD COLUMN telefone TEXT;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN preco_chat REAL NOT NULL DEFAULT 1.0;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN preco_voz REAL NOT NULL DEFAULT 1.0;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN percentagem_ganho REAL NOT NULL DEFAULT 40;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN foto_url TEXT;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN especialidades TEXT;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN apresentacao TEXT;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN voip_ativo INTEGER NOT NULL DEFAULT 1;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_1_qtd INTEGER NOT NULL DEFAULT 1;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_1_preco REAL NOT NULL DEFAULT 1;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_2_qtd INTEGER NOT NULL DEFAULT 3;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_2_preco REAL NOT NULL DEFAULT 3;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_3_qtd INTEGER NOT NULL DEFAULT 5;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_3_preco REAL NOT NULL DEFAULT 5;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_4_qtd INTEGER NOT NULL DEFAULT 10;`); } catch {}
try { db.exec(`ALTER TABLE consultores ADD COLUMN pack_4_preco REAL NOT NULL DEFAULT 10;`); } catch {}

try { db.exec(`ALTER TABLE servicos ADD COLUMN consultor_id INTEGER;`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN preco_tipo TEXT NOT NULL DEFAULT 'fixo';`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN preco_texto TEXT;`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN comissao_tipo TEXT NOT NULL DEFAULT 'percentagem';`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN comissao_valor REAL NOT NULL DEFAULT 40;`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN prazo_estimado TEXT;`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN tipo_entrega TEXT DEFAULT 'ficheiro_texto';`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN campos_json TEXT;`); } catch {}
try { db.exec(`ALTER TABLE servicos ADD COLUMN updated_at INTEGER;`); } catch {}

try { db.exec(`ALTER TABLE pedidos_servicos ADD COLUMN stripe_session_id TEXT;`); } catch {}
try { db.exec(`ALTER TABLE pedidos_servicos ADD COLUMN paid_at INTEGER;`); } catch {}

try { db.exec(`ALTER TABLE contactos ADD COLUMN telefone TEXT;`); } catch {}
try { db.exec(`ALTER TABLE contactos ADD COLUMN assunto TEXT;`); } catch {}
try { db.exec(`ALTER TABLE contactos ADD COLUMN status TEXT NOT NULL DEFAULT 'novo';`); } catch {}
try { db.exec(`ALTER TABLE contactos ADD COLUMN responded_at INTEGER;`); } catch {}

try { db.exec(`ALTER TABLE call_sessions ADD COLUMN call_sid TEXT;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN price_per_min REAL NOT NULL DEFAULT 0;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN total_charged_eur REAL NOT NULL DEFAULT 0;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN consultor_earned_eur REAL NOT NULL DEFAULT 0;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN billed INTEGER NOT NULL DEFAULT 0;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN recording_url TEXT;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN started_at INTEGER;`); } catch {}
try { db.exec(`ALTER TABLE call_sessions ADD COLUMN ended_at INTEGER;`); } catch {}

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
    const newEarned = round2(Number(wallet.earned_eur || 0) + amount);

    if (userType === "consultor") {
      db.prepare(`
        UPDATE wallets
        SET balance_eur = ?, earned_eur = ?, updated_at = strftime('%s','now')
        WHERE id = ?
      `).run(newBalance, newEarned, wallet.id);
    } else {
      db.prepare(`
        UPDATE wallets
        SET balance_eur = ?, updated_at = strftime('%s','now')
        WHERE id = ?
      `).run(newBalance, wallet.id);
    }

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

    return {
      ...wallet,
      balance_eur: newBalance,
      earned_eur: userType === "consultor" ? newEarned : Number(wallet.earned_eur || 0),
    };
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