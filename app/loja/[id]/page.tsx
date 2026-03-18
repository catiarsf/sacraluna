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
          <div style={styles.box}>A carregar serviço...</div>
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
              <div style={styles.topRow}>
                <h1 style={styles.h1}>{servico.nome}</h1>
                <div style={styles.price}>
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
            <h2 style={styles.h2}>Dados para contacto</h2>
            <p style={styles.formSub}>
              Depois do pagamento, entrarei em contacto contigo para realizar este serviço.
            </p>

            {erro && <div style={styles.inlineError}>{erro}</div>}

            <form onSubmit={onSubmit} style={styles.form}>
              <label style={styles.label}>Nome</label>
              <input style={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} />

              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />

              <label style={styles.label}>Telefone / WhatsApp</label>
              <input
                style={styles.input}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />

              <label style={styles.label}>Notas adicionais</label>
              <textarea
                style={styles.textarea}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
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
    padding: "24px 14px 42px",
    color: "white",
  },

  wrap: {
    maxWidth: 1200,
    margin: "0 auto",
  },

  backBtn: {
    marginBottom: 18,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(0,0,0,0.24)",
    color: "#f4d78b",
    fontWeight: 900,
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 18,
  },

  serviceCard: {
    borderRadius: 20,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(212,175,55,0.16)",
    padding: 16,
  },

  formCard: {
    borderRadius: 20,
    background: "rgba(0,0,0,0.24)",
    border: "1px solid rgba(212,175,55,0.16)",
    padding: 16,
  },

  imageWrap: {
    width: "100%",
    minHeight: 260,
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(10,10,20,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },

  image: {
    width: "100%",
    maxHeight: 420,
    objectFit: "contain",
  },

  info: {
    marginTop: 18,
    display: "grid",
    gap: 16,
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },

  h1: {
    fontSize: "clamp(26px, 5vw, 32px)",
    fontWeight: 900,
  },

  price: {
    fontSize: "clamp(22px, 4vw, 28px)",
    fontWeight: 900,
    color: "#f4d78b",
  },

  descriptionBox: {
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
  },

  sectionTitle: {
    fontSize: 13,
    color: "#f4d78b",
    marginBottom: 10,
  },

  desc: {
    lineHeight: 1.7,
  },

  h2: {
    fontSize: 22,
    color: "#f4d78b",
  },

  formSub: {
    marginBottom: 14,
  },

  inlineError: {
    marginBottom: 10,
    color: "red",
  },

  form: {
    display: "grid",
    gap: 10,
  },

  label: {
    fontSize: 12,
  },

  input: {
    padding: 12,
    borderRadius: 12,
    background: "#111",
    color: "white",
  },

  textarea: {
    padding: 12,
    borderRadius: 12,
    background: "#111",
    color: "white",
    minHeight: 120,
  },

  payBtn: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    background: "#f4d78b",
    color: "#111",
    fontWeight: 900,
  },

  box: {
    padding: 20,
  },

  errorBox: {
    padding: 20,
    color: "red",
  },
};