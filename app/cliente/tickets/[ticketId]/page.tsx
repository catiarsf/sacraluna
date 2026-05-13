"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Ticket = {
  id: string;
  servico_nome: string;
  servico_descricao?: string;
  consultor_nome?: string;
  estado: string;
  prioridade?: string;
  preco_eur: number;
  observacoes_cliente?: string;
  created_at: number;
  updated_at: number;
  entregue_at?: number | null;
};

type Mensagem = {
  id: number;
  autor_tipo: string;
  mensagem: string;
  created_at: number;
};

type Anexo = {
  id: number;
  nome_ficheiro: string;
  caminho_ficheiro: string;
  tipo_ficheiro?: string;
  tamanho?: number;
  created_at: number;
};

function formatDate(ts?: number | null) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

function estadoLabel(estado: string) {
  switch (estado) {
    case "pago":
      return "Pedido recebido";

    case "em_analise":
      return "Em análise";

    case "em_execucao":
      return "Em execução";

    case "entregue":
      return "Entregue";

    case "concluido":
      return "Concluído";

    case "cancelado":
      return "Cancelado";

    case "reaberto":
      return "Reaberto";

    default:
      return estado || "-";
  }
}

export default function ClienteTicketDetalhePage() {
  const params = useParams();
  const router = useRouter();

  const ticketId = useMemo(() => {
    const raw = (params as any)?.ticketId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);

  const [anexos, setAnexos] = useState<Anexo[]>([]);

  const [novaMensagem, setNovaMensagem] = useState("");

  const [sending, setSending] = useState(false);

  async function carregar() {
    try {
      setErro("");

      const res = await fetch(
        `/api/cliente/tickets/${ticketId}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Erro ao carregar pedido."
        );
      }

      setTicket(json.ticket || null);

      setMensagens(
        Array.isArray(json.mensagens)
          ? json.mensagens
          : []
      );

      setAnexos(
        Array.isArray(json.anexos)
          ? json.anexos
          : []
      );
    } catch (e: any) {
      setErro(
        e?.message || "Erro ao carregar pedido."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ticketId) return;

    carregar();

    const t = setInterval(() => {
      carregar();
    }, 10000);

    return () => clearInterval(t);
  }, [ticketId]);

  async function enviarMensagem() {
    try {
      if (!novaMensagem.trim()) return;

      setSending(true);

      const res = await fetch(
        `/api/cliente/tickets/${ticketId}/mensagens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mensagem: novaMensagem,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Erro ao enviar mensagem."
        );
      }

      setNovaMensagem("");

      await carregar();
    } catch (e: any) {
      alert(
        e?.message || "Erro ao enviar mensagem."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          A carregar pedido...
        </div>
      </main>
    );
  }

  if (erro || !ticket) {
    return (
      <main style={styles.page}>
        <div style={styles.err}>
          {erro || "Pedido não encontrado."}
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <button
        style={styles.backBtn}
        onClick={() =>
          router.push("/cliente/tickets")
        }
      >
        ← Voltar aos meus serviços
      </button>

      <div style={styles.top}>
        <div>
          <div style={styles.badge}>
            {estadoLabel(ticket.estado)}
          </div>

          <h1 style={styles.h1}>
            {ticket.servico_nome}
          </h1>

          <div style={styles.meta}>
            Consultora:{" "}
            <b>
              {ticket.consultor_nome ||
                "SacraLuna"}
            </b>
          </div>

          <div style={styles.meta}>
            Comprado em:{" "}
            {formatDate(ticket.created_at)}
          </div>

          <div style={styles.meta}>
            Atualizado em:{" "}
            {formatDate(ticket.updated_at)}
          </div>

          {ticket.entregue_at ? (
            <div style={styles.meta}>
              Entregue em:{" "}
              {formatDate(ticket.entregue_at)}
            </div>
          ) : null}
        </div>

        <div style={styles.side}>
          <div style={styles.price}>
            {Number(
              ticket.preco_eur ?? 0
            ).toFixed(2)}
            €
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.h2}>
            Detalhes do serviço
          </h2>

          <div style={styles.infoBox}>
            <b>Descrição</b>

            <div style={styles.preWrap}>
              {ticket.servico_descricao ||
                "Sem descrição disponível."}
            </div>
          </div>

          <div style={styles.infoBox}>
            <b>As tuas observações</b>

            <div style={styles.preWrap}>
              {ticket.observacoes_cliente ||
                "Sem observações."}
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>
            Mensagens
          </h2>

          <div style={styles.messages}>
            {mensagens.length === 0 ? (
              <div style={styles.empty}>
                Ainda não existem mensagens.
              </div>
            ) : (
              mensagens.map((m) => (
                <div
                  key={m.id}
                  style={styles.message}
                >
                  <div style={styles.messageTop}>
                    <b>
                      {m.autor_tipo ===
                      "cliente"
                        ? "Tu"
                        : m.autor_tipo ===
                          "consultor"
                        ? "Consultora"
                        : "Sistema"}
                    </b>

                    <span>
                      {formatDate(
                        m.created_at
                      )}
                    </span>
                  </div>

                  <div style={styles.preWrap}>
                    {m.mensagem}
                  </div>
                </div>
              ))
            )}
          </div>

          <textarea
            style={styles.textarea}
            value={novaMensagem}
            onChange={(e) =>
              setNovaMensagem(
                e.target.value
              )
            }
            placeholder="Escreve uma mensagem sobre este serviço..."
          />

          <button
            style={styles.sendBtn}
            onClick={enviarMensagem}
            disabled={sending}
          >
            {sending
              ? "A enviar..."
              : "Enviar mensagem"}
          </button>
        </section>
      </div>

      <section style={styles.card}>
        <h2 style={styles.h2}>
          Entrega / ficheiros
        </h2>

        {anexos.length === 0 ? (
          <div style={styles.empty}>
            Ainda não existe ficheiro
            entregue. Quando estiver
            pronto, aparecerá aqui.
          </div>
        ) : (
          <div style={styles.attachments}>
            {anexos.map((a) => (
              <div
                key={a.id}
                style={styles.attachment}
              >
                <div>
                  <div
                    style={
                      styles.attachmentName
                    }
                  >
                    {a.nome_ficheiro}
                  </div>

                  <div
                    style={
                      styles.attachmentDate
                    }
                  >
                    {formatDate(
                      a.created_at
                    )}
                  </div>
                </div>

                <a
                  href={a.caminho_ficheiro}
                  target="_blank"
                  style={styles.downloadBtn}
                >
                  Descarregar
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    color: "#fff",
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },

  backBtn: {
    marginBottom: 18,
    padding: "11px 14px",
    borderRadius: 12,
    border:
      "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  top: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20,
  },

  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background:
      "rgba(212,175,55,0.12)",
    border:
      "1px solid rgba(212,175,55,0.32)",
    color: "#f4d78b",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 12,
  },

  h1: {
    margin: 0,
    fontSize: 34,
    fontWeight: 950,
    color: "#f4d78b",
  },

  h2: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 24,
    fontWeight: 900,
  },

  meta: {
    marginTop: 8,
    opacity: 0.9,
  },

  side: {
    display: "grid",
    alignContent: "start",
  },

  price: {
    fontSize: 34,
    fontWeight: 950,
    color: "#f4d78b",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(320px,1fr))",
    gap: 20,
    marginBottom: 20,
  },

  card: {
    padding: 18,
    borderRadius: 18,
    background:
      "rgba(0,0,0,0.25)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    marginBottom: 20,
  },

  infoBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    background:
      "rgba(255,255,255,0.04)",
    border:
      "1px solid rgba(255,255,255,0.08)",
  },

  preWrap: {
    marginTop: 8,
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },

  messages: {
    display: "grid",
    gap: 12,
    marginBottom: 16,
  },

  message: {
    padding: 14,
    borderRadius: 14,
    background:
      "rgba(255,255,255,0.04)",
    border:
      "1px solid rgba(255,255,255,0.08)",
  },

  messageTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    fontSize: 13,
    opacity: 0.82,
  },

  textarea: {
    width: "100%",
    minHeight: 120,
    borderRadius: 14,
    padding: 14,
    resize: "vertical",
    border:
      "1px solid rgba(255,255,255,0.12)",
    background:
      "rgba(0,0,0,0.25)",
    color: "#fff",
    outline: "none",
  },

  sendBtn: {
    marginTop: 12,
    padding: "12px 16px",
    borderRadius: 12,
    border:
      "1px solid rgba(212,175,55,0.55)",
    background: "#f4d78b",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },

  attachments: {
    display: "grid",
    gap: 12,
  },

  attachment: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    background:
      "rgba(255,255,255,0.04)",
    border:
      "1px solid rgba(255,255,255,0.08)",
  },

  attachmentName: {
    fontWeight: 800,
  },

  attachmentDate: {
    marginTop: 4,
    opacity: 0.7,
    fontSize: 13,
  },

  downloadBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    textDecoration: "none",
    border:
      "1px solid rgba(212,175,55,0.55)",
    background:
      "rgba(212,175,55,0.14)",
    color: "#f4d78b",
    fontWeight: 900,
  },

  empty: {
    opacity: 0.75,
  },

  err: {
    padding: 18,
    borderRadius: 16,
    background:
      "rgba(255,0,0,0.12)",
    border:
      "1px solid rgba(255,0,0,0.25)",
    color: "#ffb4b4",
  },
};