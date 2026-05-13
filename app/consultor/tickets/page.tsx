"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Ticket = {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  servico_nome: string;
  preco_eur: number;
  estado: string;
  prioridade: string;
  observacoes_cliente: string;
  created_at: number;
  updated_at: number;
  entregue_at: number;
  total_mensagens: number;
  total_anexos: number;
};

function formatDate(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

function estadoLabel(estado: string) {
  switch (estado) {
    case "pago":
      return "Pago / novo pedido";
    case "em_analise":
      return "Em análise";
    case "em_execucao":
      return "Em execução";
    case "entregue":
      return "Entregue";
    case "concluido":
      return "Concluído";
    case "cancelado":
      return "Cancelado";
    case "reaberto":
      return "Reaberto";
    default:
      return estado || "-";
  }
}

export default function ConsultorTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/consultor/tickets", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/login-consultor";
        return;
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar serviços.");
      }

      setTickets(Array.isArray(json?.tickets) ? json.tickets : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar serviços.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();

    const t = setInterval(() => {
      carregar();
    }, 10000);

    return () => clearInterval(t);
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <h1 style={styles.h1}>Tickets de serviços</h1>
          <p style={styles.sub}>Pedidos de serviços comprados pelos clientes.</p>
        </div>

        <div style={styles.actions}>
          <Link href="/consultor" style={styles.backBtn}>
            ← Voltar
          </Link>

          <button style={styles.refreshBtn} onClick={carregar} disabled={loading}>
            {loading ? "A carregar..." : "Atualizar"}
          </button>
        </div>
      </div>

      {erro ? <div style={styles.err}>{erro}</div> : null}

      {loading ? (
        <div style={styles.card}>A carregar tickets...</div>
      ) : tickets.length === 0 ? (
        <div style={styles.card}>Ainda não tens pedidos de serviços.</div>
      ) : (
        <div style={styles.list}>
          {tickets.map((ticket) => (
            <article key={ticket.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <div style={styles.badge}>{estadoLabel(ticket.estado)}</div>

                  <h2 style={styles.title}>{ticket.servico_nome}</h2>

                  <div style={styles.meta}>
                    <b>Cliente:</b> {ticket.cliente_nome || "-"}
                  </div>

                  <div style={styles.meta}>
                    <b>Email:</b> {ticket.cliente_email || "-"}
                  </div>

                  <div style={styles.meta}>
                    <b>Telefone:</b> {ticket.cliente_telefone || "-"}
                  </div>

                  <div style={styles.meta}>
                    <b>Criado em:</b> {formatDate(ticket.created_at)}
                  </div>

                  <div style={styles.meta}>
                    <b>Atualizado em:</b> {formatDate(ticket.updated_at)}
                  </div>
                </div>

                <div style={styles.sideBox}>
                  <div style={styles.price}>
                    {Number(ticket.preco_eur ?? 0).toFixed(2)}€
                  </div>

                  <div style={styles.sideMeta}>
                    {ticket.total_mensagens} mensagem(ns)
                  </div>

                  <div style={styles.sideMeta}>
                    {ticket.total_anexos} anexo(s)
                  </div>

                  <Link href={`/consultor/tickets/${ticket.id}`} style={styles.openBtn}>
                    Abrir ticket
                  </Link>
                </div>
              </div>

              {ticket.observacoes_cliente ? (
                <div style={styles.note}>
                  <b>Observações do cliente:</b>
                  <br />
                  {ticket.observacoes_cliente}
                </div>
              ) : null}
            </article>
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
    gap: 14,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  h1: {
    margin: 0,
    fontSize: 34,
    fontWeight: 950,
    color: "#f4d78b",
  },
  sub: {
    marginTop: 8,
    opacity: 0.86,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  backBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
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
  err: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,0,0,0.12)",
    border: "1px solid rgba(255,0,0,0.25)",
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
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(212,175,55,0.12)",
    border: "1px solid rgba(212,175,55,0.32)",
    color: "#f4d78b",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 10,
  },
  title: {
    margin: "0 0 10px",
    fontSize: 23,
    fontWeight: 950,
  },
  meta: {
    marginBottom: 6,
    opacity: 0.9,
  },
  sideBox: {
    minWidth: 180,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 8,
    alignContent: "start",
  },
  price: {
    fontSize: 26,
    fontWeight: 950,
    color: "#f4d78b",
  },
  sideMeta: {
    fontSize: 13,
    opacity: 0.85,
  },
  openBtn: {
    marginTop: 8,
    display: "inline-flex",
    justifyContent: "center",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(212,175,55,0.14)",
    color: "#f4d78b",
    fontWeight: 900,
  },
  note: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
};