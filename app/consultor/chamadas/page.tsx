"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type VoiceCall = {
  id: string;
  cliente_nome: string;
  status: string;
  call_sid: string;
  price_per_min: number;
  duration_seconds: number;
  recording_url: string;
  created_at: number;
  started_at: number;
  ended_at: number;
};

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

function formatDuration(totalSeconds?: number) {
  const s = Number(totalSeconds ?? 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ConsultorChamadasPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [calls, setCalls] = useState<VoiceCall[]>([]);

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/consultor/calls", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar histórico de chamadas.");
      }

      setCalls(Array.isArray(json?.calls) ? json.calls : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar histórico de chamadas.");
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
        <h1 style={styles.h1}>Histórico voz</h1>
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
      ) : calls.length === 0 ? (
        <div style={styles.card}>Ainda não há chamadas para mostrar.</div>
      ) : (
        <div style={styles.list}>
          {calls.map((call) => (
            <div key={call.id} style={styles.card}>
              <div style={styles.title}>Chamada</div>
              <div style={styles.meta}><b>Cliente:</b> {call.cliente_nome || "-"}</div>
              <div style={styles.meta}><b>Estado:</b> {call.status || "-"}</div>
              <div style={styles.meta}><b>Início:</b> {formatDateTime(call.started_at || call.created_at)}</div>
              <div style={styles.meta}><b>Fim:</b> {formatDateTime(call.ended_at)}</div>
              <div style={styles.meta}><b>Duração:</b> {formatDuration(call.duration_seconds)}</div>
              <div style={styles.meta}><b>Preço voz:</b> {Number(call.price_per_min ?? 0).toFixed(2)}€/min</div>

              {call.recording_url ? (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.meta}><b>Gravação:</b></div>
                  <audio controls style={{ width: "100%", marginTop: 8 }}>
                    <source src={call.recording_url} />
                  </audio>
                </div>
              ) : (
                <div style={{ ...styles.meta, marginTop: 12 }}>
                  <b>Gravação:</b> ainda não disponível
                </div>
              )}
            </div>
          ))}
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
};