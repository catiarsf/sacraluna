"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Consultor = {
  id: number;
  nome: string;
  foto_url: string | null;
  pack_1_preco?: number;
  pack_3_preco?: number;
  pack_5_preco?: number;
  pack_10_preco?: number;
};

export default function EmailConsultorPage() {
  const params = useParams();
  const router = useRouter();

  const consultorId = Number(params?.id);

  const [consultor, setConsultor] = useState<Consultor | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/consultores/${consultorId}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        const c = data?.consultor ?? data;

        setConsultor({
          id: Number(c?.id ?? 0),
          nome: String(c?.nome ?? ""),
          foto_url: c?.foto_url ?? null,
          pack_1_preco: Number(c?.pack_1_preco ?? 1),
          pack_3_preco: Number(c?.pack_3_preco ?? 3),
          pack_5_preco: Number(c?.pack_5_preco ?? 5),
          pack_10_preco: Number(c?.pack_10_preco ?? 10),
        });
      } catch {
        alert("Erro ao carregar consultor.");
      }
    }

    if (consultorId) carregar();
  }, [consultorId]);

  async function comprarPack(pacote: number, preco: number) {
    try {
      setLoading(true);

      const res = await fetch("/api/perguntas/criar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultor_id: consultorId,
          pacote,
          preco,
        }),
      });

      const pedido = await res.json().catch(() => ({}));

      if (!res.ok || !pedido?.ok) {
        alert(pedido?.error || "Erro ao criar pedido.");
        return;
      }

      const stripe = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido_id: pedido.pedido_id,
          preco,
          consultor_id: consultorId,
        }),
      });

      const pagamento = await stripe.json().catch(() => ({}));

      if (!stripe.ok || !pagamento?.url) {
  console.log("ERRO CHECKOUT:", pagamento);
  alert(pagamento?.error || "Erro ao iniciar pagamento.");
  return;
}

      window.location.href = pagamento.url;
    } catch {
      alert("Erro ao iniciar compra.");
    } finally {
      setLoading(false);
    }
  }

  if (!consultor) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>A carregar consultor...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Consulta por Email — {consultor.nome}</h1>

        <p style={styles.text}>
          Escolhe o pack de perguntas que desejas. Depois do pagamento vais poder
          escrever as tuas perguntas.
        </p>

        <div style={styles.packs}>
          <button
            style={styles.pack}
            onClick={() => comprarPack(1, consultor.pack_1_preco || 1)}
            disabled={loading}
          >
            1 Pergunta — {(consultor.pack_1_preco || 1).toFixed(2)}€
          </button>

          <button
            style={styles.pack}
            onClick={() => comprarPack(3, consultor.pack_3_preco || 3)}
            disabled={loading}
          >
            3 Perguntas — {(consultor.pack_3_preco || 3).toFixed(2)}€
          </button>

          <button
            style={styles.pack}
            onClick={() => comprarPack(5, consultor.pack_5_preco || 5)}
            disabled={loading}
          >
            5 Perguntas — {(consultor.pack_5_preco || 5).toFixed(2)}€
          </button>

          <button
            style={styles.pack}
            onClick={() => comprarPack(10, consultor.pack_10_preco || 10)}
            disabled={loading}
          >
            10 Perguntas — {(consultor.pack_10_preco || 10).toFixed(2)}€
          </button>
        </div>

        <button style={styles.back} onClick={() => router.push("/")}>
          Voltar
        </button>
      </div>
    </div>
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

  card: {
    maxWidth: 720,
    margin: "0 auto",
    borderRadius: 18,
    padding: 24,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.28)",
  },

  title: {
    fontSize: 28,
    fontWeight: 900,
    marginBottom: 12,
  },

  text: {
    opacity: 0.9,
    marginBottom: 24,
  },

  packs: {
    display: "grid",
    gap: 12,
  },

  pack: {
    padding: "16px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.6)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 16,
  },

  back: {
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    cursor: "pointer",
  },
};