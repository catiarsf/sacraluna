"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type EmailItem = {
  id: number;
  pergunta: string;
  resposta: string;
  created_at: number;
  responded_at: number;
};

type EmailPedido = {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  pacote: number;
  preco_eur: number;
  status: string;
  created_at: number;
  respondido_at: number;
  itens: EmailItem[];
};

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

export default function ConsultorHistoricoEmailPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [pedidos, setPedidos] = useState<EmailPedido[]>([]);
  const [expandedId, setExpandedId] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/consultor/emails", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar histórico de email.");
      }

      setPedidos(Array.isArray(json?.pedidos) ? json.pedidos : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar histórico de email.");
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
        <h1 style={styles.h1}>Histórico email</h1>
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
      ) : pedidos.length === 0 ? (
        <div style={styles.card}>Ainda não há histórico de email para mostrar.</div>
      ) : (
        <div style={styles.list}>
          {pedidos.map((item) => {
            const expanded = expandedId === item.id;

            return (
              <div key={item.id} style={styles.card}>
                <div style={styles.historyTop}>
                  <div>
                    <div style={styles.title}>Pedido</div>
                    <div style={styles.meta}>
                      <b>Cliente:</b> {item.cliente_nome || "-"} ({item.cliente_email || "-"})
                    </div>
                    <div style={styles.meta}>
                      <b>Pacote:</b> {item.pacote}
                    </div>
                    <div style={styles.meta}>
                      <b>Preço:</b> {Number(item.preco_eur ?? 0).toFixed(2)}€
                    </div>
                    <div style={styles.meta}>
                      <b>Status:</b> {item.status}
                    </div>
                    <div style={styles.meta}>
                      <b>Criado:</b> {formatDateTime(item.created_at)}
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button
                      style={styles.btnSmall}
                      onClick={() => setExpandedId(expanded ? "" : item.id)}
                    >
                      {expanded ? "Fechar" : "Ver conteúdo"}
                    </button>

                    <Link
                      href={`/consultor/responder-email/${item.id}`}
                      style={styles.linkSmallBtn}
                    >
                      Responder
                    </Link>
                  </div>
                </div>

                {expanded && (
                  <div style={styles.transcript}>
                    {item.itens?.length ? (
                      item.itens.map((it) => (
                        <div key={it.id} style={styles.message}>
                          <div style={styles.messageRole}>
                            Pergunta enviada em {formatDateTime(it.created_at)}
                          </div>
                          <div>
                            <b>Pergunta:</b> {it.pergunta || "-"}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <b>Resposta:</b> {it.resposta || "Ainda sem resposta"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={styles.meta}>Sem itens neste pedido.</div>
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
  linkSmallBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.12)",
    color: "#f4d78b",
    fontWeight: 800,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
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
};