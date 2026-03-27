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

type ClientePedido = {
  id: string;
  consultor_nome: string;
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

function statusLabel(status: string) {
  switch (status) {
    case "aguarda_pagamento":
      return "Aguarda pagamento";
    case "aguarda_resposta":
      return "Aguarda resposta";
    case "em_resposta":
      return "Em resposta";
    case "respondido":
      return "Respondido";
    default:
      return status || "-";
  }
}

export default function ClienteEmailsPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [pedidos, setPedidos] = useState<ClientePedido[]>([]);
  const [expandedId, setExpandedId] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/cliente/emails", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar pedidos de email.");
      }

      setPedidos(Array.isArray(json?.pedidos) ? json.pedidos : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar pedidos de email.");
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
        <h1 style={styles.h1}>Os meus pedidos por email</h1>

        <div style={styles.actions}>
          <Link href="/cliente" style={styles.linkBtn}>
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
        <div style={styles.card}>
          Ainda não tens pedidos de consulta por email.
        </div>
      ) : (
        <div style={styles.list}>
          {pedidos.map((pedido) => {
            const expanded = expandedId === pedido.id;
            const podeEditarPerguntas =
              pedido.status === "aguarda_pagamento" ||
              pedido.status === "aguarda_resposta";

            return (
              <div key={pedido.id} style={styles.card}>
                <div style={styles.headerCard}>
                  <div>
                    <div style={styles.title}>Pedido</div>
                    <div style={styles.meta}>
                      <b>Consultora:</b> {pedido.consultor_nome || "-"}
                    </div>
                    <div style={styles.meta}>
                      <b>Pacote:</b> {pedido.pacote} pergunta(s)
                    </div>
                    <div style={styles.meta}>
                      <b>Preço:</b> {Number(pedido.preco_eur ?? 0).toFixed(2)}€
                    </div>
                    <div style={styles.meta}>
                      <b>Status:</b> {statusLabel(pedido.status)}
                    </div>
                    <div style={styles.meta}>
                      <b>Criado:</b> {formatDateTime(pedido.created_at)}
                    </div>
                    <div style={styles.meta}>
                      <b>Respondido:</b> {formatDateTime(pedido.respondido_at)}
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button
                      style={styles.btnSmall}
                      onClick={() => setExpandedId(expanded ? "" : pedido.id)}
                    >
                      {expanded ? "Fechar" : "Ver detalhes"}
                    </button>

                    {podeEditarPerguntas ? (
                      <Link
                        href={`/perguntas/${pedido.id}`}
                        style={styles.linkSmallBtn}
                      >
                        Editar perguntas
                      </Link>
                    ) : null}
                  </div>
                </div>

                {expanded && (
                  <div style={styles.transcript}>
                    {pedido.itens?.length ? (
                      pedido.itens.map((it) => (
                        <div key={it.id} style={styles.message}>
                          <div style={styles.messageRole}>
                            Pergunta enviada em {formatDateTime(it.created_at)}
                          </div>

                          <div style={styles.block}>
                            <b>Pergunta:</b> {it.pergunta || "-"}
                          </div>

                          <div style={styles.block}>
                            <b>Resposta:</b>{" "}
                            {it.resposta?.trim()
                              ? it.resposta
                              : "Ainda sem resposta"}
                          </div>

                          <div style={styles.messageFoot}>
                            <b>Data da resposta:</b> {formatDateTime(it.responded_at)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={styles.meta}>Ainda não há perguntas neste pedido.</div>
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
  h1: {
    fontSize: 32,
    fontWeight: 900,
    margin: 0,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
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
  headerCard: {
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
    padding: 12,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  messageRole: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    marginBottom: 8,
  },
  block: {
    marginBottom: 8,
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
  messageFoot: {
    opacity: 0.8,
    fontSize: 13,
  },
};