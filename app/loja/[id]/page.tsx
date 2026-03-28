"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Servico = {
  id: number;
  nome: string;
  descricao: string;
  preco_eur: number;
  imagem_url: string;
  ativo: number;
};

export default function LojaDetalhePage() {
  const params = useParams();
  const router = useRouter();

  const servicoId = useMemo(() => {
    const raw = (params as any)?.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [servico, setServico] = useState<Servico | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadServico() {
      if (!Number.isFinite(servicoId) || servicoId <= 0) {
        setErro("Serviço inválido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErro("");

        const res = await fetch(`/api/loja/${servicoId}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar serviço.");
        }

        setServico(data?.servico ?? null);
      } catch (e: any) {
        setErro(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    }

    loadServico();
  }, [servicoId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!servico) return;

    setErro("");

    if (!nome.trim()) {
      setErro("O teu nome é obrigatório.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErro("Introduz um email válido.");
      return;
    }

    if (!telefone.trim()) {
      setErro("Introduz o teu contacto / WhatsApp.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/loja/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          servico_id: servico.id,
          nome_cliente: nome,
          email_cliente: email,
          telefone_cliente: telefone,
          notas,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok || !data?.url) {
        throw new Error(data?.error || "Erro ao iniciar pagamento.");
      }

      window.location.href = data.url;
    } catch (e: any) {
      setErro(String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.loadingBox}>A carregar serviço...</div>
        </div>
      </main>
    );
  }

  if (erro && !servico) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.errorBox}>{erro}</div>
        </div>
      </main>
    );
  }

  if (!servico) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.errorBox}>Serviço não encontrado.</div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <button style={styles.backBtn} onClick={() => router.push("/loja")}>
          ← Voltar aos serviços
        </button>

        <div style={styles.grid}>
          <section style={styles.serviceCard}>
            <div style={styles.imageWrap}>
              <img
                src={servico.imagem_url || "/servicos/default.jpg"}
                alt={servico.nome}
                style={styles.image}
              />
            </div>

            <div style={styles.info}>
              <div style={styles.kicker}>Serviço espiritual</div>

              <div style={styles.topRow}>
                <h1 style={styles.h1}>{servico.nome}</h1>
                <div style={styles.priceBadge}>
                  {Number(servico.preco_eur ?? 0).toFixed(2)}€
                </div>
              </div>

              <div style={styles.descriptionBox}>
                <div style={styles.sectionTitle}>Descrição do serviço</div>
                <p style={styles.desc}>
                  {servico.descricao || "Sem descrição disponível."}
                </p>
              </div>
            </div>
          </section>

          <section style={styles.formCard}>
            <div style={styles.formKicker}>Pedido de serviço</div>
            <h2 style={styles.h2}>Dados para contacto</h2>
            <p style={styles.formSub}>
              Depois do pagamento, entrarei em contacto contigo para realizar este
              serviço com cuidado, descrição e intenção.
            </p>

            {erro ? <div style={styles.inlineError}>{erro}</div> : null}

            <form onSubmit={onSubmit} style={styles.form}>
              <label style={styles.label}>Nome</label>
              <input
                style={styles.input}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="O teu nome"
              />

              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="O teu email"
              />

              <label style={styles.label}>Telefone / WhatsApp</label>
              <input
                style={styles.input}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="O teu contacto"
              />

              <label style={styles.label}>Notas adicionais</label>
              <textarea
                style={styles.textarea}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Escreve aqui alguma informação importante para este pedido..."
              />

              <button type="submit" style={styles.payBtn} disabled={submitting}>
                {submitting ? "A redirecionar..." : "Pagar com Stripe"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px 14px 48px",
    color: "white",
  },

  wrap: {
    maxWidth: 1200,
    margin: "0 auto",
  },

  backBtn: {
    marginBottom: 20,
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.40)",
    background: "rgba(0,0,0,0.24)",
    color: "#f4d78b",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
    alignItems: "start",
  },

  serviceCard: {
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(10,10,18,0.88) 0%, rgba(22,18,10,0.82) 100%)",
    border: "1px solid rgba(212,175,55,0.18)",
    padding: 18,
    boxShadow: "0 18px 36px rgba(0,0,0,0.28)",
  },

  formCard: {
    borderRadius: 24,
    background: "rgba(8,10,18,0.84)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 18,
    boxShadow: "0 18px 36px rgba(0,0,0,0.26)",
  },

  imageWrap: {
    width: "100%",
    minHeight: 300,
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(10,10,20,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    border: "1px solid rgba(255,255,255,0.06)",
  },

  image: {
    width: "100%",
    maxHeight: 440,
    objectFit: "contain",
    display: "block",
  },

  info: {
    marginTop: 18,
    display: "grid",
    gap: 16,
  },

  kicker: {
    color: "#f4d78b",
    fontWeight: 800,
    letterSpacing: 1.1,
    fontSize: 12,
    textTransform: "uppercase",
    opacity: 0.88,
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-start",
  },

  h1: {
    margin: 0,
    fontSize: "clamp(28px, 5vw, 34px)",
    fontWeight: 950,
    lineHeight: 1.08,
    color: "#fff7d6",
  },

  priceBadge: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(212,175,55,0.14)",
    border: "1px solid rgba(212,175,55,0.35)",
    color: "#f4d78b",
    fontWeight: 950,
    fontSize: "clamp(20px, 4vw, 24px)",
    whiteSpace: "nowrap",
  },

  descriptionBox: {
    padding: 18,
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },

  sectionTitle: {
    fontSize: 13,
    color: "#f4d78b",
    marginBottom: 10,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  desc: {
    margin: 0,
    lineHeight: 1.8,
    opacity: 0.94,
    fontSize: 15,
  },

  formKicker: {
    color: "#f4d78b",
    fontWeight: 800,
    letterSpacing: 1.1,
    fontSize: 12,
    textTransform: "uppercase",
    opacity: 0.88,
    marginBottom: 10,
  },

  h2: {
    fontSize: 24,
    color: "#fff7d6",
    margin: "0 0 10px",
    fontWeight: 900,
  },

  formSub: {
    marginBottom: 16,
    lineHeight: 1.65,
    opacity: 0.9,
  },

  inlineError: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    color: "#ffb4b4",
  },

  form: {
    display: "grid",
    gap: 10,
  },

  label: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.88,
    marginTop: 4,
  },

  input: {
    padding: 13,
    borderRadius: 14,
    background: "rgba(0,0,0,0.36)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.10)",
    outline: "none",
  },

  textarea: {
    padding: 13,
    borderRadius: 14,
    background: "rgba(0,0,0,0.36)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.10)",
    outline: "none",
    minHeight: 130,
    resize: "vertical",
  },

  payBtn: {
    marginTop: 10,
    padding: 15,
    borderRadius: 16,
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 950,
    border: "1px solid rgba(212,175,55,0.60)",
    cursor: "pointer",
    fontSize: 15,
    boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
  },

  loadingBox: {
    padding: 24,
    borderRadius: 18,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  errorBox: {
    padding: 24,
    borderRadius: 18,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.20)",
    color: "#ffb4b4",
  },
};