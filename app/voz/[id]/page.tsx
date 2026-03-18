"use client";

import { useParams, useRouter } from "next/navigation";

export default function VozPage() {
  const params = useParams();
  const router = useRouter();

  const idRaw = (params as any)?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  return (
    <div style={{ color: "#fff", padding: 20 }}>
      <button
        onClick={() => router.push("/")}
        style={{
          borderRadius: 12,
          border: "1px solid rgba(212,175,55,0.55)",
          background: "rgba(0,0,0,0.20)",
          color: "#f4d78b",
          padding: "10px 12px",
          fontWeight: 900,
          cursor: "pointer",
          marginBottom: 14,
        }}
      >
        ← Início
      </button>

      <h1>Chamada de Voz</h1>
      <p>Consultor ID: <b>{id}</b></p>

      <div style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)"
      }}>
        Aqui entra o VoIP (WebRTC/serviço externo) + cobrança por minuto.
      </div>
    </div>
  );
}