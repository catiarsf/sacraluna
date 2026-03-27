"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type EmailItem = {
  id: number;
  pergunta: string;
  resposta: string;
  created_at: number;
  responded_at: number;
};

type PedidoEmail = {
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

export default function ResponderEmailPage() {
  const params = useParams();
  const router = useRouter();
  const pedidoId = String((params as any)?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [pedido, setPedido] = useState<PedidoEmail | null>(null);
  const [respostas, setRespostas] = useState<Record<number, string>>({});

  async function carregarPedido() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/consultor/emails", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar pedido.");
      }

      const pedidos = Array.isArray(json?.pedidos) ? json.pedidos : [];
      const atual = pedidos.find((p: any) => String(p.id) === pedidoId);

      if (!atual) {
        throw new Error("Pedido não encontrado.");
      }

      setPedido(atual);

      const mapa: Record<number, string> = {};
      for (const item of atual.itens || []) {
        mapa[item.id] = String(item.resposta ?? "");
      }
      setRespostas(mapa);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar pedido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pedidoId) carregarPedido();
  }, [pedidoId]);

  async function guardarRespostas() {
    try {
      setSaving(true);
      setErro("");
      setSucesso("");

      const itens = Object.entries(respostas).map(([id, resposta]) => ({
        id: Number(id),
        resposta: String(resposta ?? "").trim(),
      }));

      const res = await fetch("/api/consultor/responder-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido_id: pedidoId,
          itens,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao guardar respostas.");
      }

      setSucesso("Respostas guardadas com sucesso.");
      await carregarPedido();
    } catch (e: any) {
      setErro(e?.message || "Erro ao guardar respostas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.topRow}>
        <h1 style={styles.h1}>Responder email</h1>
        <div style={styles.row}>
          <Link href="/consultor/historico-email" style={styles.linkBtn}>
            ← Voltar
          </Link>
        </div>
      </div>

      {erro ? <div style={styles.err}>{erro}</div> : null}
      {sucesso ? <div style={styles.success}>{sucesso}</div> : null}

      {loading ? (
        <div style={styles.card}>A carregar...</div>
      ) : !pedido ? (
        <div style={styles.card}>Pedido não encontrado.</div>
      ) : (
        <>
          <div style={styles.card}>
            <div style={styles.title}>Pedido {pedido.id}</div>
            <div style={styles.meta}><b>Cliente:</b> {pedido.cliente_nome}</div>
            <div style={styles.meta}><b>Email:</b> {pedido.cliente_email}</div>
            <div style={styles.meta}><b>Pacote:</b> {pedido.pacote}</div>
            <div style={styles.meta}><b>Status:</b> {pedido.status}</div>
            <div style={styles.meta}><b>Criado:</b> {formatDateTime(pedido.created_at)}</div>
          </div>

          <div style={styles.list}>
            {(pedido.itens || []).map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.questionTitle}>Pergunta</div>
                <div style={styles.questionText}>{item.pergunta || "-"}</div>

                <label style={styles.label}>Resposta</label>
                <textarea
                  style={styles.textarea}
                  value={respostas[item.id] ?? ""}
                  onChange={(e) =>
                    setRespostas((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  placeholder="Escreve aqui a resposta..."
                />
              </div>
            ))}
          </div>

          <button style={styles.btn} onClick={guardarRespostas} disabled={saving}>
            {saving ? "A guardar..." : "Guardar respostas"}
          </button>
        </>
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
  card: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  list: {
    display: "grid",
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 8,
  },
  meta: {
    marginBottom: 6,
    opacity: 0.92,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 8,
  },
  questionText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
    marginBottom: 14,
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 800,
  },
  textarea: {
    width: "100%",
    minHeight: 130,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "12px 12px",
    outline: "none",
    resize: "vertical",
  },
  btn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background: "rgba(212,175,55,0.95)",
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
  },
  success: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(40,140,80,0.18)",
    border: "1px solid rgba(90,200,120,0.30)",
  },
};