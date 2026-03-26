"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Consultor = {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  preco_por_min?: number;
  preco_chat?: number;
  preco_voz?: number;
  percentagem_ganho?: number;
  valor_min_eur?: number;
  foto_url: string;
  especialidades: string;
  apresentacao: string;
  ativo: 0 | 1;
  destaque: 0 | 1;
  online?: 0 | 1;
  pack_1_qtd?: number;
  pack_1_preco?: number;
  pack_2_qtd?: number;
  pack_2_preco?: number;
  pack_3_qtd?: number;
  pack_3_preco?: number;
  pack_4_qtd?: number;
  pack_4_preco?: number;
};

export default function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [list, setList] = useState<Consultor[]>([]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [preco, setPreco] = useState("1.00");
  const [precoChat, setPrecoChat] = useState("1.00");
  const [precoVoz, setPrecoVoz] = useState("1.00");
  const [percentagemGanho, setPercentagemGanho] = useState("40");
  const [especialidades, setEspecialidades] = useState("");
  const [apresentacao, setApresentacao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("/consultores/default.jpg");
  const [ativo, setAtivo] = useState(true);
  const [destaque, setDestaque] = useState(false);

  const [pack1Qtd, setPack1Qtd] = useState("1");
  const [pack1Preco, setPack1Preco] = useState("1");
  const [pack2Qtd, setPack2Qtd] = useState("3");
  const [pack2Preco, setPack2Preco] = useState("3");
  const [pack3Qtd, setPack3Qtd] = useState("5");
  const [pack3Preco, setPack3Preco] = useState("5");
  const [pack4Qtd, setPack4Qtd] = useState("10");
  const [pack4Preco, setPack4Preco] = useState("10");

  const [edit, setEdit] = useState<Consultor | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editPreco, setEditPreco] = useState("");
  const [editPrecoChat, setEditPrecoChat] = useState("");
  const [editPrecoVoz, setEditPrecoVoz] = useState("");
  const [editPercentagem, setEditPercentagem] = useState("");

  const [editPack1Qtd, setEditPack1Qtd] = useState("");
  const [editPack1Preco, setEditPack1Preco] = useState("");
  const [editPack2Qtd, setEditPack2Qtd] = useState("");
  const [editPack2Preco, setEditPack2Preco] = useState("");
  const [editPack3Qtd, setEditPack3Qtd] = useState("");
  const [editPack3Preco, setEditPack3Preco] = useState("");
  const [editPack4Qtd, setEditPack4Qtd] = useState("");
  const [editPack4Preco, setEditPack4Preco] = useState("");

  const ativosCount = useMemo(() => list.filter((c) => c.ativo === 1).length, [list]);
  const destaqueCount = useMemo(() => list.filter((c) => c.destaque === 1).length, [list]);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/consultores", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar");
      }

      const arr = Array.isArray(data?.consultores) ? data.consultores : [];
      arr.sort((a: Consultor, b: Consultor) =>
        (a.nome || "").localeCompare(b.nome || "", "pt", { sensitivity: "base" })
      );

      setList(arr);
    } catch (e: any) {
      setErr(`Erro ao carregar: ${String(e?.message ?? e)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/consultores/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error ?? "Falha no upload");
    }

    return data.url as string;
  }
async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    try {
      const body = {
        nome,
        email,
        telefone,
        password,
        preco_por_min: Number(preco),
        preco_chat: Number(precoChat),
        preco_voz: Number(precoVoz),
        percentagem_ganho: Number(percentagemGanho),
        foto_url: fotoUrl,
        especialidades,
        apresentacao,
        ativo,
        destaque,
        online: false,
        pack_1_qtd: Number(pack1Qtd),
        pack_1_preco: Number(pack1Preco),
        pack_2_qtd: Number(pack2Qtd),
        pack_2_preco: Number(pack2Preco),
        pack_3_qtd: Number(pack3Qtd),
        pack_3_preco: Number(pack3Preco),
        pack_4_qtd: Number(pack4Qtd),
        pack_4_preco: Number(pack4Preco),
      };

      const res = await fetch("/api/admin/consultores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? data?.detail ?? "Erro ao criar consultor");

      setNome("");
      setEmail("");
      setTelefone("");
      setPassword("");
      setPreco("1.00");
      setPrecoChat("1.00");
      setPrecoVoz("1.00");
      setPercentagemGanho("40");
      setEspecialidades("");
      setApresentacao("");
      setFotoUrl("/consultores/default.jpg");
      setAtivo(true);
      setDestaque(false);

      setPack1Qtd("1");
      setPack1Preco("1");
      setPack2Qtd("3");
      setPack2Preco("3");
      setPack3Qtd("5");
      setPack3Preco("5");
      setPack4Qtd("10");
      setPack4Preco("10");

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  async function onSaveEdit() {
    if (!edit) return;
    setSaving(true);
    setErr("");

    try {
      const res = await fetch(`/api/admin/consultores/${edit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: edit.nome,
          email: edit.email,
          telefone: edit.telefone ?? "",
          preco_por_min: Number(editPreco),
          preco_chat: Number(editPrecoChat),
          preco_voz: Number(editPrecoVoz),
          percentagem_ganho: Number(editPercentagem),
          foto_url: edit.foto_url,
          especialidades: edit.especialidades,
          apresentacao: edit.apresentacao,
          ativo: edit.ativo === 1,
          destaque: edit.destaque === 1,
          online: edit.online === 1,

          pack_1_qtd: Number(editPack1Qtd),
          pack_1_preco: Number(editPack1Preco),
          pack_2_qtd: Number(editPack2Qtd),
          pack_2_preco: Number(editPack2Preco),
          pack_3_qtd: Number(editPack3Qtd),
          pack_3_preco: Number(editPack3Preco),
          pack_4_qtd: Number(editPack4Qtd),
          pack_4_preco: Number(editPack4Preco),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Erro ao guardar");

      setEdit(null);
      setEditPreco("");
      setEditPrecoChat("");
      setEditPrecoVoz("");
      setEditPercentagem("");
      setEditPack1Qtd("");
      setEditPack1Preco("");
      setEditPack2Qtd("");
      setEditPack2Preco("");
      setEditPack3Qtd("");
      setEditPack3Preco("");
      setEditPack4Qtd("");
      setEditPack4Preco("");

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleDestaque(c: Consultor) {
    setErr("");
    setTogglingId(c.id);

    try {
      const res = await fetch(`/api/admin/consultores/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destaque: c.destaque !== 1,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Erro ao alterar destaque");

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setTogglingId(null);
    }
  }
 async function setDisponibilidade(c: Consultor, disponivel: boolean) {
    setErr("");
    setTogglingId(c.id);

    try {
      const res = await fetch(`/api/admin/consultores/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          online: disponivel,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Erro ao alterar disponibilidade");

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteConsultor(c: Consultor) {
    const ok = window.confirm(`Tens a certeza que queres eliminar "${c.nome}"?`);
    if (!ok) return;

    setErr("");
    setTogglingId(c.id);

    try {
      const res = await fetch(`/api/admin/consultores/${c.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Erro ao eliminar consultor");

      if (edit?.id === c.id) {
        setEdit(null);
        setEditPreco("");
        setEditPrecoChat("");
        setEditPrecoVoz("");
        setEditPercentagem("");
        setEditPack1Qtd("");
        setEditPack1Preco("");
        setEditPack2Qtd("");
        setEditPack2Preco("");
        setEditPack3Qtd("");
        setEditPack3Preco("");
        setEditPack4Qtd("");
        setEditPack4Preco("");
      }

      await load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Administração</h1>
        <div style={styles.stats}>
          <div>
            Consultores: <b>{list.length}</b>
          </div>
          <div>
            Ativos: <b>{ativosCount}</b>
          </div>
          <div>
            Destaque: <b>{destaqueCount}/2</b>
          </div>
        </div>
      </div>

      <div style={styles.quickRow}>
        <Link href="/admin" style={styles.quickCardActive}>
          <div style={styles.quickTitle}>Consultores</div>
          <div style={styles.quickText}>Gerir consultores, destaque e disponibilidade</div>
        </Link>

        <Link href="/admin/loja" style={styles.quickCard}>
          <div style={styles.quickTitle}>Serviços</div>
          <div style={styles.quickText}>Criar serviços, descrição, imagens e preços</div>
        </Link>

        <Link href="/admin/pedidos-servicos" style={styles.quickCard}>
          <div style={styles.quickTitle}>Pedidos</div>
          <div style={styles.quickText}>Ver compras pagas e contactos dos clientes</div>
        </Link>

        <Link href="/admin/blog" style={styles.quickCard}>
          <div style={styles.quickTitle}>Blog</div>
          <div style={styles.quickText}>Criar cartas do dia e artigos com imagem e texto</div>
        </Link>
      
      <Link href="/admin/historico" style={styles.quickCard}>
  <div style={styles.quickTitle}>Histórico</div>
  <div style={styles.quickText}>Ver chats e emails/perguntas de todos os consultores</div>
</Link>
      </div>

      {err && <div style={styles.err}>{err}</div>}

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Novo consultor</h2>

          <form onSubmit={onCreate} style={styles.form}>
            <label style={styles.label}>Nome</label>
            <input style={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} />

            <label style={styles.label}>Email</label>
            <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />

            <label style={styles.label}>Telefone</label>
            <input
              style={styles.input}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="+3519XXXXXXXX"
            />

            <label style={styles.label}>Password (dev)</label>
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label style={styles.label}>Preço base (€ / min)</label>
            <input style={styles.input} value={preco} onChange={(e) => setPreco(e.target.value)} />

            <label style={styles.label}>Preço chat (€ / min)</label>
            <input
              style={styles.input}
              value={precoChat}
              onChange={(e) => setPrecoChat(e.target.value)}
            />
<label style={styles.label}>Preço voz (€ / min)</label>
            <input
              style={styles.input}
              value={precoVoz}
              onChange={(e) => setPrecoVoz(e.target.value)}
            />

            <label style={styles.label}>Percentagem do consultor (%)</label>
            <input
              style={styles.input}
              value={percentagemGanho}
              onChange={(e) => setPercentagemGanho(e.target.value)}
            />

            <div style={styles.packBox}>
              <div style={styles.packTitle}>Pacotes de Email</div>

              <div style={styles.packGrid}>
                <div>
                  <label style={styles.label}>Pack 1 - Nº perguntas</label>
                  <input style={styles.input} value={pack1Qtd} onChange={(e) => setPack1Qtd(e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Pack 1 - Preço (€)</label>
                  <input style={styles.input} value={pack1Preco} onChange={(e) => setPack1Preco(e.target.value)} />
                </div>

                <div>
                  <label style={styles.label}>Pack 2 - Nº perguntas</label>
                  <input style={styles.input} value={pack2Qtd} onChange={(e) => setPack2Qtd(e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Pack 2 - Preço (€)</label>
                  <input style={styles.input} value={pack2Preco} onChange={(e) => setPack2Preco(e.target.value)} />
                </div>

                <div>
                  <label style={styles.label}>Pack 3 - Nº perguntas</label>
                  <input style={styles.input} value={pack3Qtd} onChange={(e) => setPack3Qtd(e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Pack 3 - Preço (€)</label>
                  <input style={styles.input} value={pack3Preco} onChange={(e) => setPack3Preco(e.target.value)} />
                </div>

                <div>
                  <label style={styles.label}>Pack 4 - Nº perguntas</label>
                  <input style={styles.input} value={pack4Qtd} onChange={(e) => setPack4Qtd(e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Pack 4 - Preço (€)</label>
                  <input style={styles.input} value={pack4Preco} onChange={(e) => setPack4Preco(e.target.value)} />
                </div>
              </div>
            </div>

            <label style={styles.label}>Foto (upload)</label>
            <div style={styles.row}>
              <img src={fotoUrl} alt="foto" style={styles.thumb} />
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    setErr("");
                    try {
                      const url = await uploadFile(f);
                      setFotoUrl(url);
                    } catch (er: any) {
                      setErr(String(er?.message ?? er));
                    } finally {
                      setUploading(false);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <div style={styles.small}>{uploading ? "A enviar..." : fotoUrl}</div>
              </div>
            </div>

            <label style={styles.label}>Especialidades</label>
            <input
              style={styles.input}
              value={especialidades}
              onChange={(e) => setEspecialidades(e.target.value)}
              placeholder="Ex: Tarot, Baralho Cigano..."
            />

            <label style={styles.label}>Apresentação</label>
            <textarea
              style={styles.textarea}
              value={apresentacao}
              onChange={(e) => setApresentacao(e.target.value)}
              placeholder="Texto curto para aparecer no card..."
            />

            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span>Ativo</span>
            </label>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={destaque}
                onChange={(e) => setDestaque(e.target.checked)}
                disabled={!destaque && destaqueCount >= 2}
              />
              <span>Colocar em destaque</span>
            </label>

            <button type="submit" style={styles.btn} disabled={uploading}>
              Criar consultor
            </button>
          </form>
        </div>
<div style={styles.card}>
          <h2 style={styles.h2}>Lista</h2>

          {loading ? (
            <div style={styles.small}>A carregar...</div>
          ) : list.length === 0 ? (
            <div style={styles.small}>Sem consultores ainda.</div>
          ) : (
            <div style={styles.list}>
              {list.map((c) => (
                <div key={c.id} style={styles.item}>
                  <img src={c.foto_url} alt={c.nome} style={styles.avatar} />

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={styles.itemName}>{c.nome}</div>
                    <div style={styles.small}>{c.email}</div>
                    <div style={styles.small}>Telefone: {c.telefone || "Sem telefone"}</div>
                    <div style={styles.small}>Chat: {Number(c.preco_chat ?? 0).toFixed(2)}€/min</div>
                    <div style={styles.small}>Voz: {Number(c.preco_voz ?? 0).toFixed(2)}€/min</div>
                    <div style={styles.small}>
                      Percentagem: {Number(c.percentagem_ganho ?? 0).toFixed(0)}%
                    </div>
                    <div style={styles.small}>
                      Packs email:{" "}
                      {Number(c.pack_1_qtd ?? 1)} por {Number(c.pack_1_preco ?? 1).toFixed(2)}€ •{" "}
                      {Number(c.pack_2_qtd ?? 3)} por {Number(c.pack_2_preco ?? 3).toFixed(2)}€ •{" "}
                      {Number(c.pack_3_qtd ?? 5)} por {Number(c.pack_3_preco ?? 5).toFixed(2)}€ •{" "}
                      {Number(c.pack_4_qtd ?? 10)} por {Number(c.pack_4_preco ?? 10).toFixed(2)}€
                    </div>
                    <div style={styles.small}>
                      {c.online === 1 ? "Disponível" : "Indisponível"} •{" "}
                      {c.destaque === 1 ? "Em destaque" : "Normal"}
                    </div>
                  </div>

                  <div style={styles.actionCol}>
                    <div style={styles.badge}>{c.ativo ? "Ativo" : "Inativo"}</div>
                    <div style={styles.badgeGold}>{c.destaque ? "Destaque" : "Normal"}</div>

                    <button
                      style={styles.btnGreenSmall}
                      onClick={() => setDisponibilidade(c, true)}
                      disabled={togglingId === c.id}
                    >
                      Disponível
                    </button>

                    <button
                      style={styles.btnGraySmall}
                      onClick={() => setDisponibilidade(c, false)}
                      disabled={togglingId === c.id}
                    >
                      Indisponível
                    </button>

                    <button
                      style={c.destaque ? styles.btnWarnSmall : styles.btnGoldSmall}
                      onClick={() => toggleDestaque(c)}
                      disabled={togglingId === c.id || (c.destaque !== 1 && destaqueCount >= 2)}
                    >
                      {togglingId === c.id
                        ? "A alterar..."
                        : c.destaque === 1
                        ? "Remover destaque"
                        : "Destacar"}
                    </button>

                    <button
                      style={styles.btnDangerSmall}
                      onClick={() => deleteConsultor(c)}
                      disabled={togglingId === c.id}
                    >
                      Eliminar
                    </button>

                    <button
                      style={styles.btnSmall}
                      onClick={() => {
                        setEdit({ ...c });
                        setEditPreco(String(Number(c.preco_por_min ?? 0)));
                        setEditPrecoChat(String(Number(c.preco_chat ?? 0)));
                        setEditPrecoVoz(String(Number(c.preco_voz ?? 0)));
                        setEditPercentagem(String(Number(c.percentagem_ganho ?? 40)));
                        setEditPack1Qtd(String(Number(c.pack_1_qtd ?? 1)));
                        setEditPack1Preco(String(Number(c.pack_1_preco ?? 1)));
                        setEditPack2Qtd(String(Number(c.pack_2_qtd ?? 3)));
                        setEditPack2Preco(String(Number(c.pack_2_preco ?? 3)));
                        setEditPack3Qtd(String(Number(c.pack_3_qtd ?? 5)));
                        setEditPack3Preco(String(Number(c.pack_3_preco ?? 5)));
                        setEditPack4Qtd(String(Number(c.pack_4_qtd ?? 10)));
                        setEditPack4Preco(String(Number(c.pack_4_preco ?? 10)));
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
 {edit && (
        <div style={styles.modalBackdrop} onClick={() => !saving && setEdit(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.h2}>Editar consultor</h2>

            <div style={styles.form}>
              <label style={styles.label}>Nome</label>
              <input
                style={styles.input}
                value={edit.nome}
                onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
              />

              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />

              <label style={styles.label}>Telefone</label>
              <input
                style={styles.input}
                value={edit.telefone ?? ""}
                onChange={(e) => setEdit({ ...edit, telefone: e.target.value })}
                placeholder="+3519XXXXXXXX"
              />

              <label style={styles.label}>Preço base (€ / min)</label>
              <input
                type="text"
                inputMode="decimal"
                style={styles.input}
                value={editPreco}
                onChange={(e) => setEditPreco(e.target.value)}
              />

              <label style={styles.label}>Preço chat (€ / min)</label>
              <input
                type="text"
                inputMode="decimal"
                style={styles.input}
                value={editPrecoChat}
                onChange={(e) => setEditPrecoChat(e.target.value)}
              />

              <label style={styles.label}>Preço voz (€ / min)</label>
              <input
                type="text"
                inputMode="decimal"
                style={styles.input}
                value={editPrecoVoz}
                onChange={(e) => setEditPrecoVoz(e.target.value)}
              />

              <label style={styles.label}>Percentagem do consultor (%)</label>
              <input
                type="text"
                inputMode="decimal"
                style={styles.input}
                value={editPercentagem}
                onChange={(e) => setEditPercentagem(e.target.value)}
              />

              <div style={styles.packBox}>
                <div style={styles.packTitle}>Pacotes de Email</div>

                <div style={styles.packGrid}>
                  <div>
                    <label style={styles.label}>Pack 1 - Nº perguntas</label>
                    <input
                      style={styles.input}
                      value={editPack1Qtd}
                      onChange={(e) => setEditPack1Qtd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Pack 1 - Preço (€)</label>
                    <input
                      style={styles.input}
                      value={editPack1Preco}
                      onChange={(e) => setEditPack1Preco(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Pack 2 - Nº perguntas</label>
                    <input
                      style={styles.input}
                      value={editPack2Qtd}
                      onChange={(e) => setEditPack2Qtd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Pack 2 - Preço (€)</label>
                    <input
                      style={styles.input}
                      value={editPack2Preco}
                      onChange={(e) => setEditPack2Preco(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Pack 3 - Nº perguntas</label>
                    <input
                      style={styles.input}
                      value={editPack3Qtd}
                      onChange={(e) => setEditPack3Qtd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Pack 3 - Preço (€)</label>
                    <input
                      style={styles.input}
                      value={editPack3Preco}
                      onChange={(e) => setEditPack3Preco(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Pack 4 - Nº perguntas</label>
                    <input
                      style={styles.input}
                      value={editPack4Qtd}
                      onChange={(e) => setEditPack4Qtd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Pack 4 - Preço (€)</label>
                    <input
                      style={styles.input}
                      value={editPack4Preco}
                      onChange={(e) => setEditPack4Preco(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <label style={styles.label}>Foto (upload)</label>
              <div style={styles.row}>
                <img src={edit.foto_url} alt="foto" style={styles.thumb} />
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading || saving}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      setErr("");
                      try {
                        const url = await uploadFile(f);
                        setEdit({ ...edit, foto_url: url });
                      } catch (er: any) {
                        setErr(String(er?.message ?? er));
                      } finally {
                        setUploading(false);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <div style={styles.small}>{uploading ? "A enviar..." : edit.foto_url}</div>
                </div>
              </div>

              <label style={styles.label}>Especialidades</label>
              <input
                style={styles.input}
                value={edit.especialidades ?? ""}
                onChange={(e) => setEdit({ ...edit, especialidades: e.target.value })}
              />

              <label style={styles.label}>Apresentação</label>
              <textarea
                style={styles.textarea}
                value={edit.apresentacao ?? ""}
                onChange={(e) => setEdit({ ...edit, apresentacao: e.target.value })}
              />

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={edit.ativo === 1}
                  onChange={(e) => setEdit({ ...edit, ativo: e.target.checked ? 1 : 0 })}
                />
                <span>Ativo</span>
              </label>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={edit.destaque === 1}
                  disabled={edit.destaque !== 1 && destaqueCount >= 2}
                  onChange={(e) => setEdit({ ...edit, destaque: e.target.checked ? 1 : 0 })}
                />
                <span>Em destaque</span>
              </label>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={edit.online === 1}
                  onChange={(e) => setEdit({ ...edit, online: e.target.checked ? 1 : 0 })}
                />
                <span>Disponível</span>
              </label>

              <div style={styles.modalBtns}>
                <button
                  type="button"
                  style={styles.btnGhost}
                  onClick={() => setEdit(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  style={styles.btn}
                  onClick={onSaveEdit}
                  disabled={saving || uploading}
                >
                  {saving ? "A guardar..." : "Guardar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 16,
    maxWidth: 1100,
    margin: "0 auto",
  },

  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  h1: {
    fontSize: 28,
    margin: 0,
  },

  stats: {
    display: "flex",
    gap: 16,
    opacity: 0.9,
    flexWrap: "wrap",
  },

  quickRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginTop: 16,
  },

  quickCard: {
    display: "block",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 16,
    color: "white",
  },

  quickCardActive: {
    display: "block",
    textDecoration: "none",
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.10)",
    borderRadius: 14,
    padding: 16,
    color: "#f4d78b",
  },

  quickTitle: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 6,
  },

  quickText: {
    fontSize: 13,
    opacity: 0.82,
    lineHeight: 1.5,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "0.95fr 1.05fr",
    gap: 14,
    marginTop: 16,
  },

  card: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 14,
  },

  h2: {
    margin: "0 0 12px",
    fontSize: 18,
  },

  err: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,0,0,0.10)",
    border: "1px solid rgba(255,0,0,0.25)",
    whiteSpace: "pre-wrap",
  },

  form: {
    display: "grid",
    gap: 8,
  },

  label: {
    fontSize: 12,
    opacity: 0.9,
  },

  input: {
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
  },

  textarea: {
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    minHeight: 90,
    resize: "vertical",
  },

  btn: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(212,175,55,0.55)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.98) 0%, rgba(180,140,35,0.98) 100%)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },

  btnGhost: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },

  btnSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    width: "100%",
  },

  btnGoldSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(212,175,55,0.55)",
    background: "rgba(212,175,55,0.18)",
    color: "#f4d78b",
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },

  btnWarnSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,120,120,0.55)",
    background: "rgba(140,40,40,0.30)",
    color: "#ffd0d0",
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },

  btnGreenSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(90,200,120,0.55)",
    background: "rgba(50,140,80,0.30)",
    color: "#d7ffe0",
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },

  btnGraySmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(180,180,180,0.35)",
    background: "rgba(90,90,90,0.30)",
    color: "#f1f1f1",
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },

  btnDangerSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,80,80,0.55)",
    background: "rgba(160,20,20,0.35)",
    color: "#ffd6d6",
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  },

  list: {
    display: "grid",
    gap: 10,
  },

  item: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    flexWrap: "wrap",
  },

  itemName: {
    fontWeight: 900,
  },

  small: {
    fontSize: 12,
    opacity: 0.75,
    marginTop: 4,
    wordBreak: "break-word",
  },

  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    fontSize: 12,
    opacity: 0.9,
    textAlign: "center",
  },

  badgeGold: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(212,175,55,0.45)",
    background: "rgba(212,175,55,0.18)",
    fontSize: 12,
    color: "#f4d78b",
    textAlign: "center",
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    objectFit: "cover",
  },

  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    objectFit: "cover",
  },

  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  checkboxRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
  },

  actionCol: {
    display: "grid",
    gap: 8,
    width: 140,
    marginLeft: "auto",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 999,
  },

  modal: {
    width: "min(560px, 92vw)",
    maxHeight: "86vh",
    overflowY: "auto",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(10,10,10,0.96)",
    padding: 14,
  },

  modalBtns: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 10,
    flexWrap: "wrap",
  },

  packBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
  },

  packTitle: {
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 10,
    color: "#f4d78b",
  },

  packGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
};     