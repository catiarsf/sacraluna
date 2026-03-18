"use client";

import React, { useEffect, useState } from "react";

type Consultor = {
  id: number;
  nome: string;
  pack_1_preco?: number;
  pack_3_preco?: number;
  pack_5_preco?: number;
  pack_10_preco?: number;
};

export default function PerguntasPage() {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [consultorId, setConsultorId] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/consultores")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.consultores || [];
        setConsultores(list);
      });
  }, []);

  const consultor = consultores.find((c) => c.id === consultorId);

  async function escolherPack(pacote: number) {
    if (!consultorId) {
      alert("Escolhe primeiro um consultor.");
      return;
    }

    try {
      setLoading(true);

      const resCriar = await fetch("/api/perguntas/criar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultor_id: consultorId,
          pacote,
        }),
      });

      const pedido = await resCriar.json();

      if (!resCriar.ok || !pedido?.ok) {
        throw new Error(pedido?.error || "Erro ao criar pedido.");
      }

      const resStripe = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido_id: pedido.pedido_id,
          preco: pedido.preco,
        }),
      });

      const stripe = await resStripe.json();

      if (!resStripe.ok || !stripe?.url) {
        throw new Error(stripe?.error || "Erro ao criar pagamento.");
      }

      window.location.href = stripe.url;
    } catch (e: any) {
      alert(e?.message || "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Perguntas por Consulta</h1>

        <label style={styles.label}>Escolhe o consultor</label>
        <select
          style={styles.input}
          value={consultorId}
          onChange={(e) => setConsultorId(Number(e.target.value))}
        >
          <option value={0}>Seleciona...</option>
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        {consultor && (
          <div style={styles.packs}>
            <button style={styles.packBtn} onClick={() => escolherPack(1)} disabled={loading}>
              1 pergunta — {Number(consultor.pack_1_preco ?? 1).toFixed(2)}€
            </button>

            <button style={styles.packBtn} onClick={() => escolherPack(3)} disabled={loading}>
              3 perguntas — {Number(consultor.pack_3_preco ?? 3).toFixed(2)}€
            </button>

            <button style={styles.packBtn} onClick={() => escolherPack(5)} disabled={loading}>
              5 perguntas — {Number(consultor.pack_5_preco ?? 5).toFixed(2)}€
            </button>

            <button style={styles.packBtn} onClick={() => escolherPack(10)} disabled={loading}>
              10 perguntas — {Number(consultor.pack_10_preco ?? 10).toFixed(2)}€
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    color: "#fff",
    background: "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },
  card: {
    maxWidth: 700,
    margin: "0 auto",
    background: "rgba(0,0,0,0.28)",
    borderRadius: 18,
    padding: 24,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    marginBottom: 20,
  },
  label: {
    display: "block",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  packs: {
    display: "grid",
    gap: 12,
  },
  packBtn: {
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
};