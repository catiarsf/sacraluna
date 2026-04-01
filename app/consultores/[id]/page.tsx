"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Consultor = {
  id: number;
  nome: string;
  email?: string;
  preco_por_min: number;
  preco_chat?: number;
  preco_voz?: number;
  foto_url: string | null;
  especialidades: string | null;
  apresentacao: string | null;
  ativo: number;
  destaque?: number;
  online?: number;
  ocupado?: number;
  voip_ativo?: number;
};

function normalizeFotoUrl(url: string | null) {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (!u.startsWith("/")) return `/${u}`;
  return u;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPrecoChat(c: any): number {
  const raw = c?.preco_chat ?? c?.preco_por_min ?? 0;
  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getPrecoVoz(c: any): number {
  const raw = c?.preco_voz ?? c?.preco_por_min ?? 0;
  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function ConsultorPerfilPage() {
  const params = useParams();
  const router = useRouter();

  const idStr = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const idNum = Number(idStr);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [consultor, setConsultor] = useState<Consultor | null>(null);

  const [creatingChat, setCreatingChat] = useState(false);
  const [waitingText, setWaitingText] = useState<string | null>(null);

  useEffect(() => {
    if (!idStr || !Number.isFinite(idNum) || idNum <= 0) {
      setLoading(false);
      setErr("ID inválido.");
      return;
    }

    setLoading(true);
    setErr(null);

    fetch(`/api/consultores/${idNum}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Erro (${res.status})`);
        return (data?.consultor ?? data) as Consultor;
      })
      .then((c) => setConsultor(c))
      .catch((e) => setErr(e?.message || "Erro ao carregar consultor"))
      .finally(() => setLoading(false));
  }, [idStr, idNum]);

  const foto = normalizeFotoUrl(consultor?.foto_url ?? null);

  const textoApresentacao = useMemo(() => {
    const t = consultor?.apresentacao ?? "";
    return (t || "").trim();
  }, [consultor]);

  const ativo = Number(consultor?.ativo ?? 0) === 1;
  const online = Number(consultor?.online ?? 0) === 1;
  const ocupado = Number(consultor?.ocupado ?? 0) === 1;
  const voipAtivo = Number(consultor?.voip_ativo ?? 1) === 1;

  const statusText = !ativo
    ? "Indisponível"
    : !online
      ? "Offline"
      : ocupado
        ? "Ocupado"
        : "Disponível";

  const statusColor = !ativo
    ? "#ff7b7b"
    : !online
      ? "#c7c7c7"
      : ocupado
        ? "#ffd36b"
        : "#88ffbc";

  async function iniciarPedidoChat() {
    if (!consultor) return;

    if (!ativo || !online || ocupado) {
      alert("Este consultor não está disponível neste momento.");
      return;
    }

    try {
      setCreatingChat(true);
      setWaitingText("A enviar pedido para a consultora...");

      const res = await fetch("/api/chat/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultor_id: consultor.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setWaitingText(null);
        alert(json?.error || "Não foi possível pedir o chat.");
        return;
      }

      const sessionId = String(json?.session_id ?? "");

      if (!sessionId) {
        setWaitingText(null);
        alert("Sessão inválida.");
        return;
      }

      if (json?.status === "active") {
        router.push(
          `/chat/${consultor.id}?session=${encodeURIComponent(sessionId)}&role=cliente`
        );
        return;
      }

      setWaitingText("A aguardar resposta da consultora...");

      for (let i = 0; i < 40; i++) {
        await sleep(3000);

        const statusRes = await fetch(
          `/api/chat/session-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );

        const statusJson = await statusRes.json().catch(() => ({}));

        if (!statusRes.ok || !statusJson?.ok) {
          continue;
        }

        const status = String(statusJson?.session?.status ?? "");

        if (status === "active") {
          setWaitingText(null);
          router.push(
            `/chat/${consultor.id}?session=${encodeURIComponent(sessionId)}&role=cliente`
          );
          return;
        }

        if (status === "rejected") {
          setWaitingText(null);
          alert("A consultora rejeitou o pedido.");
          return;
        }

        if (status === "ended") {
          setWaitingText(null);
          alert("A sessão terminou antes de começar.");
          return;
        }
      }

      setWaitingText(null);
      alert("A consultora não respondeu a tempo.");
    } catch {
      setWaitingText(null);
      alert("Erro ao iniciar pedido de chat.");
    } finally {
      setCreatingChat(false);
    }
  }

  async function iniciarChamadaVoz() {
    if (!consultor) return;

    if (!voipAtivo) {
      alert("As chamadas por voz estão desligadas para este consultor.");
      return;
    }

    if (!ativo || !online || ocupado) {
      alert("Este consultor não está disponível neste momento.");
      return;
    }

    try {
      const res = await fetch("/api/twilio/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultorId: consultor.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        alert(data?.error || "Não foi possível iniciar a chamada.");
        return;
      }

      alert("A chamada está a ser iniciada. A consultora será contactada primeiro.");
    } catch {
      alert("Erro ao iniciar chamada.");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <button style={styles.backBtn} onClick={() => router.push("/")}>
          ← Voltar
        </button>

        {loading && <div style={{ opacity: 0.8 }}>A carregar…</div>}

        {!loading && err && (
          <div style={styles.errBox}>
            <div style={styles.errTitle}>Consultor inválido</div>
            <div style={styles.errText}>{err}</div>
          </div>
        )}

        {!loading && !err && consultor && (
          <div style={styles.card}>
            {Number(consultor.destaque ?? 0) === 1 ? (
              <div style={styles.featureBadge}>★ Consultora em destaque</div>
            ) : null}

            <div style={styles.left}>
              <div style={styles.imageFrame}>
                <div style={styles.imageBox}>
                  {foto ? (
                    <img src={foto} alt={consultor.nome} style={styles.image} />
                  ) : (
                    <div style={styles.placeholder}>🌙 Sem foto</div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.right}>
              <div style={styles.topHeader}>
                <h2 style={styles.name}>{consultor.nome}</h2>

                <div style={{ ...styles.status, color: statusColor }}>
                  {statusText}
                </div>
              </div>

              <div style={styles.pricesWrap}>
                <div style={styles.priceCard}>
                  <div style={styles.priceLabel}>CHAT</div>
                  <div style={styles.priceRow}>
                    <span style={styles.priceValue}>
                      {getPrecoChat(consultor).toFixed(2)}€
                    </span>
                    <span style={styles.priceUnit}>/min</span>
                  </div>
                </div>

                <div
                  style={{
                    ...styles.priceCard,
                    ...(voipAtivo ? null : styles.priceCardDisabled),
                  }}
                >
                  <div
                    style={{
                      ...styles.priceLabel,
                      ...(voipAtivo ? null : styles.priceLabelDisabled),
                    }}
                  >
                    VOZ
                  </div>

                  {voipAtivo ? (
                    <div style={styles.priceRow}>
                      <span style={styles.priceValue}>
                        {getPrecoVoz(consultor).toFixed(2)}€
                      </span>
                      <span style={styles.priceUnit}>/min</span>
                    </div>
                  ) : (
                    <div style={styles.voipOffText}>Indisponível</div>
                  )}
                </div>
              </div>

              {consultor.especialidades ? (
                <div style={styles.spec}>{consultor.especialidades}</div>
              ) : null}

              {waitingText ? (
                <div style={styles.waitingBox}>{waitingText}</div>
              ) : null}

              <div style={styles.btns}>
                <button
                  style={styles.btnGold}
                  onClick={iniciarPedidoChat}
                  disabled={creatingChat}
                >
                  {creatingChat ? "AGUARDA..." : "Iniciar Chat"}
                </button>

                <button
                  style={voipAtivo ? styles.btnBlue : styles.btnBlueDisabled}
                  onClick={iniciarChamadaVoz}
                  disabled={!voipAtivo}
                >
                  Chamada de Voz
                </button>
              </div>

              <div style={styles.sep} />

              <h3 style={styles.h3}>Apresentação</h3>
              <p style={styles.p}>
                {textoApresentacao
                  ? textoApresentacao
                  : "(Ainda sem apresentação.)"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px 18px 64px",
    color: "#fff",
    backgroundImage: "url('/fundo.jpg')",
    backgroundSize: "auto",
    backgroundPosition: "top center",
    backgroundRepeat: "repeat",
  },

  wrap: {
    maxWidth: 1180,
    margin: "0 auto",
  },

  backBtn: {
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(0,0,0,0.24)",
    color: "#f4d78b",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
    marginBottom: 18,
    boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
  },

  errBox: {
    border: "1px solid rgba(255,180,180,0.5)",
    background: "rgba(0,0,0,0.30)",
    borderRadius: 16,
    padding: 18,
  },

  errTitle: {
    fontWeight: 900,
    fontSize: 18,
    marginBottom: 6,
  },

  errText: {
    opacity: 0.9,
  },

  card: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 20,
    borderRadius: 24,
    overflow: "hidden",
    border: "1px solid rgba(212,175,55,0.34)",
    background:
      "linear-gradient(180deg, rgba(12,18,32,0.96) 0%, rgba(18,26,45,0.94) 100%)",
    boxShadow:
      "0 18px 45px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.04)",
    backdropFilter: "blur(10px)",
  },

  featureBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 4,
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.7,
    color: "#111",
    background:
      "linear-gradient(180deg, rgba(255,223,130,1) 0%, rgba(212,175,55,1) 100%)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.24)",
  },

  left: {
    padding: 18,
  },

  right: {
    padding: "22px 22px 22px 0",
  },

  imageFrame: {
    padding: 0,
  },

  imageBox: {
    position: "relative",
    width: "100%",
    aspectRatio: "4 / 5",
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(180deg, rgba(20,26,42,0.96) 0%, rgba(10,14,24,1) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  placeholder: {
    height: "100%",
    width: "100%",
    display: "grid",
    placeItems: "center",
    opacity: 0.85,
    zIndex: 2,
  },

  topHeader: {
    marginTop: 8,
  },

  name: {
    margin: 0,
    fontSize: 40,
    lineHeight: 1.05,
    fontWeight: 950,
    color: "#fffaf0",
    textShadow: "0 3px 10px rgba(0,0,0,0.35)",
  },

  status: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 0.3,
  },

  pricesWrap: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    maxWidth: 420,
  },

  priceCard: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: "12px 14px",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },

  priceCardDisabled: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    opacity: 0.72,
  },

  priceLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
    color: "#f4d78b",
    opacity: 0.95,
    marginBottom: 6,
  },

  priceLabelDisabled: {
    color: "#c7c7c7",
  },

  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },

  priceValue: {
    fontSize: 32,
    fontWeight: 950,
    color: "#fff3c2",
    lineHeight: 1,
  },

  priceUnit: {
    fontSize: 13,
    opacity: 0.82,
    fontWeight: 700,
  },

  voipOffText: {
    fontSize: 13,
    fontWeight: 800,
    color: "#c7c7c7",
    marginTop: 8,
  },

  spec: {
    marginTop: 16,
    fontSize: 19,
    lineHeight: 1.45,
    fontWeight: 700,
    color: "rgba(255,255,255,0.95)",
  },

  waitingBox: {
    marginTop: 16,
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(26,63,130,0.35)",
    border: "1px solid rgba(140,180,255,0.25)",
    color: "#dce8ff",
    fontSize: 13,
    fontWeight: 700,
  },

  btns: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  btnGold: {
    padding: "14px 14px",
    borderRadius: 16,
    border: "1px solid rgba(212,175,55,0.98)",
    background:
      "linear-gradient(180deg, rgba(255,227,148,1) 0%, rgba(212,175,55,0.98) 100%)",
    color: "#111",
    fontWeight: 950,
    fontSize: 14,
    letterSpacing: 0.4,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
  },

  btnBlue: {
    padding: "14px 14px",
    borderRadius: 16,
    border: "1px solid rgba(95,170,255,0.62)",
    background:
      "linear-gradient(180deg, rgba(44,99,184,0.95) 0%, rgba(28,63,130,0.92) 100%)",
    color: "#eef6ff",
    fontWeight: 950,
    fontSize: 14,
    letterSpacing: 0.4,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
  },

  btnBlueDisabled: {
    padding: "14px 14px",
    borderRadius: 16,
    border: "1px solid rgba(170,170,170,0.18)",
    background: "rgba(90,90,90,0.20)",
    color: "#c7c7c7",
    fontWeight: 950,
    fontSize: 14,
    letterSpacing: 0.4,
    cursor: "not-allowed",
    opacity: 0.78,
  },

  sep: {
    margin: "22px 0 18px",
    height: 1,
    background:
      "linear-gradient(90deg, rgba(212,175,55,0.22), rgba(255,255,255,0.04))",
  },

  h3: {
    margin: 0,
    fontSize: 21,
    fontWeight: 900,
    color: "#f4d78b",
  },

  p: {
    marginTop: 12,
    lineHeight: 1.72,
    opacity: 0.96,
    whiteSpace: "pre-wrap",
    fontSize: 17,
    color: "rgba(255,255,255,0.92)",
  },
};