"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Transacao = {
  id: number;
  type: string;
  amount_eur: number;
  description: string;
  created_at: number;
};

type Cliente = {
  id: number;
  nome: string | null;
  email: string;
  telefone: string | null;
  created_at: number;
  saldo: number;
  gasto_total: number;
  bloqueado: number;
  transacoes: Transacao[];
};

function formatDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

export default function AdminRegistosPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const res = await fetch("/api/admin/registos", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar registos.");
      }

      setClientes(Array.isArray(data?.clientes) ? data.clientes : []);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function adicionarSaldo(userId: number) {
    const valor = prompt("Quanto queres adicionar?");

    if (!valor) return;

    const amount = Number(String(valor).replace(",", "."));

    if (!amount || amount <= 0) {
      alert("Valor inválido.");
      return;
    }

    try {
      const res = await fetch("/api/admin/wallet-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          amount,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao adicionar saldo.");
      }

      load();
    } catch (e: any) {
      alert(String(e?.message ?? e));
    }
  }

  async function retirarSaldo(userId: number) {
    const valor = prompt("Quanto queres retirar?");

    if (!valor) return;

    const amount = Number(String(valor).replace(",", "."));

    if (!amount || amount <= 0) {
      alert("Valor inválido.");
      return;
    }

    try {
      const res = await fetch("/api/admin/clientes/debit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          amount,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao retirar saldo.");
      }

      load();
    } catch (e: any) {
      alert(String(e?.message ?? e));
    }
  }

  async function toggleBlock(userId: number, bloqueado: boolean) {
    try {
      const res = await fetch("/api/admin/clientes/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          bloqueado: !bloqueado,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro.");
      }

      load();
    } catch (e: any) {
      alert(String(e?.message ?? e));
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      load();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.h1}>Registos de clientes</h1>
            <div style={styles.liveText}>
              Atualização automática a cada 10 segundos
            </div>
          </div>

          <Link href="/admin" style={styles.backBtn}>
            ← Voltar
          </Link>
        </div>

        {loading ? <div style={styles.info}>A carregar...</div> : null}
        {err ? <div style={styles.error}>{err}</div> : null}

        <div style={styles.card}>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Saldo</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {clientes.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td style={styles.td}>{c.nome || "-"}</td>
                      <td style={styles.td}>{c.email}</td>
                      <td style={styles.td}>
                        {Number(c.saldo ?? 0).toFixed(2)}€
                      </td>
                      <td style={styles.td}>
                        {c.bloqueado ? "🚫 Bloqueado" : "✅ Ativo"}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            style={styles.btnGold}
                            onClick={() => adicionarSaldo(c.id)}
                          >
                            +Saldo
                          </button>

                          <button
                            style={styles.btnRed}
                            onClick={() => retirarSaldo(c.id)}
                          >
                            -Saldo
                          </button>

                          <button
                            style={styles.btnBlue}
                            onClick={() =>
                              toggleBlock(c.id, Boolean(c.bloqueado))
                            }
                          >
                            {c.bloqueado ? "Desbloquear" : "Bloquear"}
                          </button>

                          <button
                            style={styles.btnGray}
                            onClick={() =>
                              setExpandedId(expandedId === c.id ? null : c.id)
                            }
                          >
                            Movimentos
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedId === c.id && (
                      <tr>
                        <td colSpan={5} style={styles.expandTd}>
                          {c.transacoes?.map((t) => (
                            <div key={t.id} style={styles.movItem}>
                              {formatDate(t.created_at)} — {t.type} —{" "}
                              {Number(t.amount_eur).toFixed(2)}€ —{" "}
                              {t.description}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: 20, color: "white" },
  wrap: { maxWidth: 1200, margin: "0 auto" },
  top: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  h1: { fontSize: 30, fontWeight: 900, color: "#f4d78b" },
  liveText: { color: "#88ffbc", fontSize: 12 },
  backBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    color: "#f4d78b",
    textDecoration: "none",
  },
  card: {
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: 12,
    color: "#f4d78b",
  },
  td: {
    padding: 12,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  expandTd: {
    padding: 12,
    background: "rgba(255,255,255,0.03)",
  },
  movItem: {
    marginBottom: 6,
    fontSize: 13,
  },
  actions: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  btnGold: {
    background: "#f4d78b",
    color: "#111",
    border: "none",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnRed: {
    background: "darkred",
    color: "white",
    border: "none",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnBlue: {
    background: "#3578e5",
    color: "white",
    border: "none",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnGray: {
    background: "#555",
    color: "white",
    border: "none",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },
  info: {
    padding: 14,
  },
  error: {
    padding: 14,
    color: "#ffb3b3",
  },
};