"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Hero from "@/components/Hero";
import Testemunhos from "@/components/Testemunhos";

type Consultor = {
  id: number;
  nome: string;
  foto_url: string | null;
  especialidades: string | null;
  apresentacao: string | null;
  apresentacao_curta: string | null;
  apresentacao_longa: string | null;
  valor_min_eur: number;
  preco_chat?: number;
  preco_voz?: number;
  ativo: number;
  destaque?: number;
  online?: number;
  ocupado?: number;
};

function normalizeFotoUrl(url: string | null) {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (!u.startsWith("/")) return `/${u}`;
  return u;
}

function getValorMinEur(c: any): number {
  const raw =
    c?.valor_min_eur ??
    c?.valor_min ??
    c?.valor_por_minuto ??
    c?.valor_minuto_eur;

  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getPrecoChat(c: any): number {
  const raw =
    c?.preco_chat ??
    c?.valor_chat_eur ??
    c?.chat_preco_eur ??
    getValorMinEur(c);

  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getPrecoVoz(c: any): number {
  const raw =
    c?.preco_voz ??
    c?.valor_voz_eur ??
    c?.voz_preco_eur ??
    getValorMinEur(c);

  const n = Number.parseFloat(String(raw ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getStatusRank(c: Consultor) {
  if (
    Number(c.ativo ?? 0) === 1 &&
    Number(c.online ?? 0) === 1 &&
    Number(c.ocupado ?? 0) === 0
  ) {
    return 0;
  }

  if (
    Number(c.ativo ?? 0) === 1 &&
    Number(c.online ?? 0) === 1 &&
    Number(c.ocupado ?? 0) === 1
  ) {
    return 1;
  }

  if (Number(c.ativo ?? 0) === 1 && Number(c.online ?? 0) === 0) {
    return 2;
  }

  return 3;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function HomePage() {
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    fetch("/api/consultores")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Erro (${res.status})`);

        const list = Array.isArray(data) ? data : data?.consultores;
        if (!Array.isArray(list)) throw new Error("Resposta inválida");
        return list as Consultor[];
      })
      .then((list) => setConsultores(list))
      .catch((e) => setErr(e?.message || "Erro ao carregar consultores"))
      .finally(() => setLoading(false));
  }, []);

  const { featured, others } = useMemo(() => {
    const sorted = [...consultores].sort((a, b) => {
      const rankDiff = getStatusRank(a) - getStatusRank(b);
      if (rankDiff !== 0) return rankDiff;

      return (a.nome || "").localeCompare(b.nome || "", "pt", {
        sensitivity: "base",
      });
    });

    const featuredList = sorted.filter((c) => Number(c.destaque ?? 0) === 1);
    const featuredIds = new Set(featuredList.map((c) => c.id));
    const rest = sorted.filter((c) => !featuredIds.has(c.id));

    return {
      featured: featuredList,
      others: rest,
    };
  }, [consultores]);

  return (
    <div style={styles.page}>
      <Hero />

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Consultores disponíveis</h2>

        {loading && (
          <div style={{ opacity: 0.75, marginTop: 10 }}>A carregar…</div>
        )}

        {err && <div style={styles.err}>Erro: {err}</div>}

        {!loading && !err && featured.length > 0 && (
          <div style={styles.featureWrap}>
            <div style={styles.featureGrid}>
              {featured.map((c) => (
                <div key={c.id} style={styles.featureSlot}>
                  <ConsultorCard c={c} variant="featured" />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.grid}>
          {others.map((c) => (
            <ConsultorCard key={c.id} c={c} variant="grid" />
          ))}
        </div>

        {!loading && !err && consultores.length === 0 && (
          <div style={{ opacity: 0.7, marginTop: 10 }}>
            Ainda não há consultores disponíveis.
          </div>
        )}

        {!loading && !err && consultores.length > 0 && others.length === 0 && (
          <div style={{ opacity: 0.7, marginTop: 10 }}>
            Todos os consultores atuais estão em destaque.
          </div>
        )}
      </section>

      <section style={styles.testemunhosSection}>
        <Testemunhos />
      </section>
    </div>
  );
}
function ConsultorCard({
  c,
  variant,
}: {
  c: Consultor;
  variant: "featured" | "grid";
}) {
  const router = useRouter();
  const foto = normalizeFotoUrl(c.foto_url);

  const isFeatured = variant === "featured";
  const S = isFeatured ? featuredCard : gridCard;

  const hrefPerfil = `/consultores/${c.id}`;

  const ativo = Number(c.ativo ?? 0) === 1;
  const online = Number(c.online ?? 0) === 1;
  const ocupado = Number(c.ocupado ?? 0) === 1;

  const [creatingChat, setCreatingChat] = useState(false);
  const [waitingText, setWaitingText] = useState<string | null>(null);

  const statusText = !ativo
    ? "Indisponível"
    : !online
    ? "Offline"
    : ocupado
    ? "Ocupado"
    : "Disponível";

  const statusColor = !ativo
    ? "#ff6b6b"
    : !online
    ? "#c7c7c7"
    : ocupado
    ? "#ffd36b"
    : "#7dffb1";

  async function iniciarChamada(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

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
          consultorId: c.id,
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

  async function iniciarPedidoChat(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

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
          consultor_id: c.id,
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
          `/chat/${c.id}?session=${encodeURIComponent(sessionId)}&role=cliente`
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
            `/chat/${c.id}?session=${encodeURIComponent(sessionId)}&role=cliente`
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

  return (
    <div
      style={S.card}
      role="button"
      tabIndex={0}
      onClick={() => router.push(hrefPerfil)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(hrefPerfil);
      }}
    >
      <div style={S.imageBox}>
        {foto ? (
          <img src={foto} alt={c.nome} style={S.image} />
        ) : (
          <div style={S.placeholder}>
            <div style={S.placeholderIcon}>🌙</div>
            <div style={S.placeholderText}>Sem foto</div>
          </div>
        )}
      </div>

      <div style={S.body}>
        <div style={S.name}>{c.nome}</div>

        <div style={{ ...S.status, color: statusColor }}>{statusText}</div>

        <div style={S.priceWrap}>
          <div style={S.priceBlock}>
            <div style={S.priceLabel}>CHAT</div>
            <div style={S.priceRow}>
              <span style={S.priceValue}>{getPrecoChat(c).toFixed(2)}€</span>
              <span style={S.priceUnit}>/min</span>
            </div>
          </div>

          <div style={S.priceBlock}>
            <div style={S.priceLabel}>VOZ</div>
            <div style={S.priceRow}>
              <span style={S.priceValue}>{getPrecoVoz(c).toFixed(2)}€</span>
              <span style={S.priceUnit}>/min</span>
            </div>
          </div>
        </div>

        <div style={S.specWrap}>
          {c.especialidades ? (
            <div style={S.spec}>{c.especialidades}</div>
          ) : (
            <div style={S.spec}> </div>
          )}
        </div>

        {waitingText && (
          <div style={S.waitingBox}>
            {waitingText}
          </div>
        )}

        <div style={S.btns}>
          <button
            type="button"
            style={S.btnGold}
            onClick={iniciarPedidoChat}
            disabled={creatingChat}
          >
            {creatingChat ? "AGUARDA..." : "CHAT"}
          </button>

          <button type="button" style={S.btnBlue} onClick={iniciarChamada}>
            VOZ
          </button>

          <button
            type="button"
            style={S.btnPurple}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/email/${c.id}`);
            }}
          >
            EMAIL
          </button>
        </div>
      </div>
    </div>
  );
}
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "18px 18px 60px",
    color: "#fff",
    backgroundImage: "url('/fundo.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },

  section: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "14px 6px",
  },

  testemunhosSection: {
    maxWidth: 1180,
    margin: "10px auto 0",
    padding: "10px 6px 20px",
  },

  sectionTitle: {
    margin: "6px 0 14px",
    textAlign: "center",
    fontSize: 34,
    fontWeight: 950,
    letterSpacing: 0.5,
    color: "#f7df99",
    textShadow:
      "0 0 14px rgba(212,175,55,0.35), 0 0 26px rgba(212,175,55,0.22), 0 8px 22px rgba(0,0,0,0.55)",
  },

  featureWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 24,
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 320px))",
    justifyContent: "center",
    gap: 18,
  },

  featureSlot: {
    width: 320,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 240px))",
    justifyContent: "center",
    gap: 18,
    alignItems: "start",
  },

  err: {
    color: "#ffb4b4",
    marginTop: 10,
  },
};

