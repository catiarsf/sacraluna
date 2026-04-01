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
  const ativo = Number(c.ativo ?? 0) === 1;
  const online = Number(c.online ?? 0) === 1;
  const ocupado = Number(c.ocupado ?? 0) === 1;

  if (ativo && online && !ocupado) return 0;
  if (ativo && online && ocupado) return 1;
  return 2;
}

function normalizeName(nome?: string | null) {
  return String(nome ?? "")
    .trim()
    .toLocaleLowerCase("pt-PT");
}

function isRaquel(c: Consultor) {
  const nome = normalizeName(c.nome);
  return nome === "raquel" || nome === "raquel ferreira";
}

function sortAlphabetic(a: Consultor, b: Consultor) {
  return (a.nome || "").localeCompare(b.nome || "", "pt", {
    sensitivity: "base",
  });
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
    const sortedAll = [...consultores].sort((a, b) => {
      const rankDiff = getStatusRank(a) - getStatusRank(b);
      if (rankDiff !== 0) return rankDiff;
      return sortAlphabetic(a, b);
    });

    const featuredRaw = sortedAll.filter((c) => Number(c.destaque ?? 0) === 1);

    const featuredSorted = [...featuredRaw].sort((a, b) => {
      const aRaquel = isRaquel(a);
      const bRaquel = isRaquel(b);

      if (aRaquel && !bRaquel) return -1;
      if (!aRaquel && bRaquel) return 1;

      const rankDiff = getStatusRank(a) - getStatusRank(b);
      if (rankDiff !== 0) return rankDiff;

      return sortAlphabetic(a, b);
    });

    const featuredIds = new Set(featuredSorted.map((c) => c.id));
    const rest = sortedAll.filter((c) => !featuredIds.has(c.id));

    return {
      featured: featuredSorted,
      others: rest,
    };
  }, [consultores]);

  return (
    <div style={styles.page}>
      <Hero />

      {featured.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Consultores em destaque</h2>

          <div style={styles.featureGrid}>
            {featured.map((c) => (
              <ConsultorCard key={c.id} c={c} variant="featured" />
            ))}
          </div>
        </section>
      )}

      <section id="consultores" style={styles.section}>
        <h2 style={styles.sectionTitle}>Consultores disponíveis</h2>

        {loading && (
          <div style={{ opacity: 0.75, marginTop: 10, textAlign: "center" }}>
            A carregar…
          </div>
        )}

        {err && <div style={styles.err}>Erro: {err}</div>}

        {!loading && !err && others.length > 0 && (
          <div style={styles.grid}>
            {others.map((c) => (
              <ConsultorCard key={c.id} c={c} variant="grid" />
            ))}
          </div>
        )}

        {!loading && !err && consultores.length === 0 && (
          <div style={{ opacity: 0.7, marginTop: 10, textAlign: "center" }}>
            Ainda não há consultores disponíveis.
          </div>
        )}

        {!loading && !err && consultores.length > 0 && others.length === 0 && (
          <div style={{ opacity: 0.7, marginTop: 10, textAlign: "center" }}>
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
  const voipAtivo = Number(c.voip_ativo ?? 1) === 1;

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
    ? "#ff7b7b"
    : !online
    ? "#c7c7c7"
    : ocupado
    ? "#ffd36b"
    : "#88ffbc";

  const podeLigar = ativo && online && !ocupado && voipAtivo;

  async function iniciarChamada(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

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
        alert(json?.error || "Erro ao iniciar pedido de chat.");
        return;
      }

      const sessionId = String(json?.session_id ?? "");

      if (!sessionId) {
        setWaitingText(null);
        alert("Consulta inválida.");
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
          alert("A consulta terminou antes de começar.");
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
      {isFeatured && <div style={S.featureBadge}>★ Destaque</div>}

      <div style={S.imageFrame}>
        <div style={S.imageBox}>
          {foto ? (
            <>
              <div
                style={{
                  ...S.imageBg,
                  backgroundImage: `url(${foto})`,
                }}
              />
              <div style={S.imageOverlay} />
              <img src={foto} alt={c.nome} style={S.image} />
            </>
          ) : (
            <div style={S.placeholder}>
              <div style={S.placeholderIcon}>🌙</div>
              <div style={S.placeholderText}>Sem foto</div>
            </div>
          )}
        </div>
      </div>

      <div style={S.body}>
        <div style={S.topBlock}>
          <div style={S.name}>{c.nome}</div>
          <div style={{ ...S.status, color: statusColor }}>{statusText}</div>
        </div>

        <div style={S.priceWrap}>
          <div style={S.priceBlock}>
            <div style={S.priceLabel}>CHAT</div>
            <div style={S.priceRow}>
              <span style={S.priceValue}>{getPrecoChat(c).toFixed(2)}€</span>
              <span style={S.priceUnit}>/min</span>
            </div>
          </div>

          <div
            style={{
              ...S.priceBlock,
              ...(voipAtivo ? null : S.priceBlockDisabled),
            }}
          >
            <div
              style={{
                ...S.priceLabel,
                ...(voipAtivo ? null : S.priceLabelDisabled),
              }}
            >
              VOZ
            </div>
            {voipAtivo ? (
              <div style={S.priceRow}>
                <span style={S.priceValue}>{getPrecoVoz(c).toFixed(2)}€</span>
                <span style={S.priceUnit}>/min</span>
              </div>
            ) : (
              <div style={S.voipOffText}>Indisponível</div>
            )}
          </div>
        </div>

        <div style={S.specWrap}>
          {c.especialidades ? (
            <div style={S.spec}>{c.especialidades}</div>
          ) : (
            <div style={S.spec}>Sem especialidades indicadas.</div>
          )}
        </div>

        {waitingText && <div style={S.waitingBox}>{waitingText}</div>}

        <div style={S.btns}>
          <button
            type="button"
            style={S.btnGold}
            onClick={iniciarPedidoChat}
            disabled={creatingChat}
          >
            {creatingChat ? "AGUARDA..." : "CHAT"}
          </button>

          <button
            type="button"
            style={podeLigar ? S.btnBlue : S.btnBlueDisabled}
            onClick={iniciarChamada}
            disabled={!podeLigar}
            title={!voipAtivo ? "Chamadas por voz desligadas" : undefined}
          >
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
    maxWidth: 1240,
    margin: "0 auto",
    padding: "16px 8px",
  },

  testemunhosSection: {
    maxWidth: 1240,
    margin: "14px auto 0",
    padding: "10px 8px 24px",
  },

  sectionTitle: {
    margin: "8px 0 22px",
    textAlign: "center",
    fontSize: "clamp(30px, 4vw, 42px)",
    lineHeight: 1.1,
    fontWeight: 950,
    letterSpacing: 0.4,
    color: "#f7df99",
    textShadow:
      "0 0 14px rgba(212,175,55,0.35), 0 0 26px rgba(212,175,55,0.22), 0 8px 22px rgba(0,0,0,0.55)",
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 360px))",
    justifyContent: "center",
    gap: 26,
    alignItems: "start",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 280px))",
    justifyContent: "center",
    gap: 22,
    alignItems: "start",
  },

  err: {
    color: "#ffb4b4",
    marginTop: 10,
    textAlign: "center",
  },
};

