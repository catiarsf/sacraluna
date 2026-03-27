"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PedidoInfo = {
  id: string;
  pacote: number;
  status: string;
};

export default function PerguntasPedidoPage() {
  const params = useParams();
  const router = useRouter();
  const pedidoId = String((params as any)?.pedidoId || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [pedido, setPedido] = useState<PedidoInfo | null>(null);
  const [perguntas, setPerguntas] = useState<string[]>([]);

  async function carregarPedido() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/cliente/emails", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar pedido.");
      }

      const pedidos = Array.isArray(json?.pedidos) ? json.pedidos : [];
      const atual = pedidos.find((p: any) => String(p.id) === pedidoId);

      if (!atual) {
        throw new Error("Pedido não encontrado.");
      }

      setPedido({
        id: String(atual.id),
        pacote: Number(atual.pacote ?? 0),
        status: String(atual.status ?? ""),
      });

      const existentes = Array.isArray(atual.itens)
        ? atual.itens.map((it: any) => String(it.pergunta ?? ""))
        : [];

      const total = Number(atual.pacote ?? 0);
      const lista = Array.from({ length: total }, (_, i) => existentes[i] ?? "");
      setPerguntas(lista);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar pedido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pedidoId) carregarPedido();
  }, [pedidoId]);

  async function guardar() {
    try {
      setSaving(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/perguntas/guardar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido_id: pedidoId,
          perguntas,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao guardar perguntas.");
      }

      setSucesso("Perguntas enviadas com sucesso.");
      setTimeout(() => {
        router.push("/cliente/emails");
      }, 1200);
    } catch (e: any) {
      setErro(e?.message || "Erro ao guardar perguntas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Enviar perguntas</h1>

      {erro ? <div style={styles.err}>{erro}</div> : null}
      {sucesso ? <div style={styles.success}>{sucesso}</div> : null}

      {loading ? (
        <div style={styles.card}>A carregar...</div>
      ) : !pedido ? (
        <div style={styles.card}>Pedido não encontrado.</div>
      ) : (
        <>
          <div style={styles.card}>
            <div><b>Pedido:</b> {pedido.id}</div>
            <div><b>Pacote:</b> {pedido.pacote} pergunta(s)</div>
            <div><b>Status:</b> {pedido.status}</div>
          </div>

          <div style={styles.list}>
            {perguntas.map((pergunta, index) => (
              <div key={index} style={styles.card}>
                <label style={styles.label}>Pergunta {index + 1}</label>
                <textarea
                  style={styles.textarea}
                  value={pergunta}
                  onChange={(e) => {
                    const copia = [...perguntas];
                    copia[index] = e.target.value;
                    setPerguntas(copia);
                  }}
                  placeholder={`Escreve a pergunta ${index + 1}...`}
                />
              </div>
            ))}
          </div>

          <button style={styles.btn} onClick={guardar} disabled={saving}>
            {saving ? "A guardar..." : "Enviar perguntas"}
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
  h1: {
    fontSize: 32,
    fontWeight: 900,
    marginBottom: 18,
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
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 800,
  },
  textarea: {
    width: "100%",
    minHeight: 120,
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