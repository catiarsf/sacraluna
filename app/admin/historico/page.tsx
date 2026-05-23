"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ChatMessage = {
  sender_role: "cliente" | "consultor";
  text: string;
  sent_at: number;
};

type ChatSession = {
  id: string;
  cliente_nome: string;
  consultor_nome: string;
  created_at: number;
  started_at: number;
  ended_at: number;
  billed_seconds: number;
  total_charged_eur: number;
  consultor_earned_eur: number;
  status: string;
  messages: ChatMessage[];
};

type PerguntaItem = {
  id: number;
  pergunta: string;
  resposta: string;
  created_at: number;
  responded_at: number;
};

type PedidoPergunta = {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  consultor_nome: string;
  pacote: number;
  preco_eur: number;
  status: string;
  created_at: number;
  respondido_at: number;
  itens: PerguntaItem[];
};

type VoiceCall = {
  id: string;
  cliente_nome: string;
  consultor_nome: string;
  status: string;
  call_sid: string;
  price_per_min: number;
  price_per_second: number;
  duration_seconds: number;
  total_charged_eur: number;
  consultor_earned_eur: number;
  billed: number;
  recording_url: string;
  created_at: number;
  started_at: number;
  ended_at: number;
};

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("pt-PT");
}

function formatDuration(totalSeconds?: number) {
  const s = Number(totalSeconds ?? 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function AdminHistoricoPage() {
  const [tab, setTab] = useState<"chat" | "perguntas" | "voz">("chat");
  const [erro, setErro] = useState("");

  const [chatLoading, setChatLoading] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatOpenId, setChatOpenId] = useState("");

  const [perguntasLoading, setPerguntasLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoPergunta[]>([]);
  const [pedidoOpenId, setPedidoOpenId] = useState("");

  const [vozLoading, setVozLoading] = useState(true);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [callOpenId, setCallOpenId] = useState("");

  async function carregarChats() {
    try {
      setChatLoading(true);
      setErro("");

      const res = await fetch("/api/admin/history/chat", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar histórico de chats.");
      }

      setChatSessions(Array.isArray(json?.sessions) ? json.sessions : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar histórico de chats.");
    } finally {
      setChatLoading(false);
    }
  }

  async function carregarPerguntas() {
    try {
      setPerguntasLoading(true);
      setErro("");

      const res = await fetch("/api/admin/history/perguntas", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar histórico de perguntas.");
      }

      setPedidos(Array.isArray(json?.pedidos) ? json.pedidos : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar histórico de perguntas.");
    } finally {
      setPerguntasLoading(false);
    }
  }

  async function carregarChamadas() {
    try {
      setVozLoading(true);
      setErro("");

      const res = await fetch("/api/admin/chamadas", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar histórico de voz.");
      }

      setCalls(Array.isArray(json?.calls) ? json.calls : []);
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar histórico de voz.");
    } finally {
      setVozLoading(false);
    }
  }

  useEffect(() => {
    carregarChats();
    carregarPerguntas();
    carregarChamadas();
  }, []);
 return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Histórico da Administração</h1>
      </div>

      <div style={styles.quickRow}>
        <Link href="/admin" style={styles.quickCard}>
          <div style={styles.quickTitle}>Consultores</div>
          <div style={styles.quickText}>
            Voltar à gestão principal
          </div>
        </Link>

        <div
          style={tab === "chat"
            ? styles.quickCardActive
            : styles.quickCard}
          onClick={() => setTab("chat")}
        >
          <div style={styles.quickTitle}>
            Chats
          </div>

          <div style={styles.quickText}>
            Consultas por chat e respetivo texto
          </div>
        </div>

        <div
          style={tab === "voz"
            ? styles.quickCardActive
            : styles.quickCard}
          onClick={() => setTab("voz")}
        >
          <div style={styles.quickTitle}>
            VOIP / Chamadas
          </div>

          <div style={styles.quickText}>
            Histórico de chamadas e gravações
          </div>
        </div>

        <div
          style={tab === "perguntas"
            ? styles.quickCardActive
            : styles.quickCard}
          onClick={() => setTab("perguntas")}
        >
          <div style={styles.quickTitle}>
            Emails / Perguntas
          </div>

          <div style={styles.quickText}>
            Pedidos, perguntas e respostas
          </div>
        </div>
      </div>

      {erro ? (
        <div style={styles.err}>
          {erro}
        </div>
      ) : null}

      {tab === "voz" && (
        <div style={styles.card}>
          <div style={styles.topRow}>
            <h2 style={styles.h2}>
              Histórico VOIP
            </h2>

            <button
              style={styles.btn}
              onClick={carregarChamadas}
              disabled={vozLoading}
            >
              {vozLoading
                ? "A carregar..."
                : "Atualizar"}
            </button>
          </div>

          {vozLoading ? (
            <div style={styles.small}>
              A carregar chamadas...
            </div>
          ) : calls.length === 0 ? (
            <div style={styles.small}>
              Sem chamadas para mostrar.
            </div>
          ) : (
            <div style={styles.list}>
              {calls.map((call) => {
                const aberto =
                  callOpenId === call.id;

                return (
                  <div
                    key={call.id}
                    style={styles.itemBlock}
                  >
                    <div style={styles.itemTop}>
                      <div>
                        <div style={styles.itemName}>
                          Chamada {call.id}
                        </div>

                        <div style={styles.small}>
                          <b>Cliente:</b>{" "}
                          {call.cliente_nome ||
                            "-"}
                        </div>

                        <div style={styles.small}>
                          <b>Consultor:</b>{" "}
                          {call.consultor_nome ||
                            "-"}
                        </div>

                        <div style={styles.small}>
                          <b>Status:</b>{" "}
                          {call.status ||
                            "-"}
                        </div>

                        <div style={styles.small}>
                          <b>Início:</b>{" "}
                          {formatDateTime(
                            call.started_at ||
                              call.created_at
                          )}
                        </div>

                        <div style={styles.small}>
                          <b>Fim:</b>{" "}
                          {formatDateTime(
                            call.ended_at
                          )}
                        </div>

                        <div style={styles.small}>
                          <b>Duração:</b>{" "}
                          {formatDuration(
                            call.duration_seconds
                          )}
                        </div>

                        <div style={styles.small}>
                          <b>Preço/min:</b>{" "}
                          {Number(
                            call.price_per_min ??
                              0
                          ).toFixed(2)}
                          €/min
                        </div>

                        <div style={styles.small}>
                          <b>Preço/seg:</b>{" "}
                          {Number(
                            call.price_per_second ??
                              0
                          ).toFixed(4)}
                          €/seg
                        </div>

                        <div style={styles.small}>
                          <b>Total cobrado:</b>{" "}
                          {Number(
                            call.total_charged_eur ??
                              0
                          ).toFixed(4)}
                          €
                        </div>

                        <div style={styles.small}>
                          <b>Ganho consultor:</b>{" "}
                          {Number(
                            call.consultor_earned_eur ??
                              0
                          ).toFixed(4)}
                          €
                        </div>
                      </div>

                      <button
                        style={styles.btnSmall}
                        onClick={() =>
                          setCallOpenId(
                            aberto
                              ? ""
                              : call.id
                          )
                        }
                      >
                        {aberto
                          ? "Fechar"
                          : "Ver detalhes"}
                      </button>
                    </div>

                    {aberto && (
                      <div style={styles.transcript}>
                        <div style={styles.small}>
                          <b>Call SID:</b>{" "}
                          {call.call_sid ||
                            "-"}
                        </div>

                        <div style={styles.small}>
                          <b>Faturada:</b>{" "}
                          {Number(
                            call.billed ?? 0
                          ) === 1
                            ? "Sim"
                            : "Não"}
                        </div>

                        {call.recording_url ? (
                          <div
                            style={{
                              marginTop: 12,
                            }}
                          >
                            <div
                              style={
                                styles.small
                              }
                            >
                              <b>
                                Gravação:
                              </b>
                            </div>

                            <audio
                              controls
                              style={{
                                width: "100%",
                                marginTop: 8,
                              }}
                            >
                              <source
                                src={
                                  call.recording_url
                                }
                              />
                            </audio>
                          </div>
                        ) : (
                          <div
                            style={{
                              ...styles.small,
                              marginTop: 12,
                            }}
                          >
                            <b>
                              Gravação:
                            </b>{" "}
                            ainda não disponível
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
{tab === "chat" && (
        <div style={styles.card}>
          <div style={styles.topRow}>
            <h2 style={styles.h2}>Histórico de chats</h2>
            <button style={styles.btn} onClick={carregarChats} disabled={chatLoading}>
              {chatLoading ? "A carregar..." : "Atualizar"}
            </button>
          </div>

          {chatLoading ? (
            <div style={styles.small}>A carregar chats...</div>
          ) : chatSessions.length === 0 ? (
            <div style={styles.small}>Sem consultas de chat para mostrar.</div>
          ) : (
            <div style={styles.list}>
              {chatSessions.map((item) => {
                const aberto = chatOpenId === item.id;

                return (
                  <div key={item.id} style={styles.itemBlock}>
                    <div style={styles.itemTop}>
                      <div>
                        <div style={styles.itemName}>Sessão {item.id}</div>
                        <div style={styles.small}><b>Cliente:</b> {item.cliente_nome || "-"}</div>
                        <div style={styles.small}><b>Consultor:</b> {item.consultor_nome || "-"}</div>
                        <div style={styles.small}><b>Início:</b> {formatDateTime(item.started_at || item.created_at)}</div>
                        <div style={styles.small}><b>Duração:</b> {formatDuration(item.billed_seconds)}</div>
                        <div style={styles.small}><b>Status:</b> {item.status}</div>
                        <div style={styles.small}><b>Total:</b> {Number(item.total_charged_eur ?? 0).toFixed(4)}€</div>
                      </div>

                      <button
                        style={styles.btnSmall}
                        onClick={() => setChatOpenId(aberto ? "" : item.id)}
                      >
                        {aberto ? "Fechar" : "Ver conversa"}
                      </button>
                    </div>

                    {aberto && (
                      <div style={styles.transcript}>
                        {item.messages?.length ? (
                          item.messages.map((m, idx) => (
                            <div key={idx} style={styles.message}>
                              <div style={styles.messageRole}>
                                {m.sender_role === "consultor" ? "Consultor" : "Cliente"} — {formatDateTime(m.sent_at)}
                              </div>
                              <div>{m.text}</div>
                            </div>
                          ))
                        ) : (
                          <div style={styles.small}>Não há mensagens guardadas nesta sessão.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "perguntas" && (
        <div style={styles.card}>
          <div style={styles.topRow}>
            <h2 style={styles.h2}>Histórico de emails / perguntas</h2>
            <button style={styles.btn} onClick={carregarPerguntas} disabled={perguntasLoading}>
              {perguntasLoading ? "A carregar..." : "Atualizar"}
            </button>
          </div>

          {perguntasLoading ? (
            <div style={styles.small}>A carregar pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div style={styles.small}>Sem pedidos de perguntas para mostrar.</div>
          ) : (
            <div style={styles.list}>
              {pedidos.map((item) => {
                const aberto = pedidoOpenId === item.id;

                return (
                  <div key={item.id} style={styles.itemBlock}>
                    <div style={styles.itemTop}>
                      <div>
                        <div style={styles.itemName}>Pedido {item.id}</div>
                        <div style={styles.small}><b>Cliente:</b> {item.cliente_nome || "-"} ({item.cliente_email || "-"})</div>
                        <div style={styles.small}><b>Consultor:</b> {item.consultor_nome || "-"}</div>
                        <div style={styles.small}><b>Pacote:</b> {item.pacote}</div>
                        <div style={styles.small}><b>Preço:</b> {Number(item.preco_eur ?? 0).toFixed(2)}€</div>
                        <div style={styles.small}><b>Criado em:</b> {formatDateTime(item.created_at)}</div>
                        <div style={styles.small}><b>Status:</b> {item.status}</div>
                      </div>

                      <button
                        style={styles.btnSmall}
                        onClick={() => setPedidoOpenId(aberto ? "" : item.id)}
                      >
                        {aberto ? "Fechar" : "Ver conteúdo"}
                      </button>
                    </div>

                    {aberto && (
                      <div style={styles.transcript}>
                        {item.itens?.length ? (
                          item.itens.map((it) => (
                            <div key={it.id} style={styles.message}>
                              <div style={styles.messageRole}>
                                Pergunta enviada em {formatDateTime(it.created_at)}
                              </div>
                              <div><b>Pergunta:</b> {it.pergunta || "-"}</div>
                              <div style={{ marginTop: 8 }}>
                                <b>Resposta:</b> {it.resposta || "Ainda sem resposta"}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={styles.small}>Sem itens neste pedido.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  h1: { fontSize: 28, margin: 0 },
  h2: { margin: "0 0 12px", fontSize: 18 },
  quickRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16, marginBottom: 16 },
  quickCard: { display: "block", textDecoration: "none", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", borderRadius: 14, padding: 16, color: "white", cursor: "pointer" },
  quickCardActive: { display: "block", textDecoration: "none", border: "1px solid rgba(212,175,55,0.45)", background: "rgba(212,175,55,0.10)", borderRadius: 14, padding: 16, color: "#f4d78b", cursor: "pointer" },
  quickTitle: { fontSize: 18, fontWeight: 900, marginBottom: 6 },
  quickText: { fontSize: 13, opacity: 0.82, lineHeight: 1.5 },
  card: { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", borderRadius: 14, padding: 14 },
  topRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  btn: { padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(212,175,55,0.55)", background: "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)", color: "#111", fontWeight: 900, cursor: "pointer" },
  btnSmall: { padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.25)", color: "white", fontWeight: 800, cursor: "pointer" },
  err: { marginBottom: 12, padding: 12, borderRadius: 12, background: "rgba(255,0,0,0.10)", border: "1px solid rgba(255,0,0,0.25)", whiteSpace: "pre-wrap" },
  list: { display: "grid", gap: 12 },
  itemBlock: { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 14 },
  itemTop: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  itemName: { fontWeight: 900, fontSize: 17, marginBottom: 6, color: "#f4d78b" },
  small: { fontSize: 12, opacity: 0.8, marginTop: 4, wordBreak: "break-word" },
  transcript: { marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", display: "grid", gap: 10 },
  message: { padding: 12, borderRadius: 12, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.08)", lineHeight: 1.5 },
  messageRole: { fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 6 },
}; 