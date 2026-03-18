import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

export default function AdminContactosPage() {
  const contactos = db
    .prepare(
      `
      SELECT
        id,
        nome,
        email,
        telefone,
        assunto,
        mensagem,
        status,
        created_at
      FROM contactos
      ORDER BY created_at DESC
      `
    )
    .all() as any[];

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <h1 style={styles.h1}>Mensagens de contacto</h1>
          <Link href="/admin" style={styles.back}>
            Voltar ao admin
          </Link>
        </div>

        {contactos.length === 0 ? (
          <div style={styles.empty}>Ainda não existem mensagens.</div>
        ) : (
          <div style={styles.list}>
            {contactos.map((c) => (
              <article key={c.id} style={styles.card}>
                <div style={styles.row}>
                  <strong>{c.nome}</strong>
                  <span style={styles.status}>{c.status}</span>
                </div>

                <div style={styles.meta}>Email: {c.email}</div>
                <div style={styles.meta}>Telefone: {c.telefone || "—"}</div>
                <div style={styles.meta}>Assunto: {c.assunto || "—"}</div>

                <div style={styles.message}>{c.mensagem}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    color: "white",
  },
  wrap: {
    maxWidth: 1000,
    margin: "0 auto",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  h1: {
    margin: 0,
    fontSize: 30,
    color: "#f4d78b",
  },
  back: {
    color: "#f4d78b",
    textDecoration: "none",
    fontWeight: 800,
  },
  empty: {
    padding: 20,
    borderRadius: 14,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  list: {
    display: "grid",
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  status: {
    color: "#f4d78b",
    fontWeight: 800,
  },
  meta: {
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 6,
  },
  message: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
};