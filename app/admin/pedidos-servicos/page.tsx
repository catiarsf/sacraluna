"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PedidoServico = {
  id: string;
  servico_id: number;
  servico_nome: string;
  nome_cliente: string;
  email_cliente: string;
  telefone_cliente: string;
  notas: string;
  preco_eur: number;
  status: string;
  stripe_session_id: string | null;
  created_at: number;
  paid_at: number | null;
};

function fmtDate(ts?: number | null) {
  if (!ts) return "-";
  try {
    return new Date(ts * 1000).toLocaleString("pt-PT");
  } catch {
    return "-";
  }
}

export default function AdminPedidosServicosPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [list, setList] = useState<PedidoServico[]>([]);

  const pagosCount = useMemo(
    () => list.filter((p) => String(p.status) === "pago").length,
    [list]
  );

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/pedidos-servicos", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar pedidos.");
      }

      const arr = Array.isArray(data?.pedidos) ? data.pedidos : [];
      setList(arr);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Administração · Pedidos de Serviços</h1>
        <div style={styles.stats}>
          <div>
            Pedidos: <b>{list.length}</b>
          </div>
          <div>
            Pagos: <b>{pagosCount}</b>
          </div>
        </div>
      </div>

      <div style={styles.quickRow}>
        <Link href="/admin" style={styles.quickCard}>
          <div style={styles.quickTitle}>Consultores</div>
          <div style={styles.quickText}>Voltar à gestão de consultores</div>
        </Link>

        <Link href="/admin/loja" style={styles.quickCard}>
          <div style={styles.quickTitle}>Loja</div>
          <div style={styles.quickText}>Gerir serviços, preços e imagens</div>
        </Link>

        <Link href="/admin/pedidos-servicos" style={styles.quickCardActive}>
          <div style={styles.quickTitle}>Pedidos</div>
          <div style={styles.quickText}>Ver compras pagas e contactos dos clientes</div>
        </Link>
      </div>

      {err && <div style={styles.err}>{err}</div>}

      <div style={styles.card}>
        <h2 style={styles.h2}>Lista de pedidos</h2>

        {loading ? (
          <div style={styles.small}>A carregar...</div>
        ) : list.length === 0 ? (
          <div style={styles.small}>Ainda não existem pedidos de serviços.</div>
        ) : (
          <div style={styles.list}>
            {list.map((p) => (
              <div key={p.id} style={styles.item}>
                <div style={styles.itemTop}>
                  <div>
                    <div style={styles.itemTitle}>{p.servico_nome}</div>
                    <div style={styles.small}>Pedido: {p.id}</div>
                  </div>

                  <div
                    style={
                      String(p.status) === "pago" ? styles.badgePaid : styles.badgePending
                    }
                  >
                    {String(p.status) === "pago" ? "Pago" : "Pendente"}
                  </div>
                </div>

                <div style={styles.infoGrid}>
                  <div>
                    <div style={styles.label}>Cliente</div>
                    <div style={styles.value}>{p.nome_cliente}</div>
                  </div>

                  <div>
                    <div style={styles.label}>Email</div>
                    <div style={styles.value}>{p.email_cliente}</div>
                  </div>

                  <div>
                    <div style={styles.label}>Telefone / WhatsApp</div>
                    <div style={styles.value}>{p.telefone_cliente || "-"}</div>
                  </div>

                  <div>
                    <div style={styles.label}>Preço</div>
                    <div style={styles.value}>{Number(p.preco_eur ?? 0).toFixed(2)}€</div>
                  </div>

                  <div>
                    <div style={styles.label}>Criado em</div>
                    <div style={styles.value}>{fmtDate(p.created_at)}</div>
                  </div>

                  <div>
                    <div style={styles.label}>Pago em</div>
                    <div style={styles.value}>{fmtDate(p.paid_at)}</div>
                  </div>
                </div>

                <div style={styles.notesBox}>
                  <div style={styles.label}>Notas do cliente</div>
                  <div style={styles.notes}>{p.notas || "Sem notas adicionais."}</div>
                </div>

                <div style={styles.footerLine}>
                  <div style={styles.small}>
                    Stripe session: {p.stripe_session_id || "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 20, maxWidth: 1200, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  h1: { fontSize: 28, margin: 0 },
  stats: { display: "flex", gap: 16, opacity: 0.9, flexWrap: "wrap" },
  quickRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  quickCard: {
    display: "block",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 16,
    color: "white",
  },
  quickCardActive: {
    display: "block",
    textDecoration: "none",
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.10)",
    borderRadius: 14,
    padding: 16,
    color: "#f4d78b",
  },
  quickTitle: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 6,
  },
  quickText: {
    fontSize: 13,
    opacity: 0.82,
    lineHeight: 1.5,
  },
  card: {
    marginTop: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 16,
  },
  h2: { margin: "0 0 12px", fontSize: 18 },
  err: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    whiteSpace: "pre-wrap",
  },
  list: {
    display: "grid",
    gap: 12,
  },
  item: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 14,
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#f4d78b",
  },
  badgePaid: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(90,200,120,0.55)",
    background: "rgba(50,140,80,0.30)",
    color: "#d7ffe0",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  badgePending: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(180,180,180,0.35)",
    background: "rgba(90,90,90,0.30)",
    color: "#f1f1f1",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  label: {
    fontSize: 12,
    opacity: 0.72,
    marginBottom: 4,
  },
  value: {
    fontWeight: 700,
    wordBreak: "break-word",
  },
  notesBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  notes: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
  footerLine: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  small: {
    fontSize: 12,
    opacity: 0.75,
    wordBreak: "break-all",
  },
};