const featuredCard: Record<string, React.CSSProperties> = {
  card: {
    position: "relative",
    width: "100%",
    minHeight: 590,
    borderRadius: 24,
    overflow: "hidden",
    border: "1px solid rgba(212,175,55,0.42)",
    background:
      "linear-gradient(180deg, rgba(12,18,32,0.96) 0%, rgba(18,26,45,0.94) 100%)",
    cursor: "pointer",
    boxShadow:
      "0 18px 45px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(10px)",
  },

  featureBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 4,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.7,
    color: "#111",
    background:
      "linear-gradient(180deg, rgba(255,223,130,1) 0%, rgba(212,175,55,1) 100%)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.24)",
  },

  imageFrame: {
    padding: 14,
    paddingBottom: 8,
  },

  imageBox: {
    position: "relative",
    height: 300,
    borderRadius: 20,
    overflow: "hidden",
    background:
      "radial-gradient(circle at center, rgba(30,43,73,0.95) 0%, rgba(10,14,24,1) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    isolation: "isolate",
  },

  imageBg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(22px) brightness(0.42)",
    transform: "scale(1.18)",
    zIndex: 0,
  },

  imageOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(8,10,16,0.20) 0%, rgba(8,10,16,0.42) 100%)",
    zIndex: 1,
  },

  image: {
    position: "relative",
    zIndex: 2,
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 10px 26px rgba(0,0,0,0.35))",
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
    padding: "8px 16px 18px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },

  topBlock: {
    marginBottom: 10,
  },

  name: {
    fontSize: 28,
    fontWeight: 950,
    lineHeight: 1.05,
    color: "#fffaf0",
    textShadow: "0 3px 10px rgba(0,0,0,0.35)",
  },

  status: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 0.3,
  },

  priceWrap: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    minHeight: 80,
  },

  priceBlock: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },

  priceBlockDisabled: {
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
    fontSize: 30,
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

  specWrap: {
    marginTop: 14,
    minHeight: 68,
  },

  spec: {
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 1.48,
    color: "rgba(255,255,255,0.92)",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical" as any,
    overflow: "hidden",
  },

  waitingBox: {
    marginTop: 12,
    padding: "9px 12px",
    borderRadius: 12,
    background: "rgba(26,63,130,0.35)",
    border: "1px solid rgba(140,180,255,0.25)",
    color: "#dce8ff",
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
  },

  btns: {
    marginTop: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    paddingTop: 16,
  },

  btnGold: {
    padding: "12px 10px",
    borderRadius: 14,
    border: "1px solid rgba(212,175,55,0.98)",
    background:
      "linear-gradient(180deg, rgba(255,227,148,1) 0%, rgba(212,175,55,0.98) 100%)",
    color: "#111",
    fontWeight: 950,
    fontSize: 13,
    letterSpacing: 0.4,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
  },

  btnBlue: {
    padding: "12px 10px",
    borderRadius: 14,
    border: "1px solid rgba(95,170,255,0.62)",
    background:
      "linear-gradient(180deg, rgba(44,99,184,0.95) 0%, rgba(28,63,130,0.92) 100%)",
    color: "#eef6ff",
    fontWeight: 950,
    fontSize: 13,
    letterSpacing: 0.4,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
  },

  btnBlueDisabled: {
    padding: "12px 10px",
    borderRadius: 14,
    border: "1px solid rgba(170,170,170,0.18)",
    background: "rgba(90,90,90,0.20)",
    color: "#c7c7c7",
    fontWeight: 950,
    fontSize: 13,
    letterSpacing: 0.4,
    cursor: "not-allowed",
    opacity: 0.78,
  },

  btnPurple: {
    padding: "12px 10px",
    borderRadius: 14,
    border: "1px solid rgba(200,140,255,0.50)",
    background:
      "linear-gradient(180deg, rgba(142,94,201,0.94) 0%, rgba(108,67,168,0.92) 100%)",
    color: "#fff",
    fontWeight: 950,
    fontSize: 13,
    letterSpacing: 0.4,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
  },
};

