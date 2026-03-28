import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Mensagem = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  assunto: string | null;
  mensagem: string;
  status: string;
  created_at: number;
};

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

export default async function AdminMensagensPage() {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/admin-login");
  }

  const mensagens = db
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
    .all() as Mensagem[];

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.topRow}>
          <h1 style={styles.h1}>Mensagens</h1>
          <a href="/admin" style={styles.backBtn}>
            ← Voltar ao admin
          </a>
        </div>

        {mensagens.length === 0 ? (
          <div style={styles.emptyBox}>Ainda não existem mensagens.</div>
        ) : (
          <div style={styles.list}>
            {mensagens.map((m) => (
              <article key={m.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.nome}>{m.nome}</div>
                    <div style={styles.meta}>{m.email}</div>
                    <div style={styles.meta}>
                      Telefone: {m.telefone?.trim() ? m.telefone : "—"}
                    </div>
                  </div>

                  <div style={styles.rightMeta}>
                    <div style={styles.badge}>{m.status || "novo"}</div>
                    <div style={styles.meta}>{formatDateTime(m.created_at)}</div>
                  </div>
                </div>

                <div style={styles.assunto}>
                  <b>Assunto:</b> {m.assunto?.trim() ? m.assunto : "Sem assunto"}
                </div>

                <div style={styles.mensagem}>
                  <b>Mensagem:</b>
                  <div style={styles.mensagemTexto}>{m.mensagem}</div>
                </div>
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
    padding: "24px 16px 42px",
    color: "white",
  },

  wrap: {
    maxWidth: 1100,
    margin: "0 auto",
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  },

  h1: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
  },

  backBtn: {
    display: "inline-block",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.10)",
    color: "#f4d78b",
    fontWeight: 900,
  },

  emptyBox: {
    padding: 22,
    borderRadius: 16,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  list: {
    display: "grid",
    gap: 14,
  },

  card: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.24)",
    padding: 16,
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  nome: {
    fontSize: 18,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 4,
  },

  meta: {
    fontSize: 13,
    opacity: 0.82,
    marginTop: 4,
  },

  rightMeta: {
    display: "grid",
    justifyItems: "end",
    gap: 8,
  },

  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.14)",
    color: "#f4d78b",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  },

  assunto: {
    marginBottom: 12,
    lineHeight: 1.6,
  },

  mensagem: {
    lineHeight: 1.6,
  },

  mensagemTexto: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "pre-wrap",
  },
};