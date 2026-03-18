"use client";

import React, { useEffect, useState } from "react";

type Pedido = {
  id: string;
  pacote: number;
  status: string;
  created_at?: number;
  perguntas?: {
    id: number;
    pergunta: string;
    resposta?: string;
  }[];
};

export default function ConsultorPerguntasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarPedidos() {
    try {
      const res = await fetch("/api/consultor/perguntas", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Erro ao carregar pedidos.");

      setPedidos(data?.pedidos || []);
    } catch (e: any) {
      alert(e?.message || "Erro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPedidos();
  }, []);

  function atualizarResposta(pedidoId: string, itemId: number, valor: string) {
    setPedidos((prev) =>
      prev.map((pedido) => {
        if (pedido.id !== pedidoId) return pedido;

        return {
          ...pedido,
          perguntas: (pedido.perguntas || []).map((item) =>
            item.id === itemId ? { ...item, resposta: valor } : item
          ),
        };
      })
    );
  }

  async function guardarRespostas(pedido: Pedido) {
    try {
      const res = await fetch("/api/consultor/responder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedido_id: pedido.id,
          respostas: (pedido.perguntas || []).map((p) => ({
            item_id: p.id,
            resposta: p.resposta || "",
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao guardar respostas.");
      }

      alert("Respostas guardadas.");
      carregarPedidos();
    } catch (e: any) {
      alert(e?.message || "Erro.");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>A carregar...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pedidos de perguntas</h1>

        {pedidos.length === 0 ? (
          <div>Não há pedidos.</div>
        ) : (
          pedidos.map((pedido) => (
            <div key={pedido.id} style={styles.pedido}>
              <h2 style={styles.subTitle}>
                Pedido {pedido.id} — {pedido.status}
              </h2>

              {(pedido.perguntas || []).map((item, i) => (
                <div key={item.id} style={styles.item}>
                  <div style={styles.pergunta}>
                    <strong>Pergunta {i + 1}:</strong> {item.pergunta}
                  </div>

                  <textarea
                    style={styles.textarea}
                    value={item.resposta || ""}
                    onChange={(e) =>
                      atualizarResposta(pedido.id, item.id, e.target.value)
                    }
                    placeholder="Escreve a resposta..."
                  />
                </div>
              ))}

              <button style={styles.btn} onClick={() => guardarRespostas(pedido)}>
                Guardar respostas
              </button>
            </div>
          ))
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
    maxWidth: 900,
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
  pedido: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  subTitle: {
    marginBottom: 14,
  },
  item: {
    marginBottom: 14,
  },
  pergunta: {
    marginBottom: 8,
  },
  textarea: {
    width: "100%",
    minHeight: 100,
    padding: 12,
    borderRadius: 12,
  },
  btn: {
    marginTop: 10,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
};