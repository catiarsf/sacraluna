"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function ConsultorPerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [nome, setNome] = useState("Consultor");
  const [fotoUrl, setFotoUrl] = useState("");
  const [especialidades, setEspecialidades] = useState("");
  const [apresentacao, setApresentacao] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/consultor/me", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao carregar perfil.");
      }

      setNome(String(json?.consultor?.nome ?? "Consultor"));
      setFotoUrl(String(json?.consultor?.foto_url ?? ""));
      setEspecialidades(String(json?.consultor?.especialidades ?? ""));
      setApresentacao(String(json?.consultor?.apresentacao ?? ""));
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function uploadFoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/consultor/upload", {
      method: "POST",
      body: fd,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Erro no upload da foto.");
    }

    return String(json.url || "");
  }

  async function guardarPerfil() {
    try {
      setSaving(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/consultor/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foto_url: fotoUrl,
          especialidades,
          apresentacao,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao guardar perfil.");
      }

      setSucesso("Perfil atualizado com sucesso.");
    } catch (e: any) {
      setErro(e?.message || "Erro ao guardar perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function alterarPassword() {
    try {
      setPasswordSaving(true);
      setErro("");
      setSucesso("");

      const res = await fetch("/api/consultor/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao alterar password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setSucesso("Password alterada com sucesso.");
    } catch (e: any) {
      setErro(e?.message || "Erro ao alterar password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.topRow}>
        <h1 style={styles.h1}>Editar perfil</h1>
        <Link href="/consultor" style={styles.linkBtn}>
          ← Voltar
        </Link>
      </div>

      {erro ? <div style={styles.err}>{erro}</div> : null}
      {sucesso ? <div style={styles.success}>{sucesso}</div> : null}

      {loading ? (
        <div style={styles.card}>A carregar...</div>
      ) : (
        <>
          <div style={styles.card}>
            <div style={styles.name}>{nome}</div>

            <label style={styles.label}>Foto</label>
            <div style={styles.uploadRow}>
              {fotoUrl ? <img src={fotoUrl} alt="foto" style={styles.profileImg} /> : null}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;

                    try {
                      setUploading(true);
                      setErro("");
                      const url = await uploadFoto(f);
                      setFotoUrl(url);
                    } catch (er: any) {
                      setErro(er?.message || "Erro no upload.");
                    } finally {
                      setUploading(false);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <div style={styles.smallText}>
                  {uploading ? "A enviar foto..." : fotoUrl || "Sem foto"}
                </div>
              </div>
            </div>

            <label style={styles.label}>Especialidades</label>
            <textarea
              value={especialidades}
              onChange={(e) => setEspecialidades(e.target.value)}
              style={styles.textarea}
              placeholder="Tarot, Baralho Cigano, Mesa Radiónica..."
            />

            <label style={styles.label}>Apresentação</label>
            <textarea
              value={apresentacao}
              onChange={(e) => setApresentacao(e.target.value)}
              style={styles.textarea}
              placeholder="Escreve aqui a tua apresentação..."
            />

            <button style={styles.btn} onClick={guardarPerfil} disabled={saving || uploading}>
              {saving ? "A guardar..." : "Guardar perfil"}
            </button>
          </div>

          <div style={styles.card}>
            <h2 style={styles.h2}>Alterar password</h2>

            <label style={styles.label}>Password atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Nova password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
            />

            <button style={styles.btn} onClick={alterarPassword} disabled={passwordSaving}>
              {passwordSaving ? "A alterar..." : "Alterar password"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 24,
    color: "#fff",
    background:
      "radial-gradient(1100px 650px at 50% 75%, rgba(25,70,140,0.55) 0%, rgba(10,16,28,1) 55%)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  h1: {
    fontSize: 32,
    fontWeight: 900,
    margin: 0,
  },
  h2: {
    fontSize: 22,
    fontWeight: 800,
    margin: "0 0 10px",
  },
  linkBtn: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    textDecoration: "none",
  },
  card: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  name: {
    fontSize: 28,
    fontWeight: 900,
    color: "#f4d78b",
    marginBottom: 10,
  },
  label: {
    display: "block",
    marginBottom: 8,
    marginTop: 14,
    fontWeight: 800,
    opacity: 0.9,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "12px 12px",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "12px 12px",
    outline: "none",
    resize: "vertical",
  },
  uploadRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  profileImg: {
    width: 72,
    height: 72,
    borderRadius: 14,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  smallText: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.8,
    wordBreak: "break-word",
  },
  btn: {
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.95)",
    background: "rgba(212,175,55,0.95)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
  err: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    whiteSpace: "pre-wrap",
  },
  success: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(40,140,80,0.18)",
    border: "1px solid rgba(90,200,120,0.30)",
    whiteSpace: "pre-wrap",
  },
};