const gridCard: Record<string, React.CSSProperties> = {
  ...featuredCard,

  card: {
    ...featuredCard.card,
    minHeight: 520,
    borderRadius: 22,
  },

  imageFrame: {
    padding: 12,
    paddingBottom: 8,
  },

  imageBox: {
    ...featuredCard.imageBox,
    height: 240,
    borderRadius: 18,
  },

  imageBg: {
    ...featuredCard.imageBg,
    filter: "blur(18px) brightness(0.42)",
  },

  body: {
    ...featuredCard.body,
    padding: "8px 14px 16px",
  },

  name: {
    ...featuredCard.name,
    fontSize: 22,
  },

  status: {
    ...featuredCard.status,
    fontSize: 13,
  },

  priceWrap: {
    ...featuredCard.priceWrap,
    gap: 10,
    minHeight: 72,
  },

  priceBlock: {
    ...featuredCard.priceBlock,
    padding: "9px 10px",
    borderRadius: 14,
  },

  priceValue: {
    ...featuredCard.priceValue,
    fontSize: 24,
  },

  priceUnit: {
    ...featuredCard.priceUnit,
    fontSize: 12,
  },

  specWrap: {
    ...featuredCard.specWrap,
    minHeight: 60,
  },

  spec: {
    ...featuredCard.spec,
    fontSize: 13,
  },

  btns: {
    ...featuredCard.btns,
    gap: 8,
  },

  btnGold: {
    ...featuredCard.btnGold,
    fontSize: 12,
    padding: "11px 8px",
  },

  btnBlue: {
    ...featuredCard.btnBlue,
    fontSize: 12,
    padding: "11px 8px",
  },

  btnBlueDisabled: {
    ...featuredCard.btnBlueDisabled,
    fontSize: 12,
    padding: "11px 8px",
  },

  btnPurple: {
    ...featuredCard.btnPurple,
    fontSize: 12,
    padding: "11px 8px",
  },
};