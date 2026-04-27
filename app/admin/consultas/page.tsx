"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Mensagem = {
  id: number;
  sender_role: string;
  text: string;
  sent_at: number;
};

type Consulta = {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  consultor_nome: string;
  status: string;
  price_per_min: number;
  started_at: number;
  ended_at: number;
  billed_seconds: number;
  total_charged_eur: number;
  consultor_earned_eur: number;
  created_at: number;
  mensagens: Mensagem[];
};

function formatDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

function formatMin(seconds?: number) {
  const s = Number(seconds ?? 0);
  if (!s) return "0 min";
  return `${Math.ceil(s / 60)} min`;
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pendente";
    case "active":
      return "Ativa";
    case "ended":
      return "Terminada";
    case "rejected":
      return "Rejeitada";
    default:
      return status || "-";
  }
}

export default function AdminConsultasPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [expandedId, setExpandedId] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/admin/consultas", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar consultas.");
      }

      setConsultas(Array.isArray(json.consultas) ? json.consultas : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar consultas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();

    const interval = setInterval(() => {
      carregar();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.top}>
        <div>
          <h1 style={styles.h1}>Relatório de consultas por chat</h1>
          <p style={styles.sub}>Atualização automática a cada 10 segundos</p>
        </div>

        <div style={styles.topBtns}>
          <button style={styles.refreshBtn} onClick={carregar} disabled={loading}>
            {loading ? "A carregar..." : "Atualizar"}
          </button>

          <Link href="/admin" style={styles.backBtn}>
            ← Voltar
          </Link>
        </div>
      </div>

      {erro ? <div style={styles.err}>{erro}</div> : null}

      {loading ? (
        <div style={styles.card}>A carregar consultas...</div>
      ) : consultas.length === 0 ? (
        <div style={styles.card}>Ainda não existem consultas por chat.</div>
      ) : (
        <div style={styles.list}>
          {consultas.map((c) => {
            const expanded = expandedId === c.id;

            return (
              <div key={c.id} style={styles.card}>
                <div style={styles.rowTop}>
                  <div>
                    <div style={styles.title}>
                      {c.cliente_nome} → {c.consultor_nome}
                    </div>

                    <div style={styles.meta}>
                      <b>Email cliente:</b> {c.cliente_email || "-"}
                    </div>

                    <div style={styles.meta}>
                      <b>Data:</b> {formatDate(c.created_at)}
                    </div>

                    <div style={styles.meta}>
                      <b>Início:</b> {formatDate(c.started_at)}
                    </div>

                    <div style={styles.meta}>
                      <b>Fim:</b> {formatDate(c.ended_at)}
                    </div>

                    <div style={styles.meta}>
                      <b>Status:</b> {statusLabel(c.status)}
                    </div>
                  </div>

                  <div style={styles.statsBox}>
                    <div style={styles.stat}>
                      <span>Duração</span>
                      <b>{formatMin(c.billed_seconds)}</b>
                    </div>

                    <div style={styles.stat}>
                      <span>Preço/min</span>
                      <b>{Number(c.price_per_min ?? 0).toFixed(2)}€</b>
                    </div>

                    <div style={styles.stat}>
                      <span>Total cliente</span>
                      <b>{Number(c.total_charged_eur ?? 0).toFixed(2)}€</b>
                    </div>

                    <div style={styles.stat}>
                      <span>Ganho consultor</span>
                      <b>{Number(c.consultor_earned_eur ?? 0).toFixed(2)}€</b>
                    </div>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button
                    style={styles.btn}
                    onClick={() => setExpandedId(expanded ? "" : c.id)}
                  >
                    {expanded ? "Fechar conversa" : "Ver conversa"}
                  </button>

                  <span style={styles.msgCount}>
                    {c.mensagens.length} mensagem(ns)
                  </span>
                </div>

                {expanded ? (
                  <div style={styles.conversa}>
                    {c.mensagens.length === 0 ? (
                      <div style={styles.empty}>Sem mensagens guardadas nesta consulta.</div>
                    ) : (
                      c.mensagens.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            ...styles.message,
                            ...(m.sender_role === "cliente"
                              ? styles.messageCliente
                              : styles.messageConsultor),
                          }}
                        >
                          <div style={styles.messageHead}>
                            <b>
                              {m.sender_role === "cliente"
                                ? "Cliente"
                                : m.sender_role === "consultor"
                                ? "Consultor"
                                : m.sender_role}
                            </b>
                            <span>{formatDate(m.sent_at)}</span>
                          </div>

                          <div style={styles.messageText}>{m.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    color: "#fff",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  h1: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
    color: "#f4d78b",
  },
  sub: {
    marginTop: 6,
    color: "#88ffbc",
    fontSize: 13,
  },
  topBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  refreshBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "#f4d78b",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  backBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    fontWeight: 800,
    textDecoration: "none",
  },
  err: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,0,0,0.12)",
    border: "1px solid rgba(255,0,0,0.25)",
    marginBottom: 14,
    color: "#ffb4b4",
  },
  list: {
    display: "grid",
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 19,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 10,
  },
  meta: {
    marginBottom: 6,
    opacity: 0.92,
  },
  statsBox: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(130px, 1fr))",
    gap: 10,
    minWidth: 300,
  },
  stat: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 5,
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  btn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(212,175,55,0.14)",
    color: "#f4d78b",
    fontWeight: 900,
    cursor: "pointer",
  },
  msgCount: {
    opacity: 0.75,
    fontSize: 13,
  },
  conversa: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 10,
  },
  empty: {
    opacity: 0.8,
  },
  message: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  messageCliente: {
    background: "rgba(25,70,140,0.24)",
  },
  messageConsultor: {
    background: "rgba(212,175,55,0.12)",
  },
  messageHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 8,
    fontSize: 12,
    opacity: 0.85,
  },
  messageText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
  },
};