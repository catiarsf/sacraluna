"use client";

import { useState } from "react";

export default function ChatPage() {
  const [text, setText] = useState("");

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>
        Chat da Consulta
      </h1>

      <div style={styles.chatBox}>
        <div style={styles.msg}>
          Sistema de chat ativo.
        </div>
      </div>

      <div style={styles.inputBar}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem..."
          style={styles.input}
        />

        <button style={styles.button}>
          Enviar
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1020",
    padding: 20,
    color: "white",
  },

  title: {
    fontSize: 32,
    fontWeight: 900,
    marginBottom: 20,
  },

  chatBox: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    minHeight: 300,
  },

  msg: {
    background: "rgba(212,175,55,0.15)",
    padding: 12,
    borderRadius: 12,
  },

  inputBar: {
    display: "flex",
    gap: 12,
    marginTop: 20,
  },

  input: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    border: "none",
  },

  button: {
    padding: "14px 20px",
    borderRadius: 12,
    border: "none",
    background: "#d4af37",
    fontWeight: 900,
    cursor: "pointer",
  },
};