const featuredCard: Record<string, React.CSSProperties> = {
  card: {
    width: 320,
    minHeight: 490,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
  },

  imageBox: {
    position: "relative",
    height: 220,
    background: "rgba(0,0,0,0.25)",
    flexShrink: 0,
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  placeholder: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    opacity: 0.9,
  },

  placeholderIcon: {
    fontSize: 24,
  },

  placeholderText: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.85,
  },

  body: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },

  name: {
    fontSize: 20,
    fontWeight: 900,
    minHeight: 48,
    display: "flex",
    alignItems: "center",
  },

  status: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: 900,
    minHeight: 20,
  },

  priceWrap: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    minHeight: 62,
  },

  priceBlock: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: "8px 10px",
    background: "rgba(255,255,255,0.04)",
  },

  priceLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.8,
    color: "#f4d78b",
    opacity: 0.95,
    marginBottom: 4,
  },

  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },

  priceValue: {
    fontSize: 20,
    fontWeight: 900,
    color: "#f4d78b",
  },

  priceUnit: {
    fontSize: 12,
    opacity: 0.8,
  },

  specWrap: {
    marginTop: 10,
    minHeight: 54,
  },

  spec: {
    fontSize: 13,
    opacity: 0.85,
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical" as any,
    overflow: "hidden",
  },

  btns: {
    marginTop: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    paddingTop: 14,
  },

  btnGold: {
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 950,
    cursor: "pointer",
  },

  btnBlue: {
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(26,63,130,0.55)",
    color: "#f4d78b",
    fontWeight: 950,
    cursor: "pointer",
  },

  btnPurple: {
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(200,140,255,0.55)",
    background: "rgba(120,70,180,0.55)",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
  },
};

const gridCard: Record<string, React.CSSProperties> = {
  ...featuredCard,

  card: {
    ...featuredCard.card,
    width: 240,
    minHeight: 430,
    borderRadius: 16,
  },

  imageBox: {
    ...featuredCard.imageBox,
    height: 180,
  },

  name: {
    ...featuredCard.name,
    fontSize: 17,
    minHeight: 42,
  },

  priceWrap: {
    ...featuredCard.priceWrap,
    gap: 8,
    minHeight: 58,
  },

  priceBlock: {
    ...featuredCard.priceBlock,
    padding: "7px 8px",
  },

  priceValue: {
    ...featuredCard.priceValue,
    fontSize: 16,
  },

  priceUnit: {
    ...featuredCard.priceUnit,
    fontSize: 11,
  },

  specWrap: {
    ...featuredCard.specWrap,
    minHeight: 56,
  },
};