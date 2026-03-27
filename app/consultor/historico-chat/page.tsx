"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type HistoryMessage = {
  sender_role: "cliente" | "consultor";
  text: string;
  sent_at: number;
};

type HistorySession = {
  id: string;
  cliente_nome: string;
  created_at: number;
  started_at: number;
  ended_at: number;
  billed_seconds: number;
  total_charged_eur: number;
  consultor_earned_eur: number;
  status: string;
  messages: HistoryMessage[];
};

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

function formatOnlyDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString("pt-PT");
}

function formatOnlyTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleTimeString("pt-PT");
}

function formatDuration(totalSeconds?: number) {
  const s = Number(totalSeconds ?? 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ConsultorHistoricoChatPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/consultor/history", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar histórico de chat.");
      }

      setSessions(Array.isArray(json?.sessions) ? json.sessions : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar histórico de chat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.topRow}>
        <h1 style={styles.h1}>Histórico chat</h1>
        <div style={styles.row}>
          <Link href="/consultor" style={styles.linkBtn}>
            ← Voltar
          </Link>
          <button style={styles.btn} onClick={carregar} disabled={loading}>
            {loading ? "A carregar..." : "Atualizar"}
          </button>
        </div>
      </div>

      {erro ? <div style={styles.err}>{erro}</div> : null}

      {loading ? (
        <div style={styles.card}>A carregar...</div>
      ) : sessions.length === 0 ? (
        <div style={styles.card}>Ainda não há histórico de chat para mostrar.</div>
      ) : (
        <div style={styles.list}>
          {sessions.map((item) => {
            const expanded = expandedSessionId === item.id;

            return (
              <div key={item.id} style={styles.card}>
                <div style={styles.historyTop}>
                  <div>
                    <div style={styles.title}>Consulta</div>
                    <div style={styles.meta}><b>Cliente:</b> {item.cliente_nome || "-"}</div>
                    <div style={styles.meta}><b>Dia:</b> {formatOnlyDate(item.started_at || item.created_at)}</div>
                    <div style={styles.meta}><b>Hora:</b> {formatOnlyTime(item.started_at || item.created_at)}</div>
                    <div style={styles.meta}><b>Duração:</b> {formatDuration(item.billed_seconds)}</div>
                    <div style={styles.meta}><b>Status:</b> {item.status}</div>
                  </div>

                  <button
                    style={styles.btnSmall}
                    onClick={() => setExpandedSessionId(expanded ? "" : item.id)}
                  >
                    {expanded ? "Fechar" : "Ver chat"}
                  </button>
                </div>

                {expanded && (
                  <div style={styles.transcript}>
                    {item.messages?.length ? (
                      item.messages.map((m, idx) => (
                        <div key={idx} style={styles.message}>
                          <div style={styles.messageRole}>
                            {m.sender_role === "consultor" ? "Consultor" : "Cliente"} — {formatDateTime(m.sent_at)}
                          </div>
                          <div style={styles.messageText}>{m.text}</div>
                        </div>
                      ))
                    ) : (
                      <div style={styles.meta}>Não há mensagens guardadas nesta consulta.</div>
                    )}
                  </div>
                )}
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
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  h1: {
    fontSize: 32,
    fontWeight: 900,
    margin: 0,
  },
  linkBtn: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    textDecoration: "none",
  },
  btn: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  err: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    whiteSpace: "pre-wrap",
  },
  list: {
    display: "grid",
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  title: {
    fontSize: 18,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 8,
  },
  meta: {
    marginBottom: 6,
    opacity: 0.92,
  },
  transcript: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 10,
  },
  message: {
    borderRadius: 12,
    padding: 10,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  messageRole: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    marginBottom: 6,
  },
  messageText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
};