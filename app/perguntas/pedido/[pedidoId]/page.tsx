"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PedidoPerguntasPage() {

  const params = useParams();
  const router = useRouter();

  const pedidoId = String(params?.pedidoId || "");

  const [pacote, setPacote] = useState(0);
  const [perguntas, setPerguntas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {

    async function carregarPedido() {

      try {

        const res = await fetch(`/api/perguntas/pedido/${pedidoId}`, {
          cache: "no-store"
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Erro ao carregar pedido.");
        }

        const qtd = Number(data?.pedido?.pacote ?? 0);

        if (!qtd || qtd <= 0) {
          throw new Error("Pacote inválido.");
        }

        setPacote(qtd);
        setPerguntas(Array(qtd).fill(""));

      } catch (e: any) {

        alert(e?.message || "Erro ao carregar pedido.");

      } finally {

        setLoading(false);

      }

    }

    if (pedidoId) {
      carregarPedido();
    } else {
      setLoading(false);
    }

  }, [pedidoId]);

  function atualizarPergunta(index: number, valor: string) {

    setPerguntas((prev) => {

      const copia = [...prev];
      copia[index] = valor;

      return copia;

    });

  }

  async function enviarPerguntas() {

    try {

      setSending(true);

      const perguntasLimpas = perguntas
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (!perguntasLimpas.length) {

        alert("Escreve pelo menos uma pergunta.");
        return;

      }

      const res = await fetch("/api/perguntas/enviar", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          pedido_id: pedidoId,
          perguntas: perguntasLimpas
        })

      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao enviar perguntas.");
      }

      alert("Perguntas enviadas com sucesso.");

      router.push("/");

    } catch (e: any) {

      alert(e?.message || "Erro ao enviar perguntas.");

    } finally {

      setSending(false);

    }

  }

  if (loading) {

    return (
      <div style={{ padding: 20, color: "white" }}>
        A carregar...
      </div>
    );

  }

  return (

    <div style={styles.page}>

      <div style={styles.card}>

        <h1 style={styles.title}>
          Escrever perguntas
        </h1>

        <div style={styles.subtitle}>
          Este pedido permite até <b>{pacote}</b> pergunta{pacote > 1 ? "s" : ""}.
        </div>

        {perguntas.map((p, i) => (

          <div key={i} style={styles.block}>

            <label style={styles.label}>
              Pergunta {i + 1}
            </label>

            <textarea
              style={styles.textarea}
              value={p}
              onChange={(e) => atualizarPergunta(i, e.target.value)}
              placeholder={`Escreve aqui a tua pergunta ${i + 1}`}
            />

          </div>

        ))}

        <button
          style={styles.btn}
          onClick={enviarPerguntas}
          disabled={sending}
        >

          {sending ? "A enviar..." : "Enviar perguntas"}

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
    background: "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)"
  },

  card: {
    maxWidth: 800,
    margin: "0 auto",
    background: "rgba(0,0,0,0.28)",
    borderRadius: 18,
    padding: 24,
    border: "1px solid rgba(255,255,255,0.08)"
  },

  title: {
    fontSize: 28,
    fontWeight: 900,
    marginBottom: 10
  },

  subtitle: {
    marginBottom: 20,
    opacity: 0.9
  },

  block: {
    marginBottom: 16
  },

  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 700
  },

  textarea: {
    width: "100%",
    minHeight: 100,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.95)",
    color: "#111"
  },

  btn: {
    marginTop: 14,
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer"
  }

};