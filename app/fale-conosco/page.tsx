"use client";

import React, { useState } from "react";

export default function FaleConoscoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    try {
      setLoading(true);

      const res = await fetch("/api/contactos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          assunto,
          mensagem,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Não foi possível enviar a mensagem.");
      }

      setNome("");
      setEmail("");
      setTelefone("");
      setAssunto("");
      setMensagem("");
      setSucesso("Recebemos a tua mensagem. Responderemos assim que possível.");
    } catch (e: any) {
      setErro(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.h1}>Fale connosco</h1>
          <p style={styles.sub}>
            Tens dúvidas, pedidos ou questões? Envia-nos a tua mensagem.
          </p>

          {erro ? <div style={styles.error}>{erro}</div> : null}
          {sucesso ? <div style={styles.success}>{sucesso}</div> : null}

          <form onSubmit={onSubmit} style={styles.form}>
            <label style={styles.label}>Nome</label>
            <input style={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} />

            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label style={styles.label}>Telefone</label>
            <input
              style={styles.input}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />

            <label style={styles.label}>Assunto</label>
            <input
              style={styles.input}
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
            />

            <label style={styles.label}>Mensagem</label>
            <textarea
              style={styles.textarea}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "A enviar..." : "Enviar mensagem"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px 16px 40px",
    color: "white",
  },
  wrap: {
    maxWidth: 760,
    margin: "0 auto",
  },
  card: {
    borderRadius: 20,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(212,175,55,0.16)",
    padding: 20,
  },
  h1: {
    margin: "0 0 10px",
    fontSize: 34,
    fontWeight: 900,
    color: "#f4d78b",
  },
  sub: {
    margin: "0 0 18px",
    opacity: 0.9,
    lineHeight: 1.6,
  },
  form: {
    display: "grid",
    gap: 10,
  },
  label: {
    fontSize: 12,
    opacity: 0.9,
  },
  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    minHeight: 140,
    resize: "vertical",
  },
  button: {
    marginTop: 8,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.60)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  error: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(120,0,0,0.22)",
    border: "1px solid rgba(255,80,80,0.20)",
    color: "#ffd6d6",
  },
  success: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(0,120,60,0.22)",
    border: "1px solid rgba(80,255,160,0.20)",
    color: "#d6ffe7",
  },
};