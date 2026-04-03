"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: number;
  nome: string | null;
  email: string;
  telefone: string | null;
  created_at: number;
};

function formatDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

export default function AdminRegistosPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);

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
            ← Voltar à administração
          </Link>
        </div>

        {loading ? <div style={styles.info}>A carregar registos...</div> : null}
        {err ? <div style={styles.error}>{err}</div> : null}

        {!loading && !err && clientes.length === 0 ? (
          <div style={styles.info}>Ainda não existem clientes registados.</div>
        ) : null}

        {!loading && !err && clientes.length > 0 ? (
          <div style={styles.card}>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Nome</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Telefone</th>
                    <th style={styles.th}>Registado em</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id}>
                      <td style={styles.td}>{c.id}</td>
                      <td style={styles.td}>{c.nome || "-"}</td>
                      <td style={styles.td}>{c.email}</td>
                      <td style={styles.td}>{c.telefone || "-"}</td>
                      <td style={styles.td}>{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px 16px 40px",
    color: "white",
  },

  wrap: {
    maxWidth: 1100,
    margin: "0 auto",
  },

  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  },

  h1: {
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
    color: "#f4d78b",
  },

  liveText: {
    marginTop: 6,
    fontSize: 12,
    color: "#88ffbc",
    opacity: 0.9,
  },

  backBtn: {
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(0,0,0,0.24)",
    color: "#f4d78b",
    fontWeight: 900,
  },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.24)",
    overflow: "hidden",
  },

  tableWrap: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: 14,
    background: "rgba(255,255,255,0.04)",
    color: "#f4d78b",
    fontSize: 13,
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    whiteSpace: "nowrap",
  },

  td: {
    padding: 14,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: 14,
    verticalAlign: "top",
  },

  info: {
    padding: 16,
    borderRadius: 14,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  error: {
    padding: 16,
    borderRadius: 14,
    background: "rgba(120,0,0,0.25)",
    border: "1px solid rgba(255,80,80,0.20)",
    color: "#ffd6d6",
  },
};