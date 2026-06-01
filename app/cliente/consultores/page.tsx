"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClienteConsultoresPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [consultores, setConsultores] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/cliente/consultores-online",
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (json?.ok) {
        setConsultores(json.consultores || []);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      padding: 30,
      color: "white",
      minHeight: "100vh"
    }}>
      <h1>Consultores Online</h1>

      {loading ? (
        <p>A carregar...</p>
      ) : consultores.length === 0 ? (
        <p>Nenhum consultor online.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 15,
            marginTop: 20,
          }}
        >
          {consultores.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 15,
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <h3>{c.nome}</h3>

              <p>
                Estado:{" "}
                {Number(c.ocupado) === 1
                  ? "Ocupado"
                  : "Disponível"}
              </p>

              <p>
                Chat: {Number(c.preco_chat ?? 0).toFixed(2)}€/min
              </p>

              <p>
                Voz: {Number(c.preco_voz ?? 0).toFixed(2)}€/min
              </p>

              <button
                onClick={() =>
                  router.push(`/consultor/${c.id}`)
                }
              >
                Ver perfil
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}