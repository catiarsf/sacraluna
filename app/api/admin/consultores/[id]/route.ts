import { NextResponse } from "next/server";
import db from "@/lib/db";

type Ctx = {
  params: Promise<{ id: string }>;
};

function norm(v: any) {
  return String(v ?? "").trim();
}

function toNumber(v: any) {
  const n = Number.parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toInt(v: any, fallback = 0) {
  const n = Number.parseInt(String(v ?? fallback), 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const consultorId = Number(id);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const atual = db
      .prepare(
        `
        SELECT * FROM consultores WHERE id = ?
        `
      )
      .get(consultorId) as any;

    if (!atual) {
      return NextResponse.json(
        { ok: false, error: "Consultor não encontrado" },
        { status: 404 }
      );
    }

    // 🔥 DETECTA SE É SÓ TOGGLE
    const hasOnlyToggleFields =
      (Object.prototype.hasOwnProperty.call(body, "online") ||
        Object.prototype.hasOwnProperty.call(body, "destaque") ||
        Object.prototype.hasOwnProperty.call(body, "ativo")) &&
      Object.keys(body).length <= 3;

    if (hasOnlyToggleFields) {
      const online =
        typeof body?.online === "undefined"
          ? Number(atual.online ?? 0)
          : body?.online
          ? 1
          : 0;

      const ativo =
        typeof body?.ativo === "undefined"
          ? Number(atual.ativo ?? 0)
          : body?.ativo
          ? 1
          : 0;

      const destaque =
        typeof body?.destaque === "undefined"
          ? Number(atual.destaque ?? 0)
          : body?.destaque
          ? 1
          : 0;

      // 🔥 LIMITE DE DESTAQUE
      if (destaque === 1 && Number(atual.destaque ?? 0) !== 1) {
        const totalDestaque = db
          .prepare(
            `SELECT COUNT(*) as total FROM consultores WHERE destaque = 1 AND id <> ?`
          )
          .get(consultorId) as { total: number };

        if ((totalDestaque?.total ?? 0) >= 2) {
          return NextResponse.json(
            { ok: false, error: "Já existem 2 consultores em destaque." },
            { status: 400 }
          );
        }
      }

      // 🔥 UPDATE SEM BLOQUEIO
      db.prepare(
        `
        UPDATE consultores
        SET
          online = ?,
          ativo = ?,
          destaque = ?,
          last_seen_at = strftime('%s','now')
        WHERE id = ?
        `
      ).run(online, ativo, destaque, consultorId);

      const atualizado = db
        .prepare(`SELECT * FROM consultores WHERE id = ?`)
        .get(consultorId);

      return NextResponse.json({
        ok: true,
        consultor: atualizado,
      });
    }

    // 🔥 CAMPOS NORMAIS
    const nome = norm(body?.nome ?? atual.nome);
    const email = norm(body?.email ?? atual.email).toLowerCase();
    const telefone = norm(body?.telefone ?? atual.telefone);
    const password = norm(body?.password);
    const foto_url =
      norm(body?.foto_url ?? atual.foto_url) || "/consultores/default.jpg";
    const especialidades = norm(
      body?.especialidades ?? atual.especialidades
    );
    const apresentacao = norm(body?.apresentacao ?? atual.apresentacao);

    const preco_por_min = toNumber(
      body?.preco_por_min ??
        body?.valor_min_eur ??
        body?.valor_min ??
        atual.preco_por_min
    );

    const preco_chat = toNumber(
      body?.preco_chat ?? atual.preco_chat ?? preco_por_min
    );

    const preco_voz = toNumber(
      body?.preco_voz ?? atual.preco_voz ?? preco_por_min
    );

    const percentagem_ganho = toNumber(
      body?.percentagem_ganho ?? atual.percentagem_ganho ?? 40
    );

    // 🔥 PACKS
    const pack1Qtd = toInt(body?.pack_1_qtd ?? atual.pack_1_qtd ?? 1, 1);
    const pack1Preco = toNumber(body?.pack_1_preco ?? atual.pack_1_preco ?? 1);

    const pack2Qtd = toInt(body?.pack_2_qtd ?? atual.pack_2_qtd ?? 3, 3);
    const pack2Preco = toNumber(body?.pack_2_preco ?? atual.pack_2_preco ?? 3);
const pack3Qtd = toInt(body?.pack_3_qtd ?? atual.pack_3_qtd ?? 5, 5);
    const pack3Preco = toNumber(body?.pack_3_preco ?? atual.pack_3_preco ?? 5);

    const pack4Qtd = toInt(body?.pack_4_qtd ?? atual.pack_4_qtd ?? 10, 10);
    const pack4Preco = toNumber(body?.pack_4_preco ?? atual.pack_4_preco ?? 10);

    const ativo =
      typeof body?.ativo === "undefined"
        ? Number(atual.ativo ?? 0)
        : body?.ativo
        ? 1
        : 0;

    const destaque =
      typeof body?.destaque === "undefined"
        ? Number(atual.destaque ?? 0)
        : body?.destaque
        ? 1
        : 0;

    const online =
      typeof body?.online === "undefined"
        ? Number(atual.online ?? 0)
        : body?.online
        ? 1
        : 0;

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "O nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    const emailExiste = db
      .prepare(
        `SELECT id FROM consultores WHERE lower(email) = ? AND id <> ?`
      )
      .get(email, consultorId) as any;

    if (emailExiste) {
      return NextResponse.json(
        { ok: false, error: "Já existe outro consultor com esse email." },
        { status: 400 }
      );
    }

    if (destaque === 1 && Number(atual.destaque ?? 0) !== 1) {
      const totalDestaque = db
        .prepare(
          `SELECT COUNT(*) as total FROM consultores WHERE destaque = 1 AND id <> ?`
        )
        .get(consultorId) as { total: number };

      if ((totalDestaque?.total ?? 0) >= 2) {
        return NextResponse.json(
          { ok: false, error: "Já existem 2 consultores em destaque." },
          { status: 400 }
        );
      }
    }

    const passwordFinal = password || atual.password || "";

    // 🔥 UPDATE PRINCIPAL (SEM BLOQUEIO)
    db.prepare(
      `
      UPDATE consultores
      SET
        nome = ?,
        email = ?,
        telefone = ?,
        password = ?,
        preco_por_min = ?,
        preco_chat = ?,
        preco_voz = ?,
        percentagem_ganho = ?,
        foto_url = ?,
        especialidades = ?,
        apresentacao = ?,
        ativo = ?,
        destaque = ?,
        online = ?,
        pack_1_qtd = ?,
        pack_1_preco = ?,
        pack_2_qtd = ?,
        pack_2_preco = ?,
        pack_3_qtd = ?,
        pack_3_preco = ?,
        pack_4_qtd = ?,
        pack_4_preco = ?,
        last_seen_at = strftime('%s','now')
      WHERE id = ?
      `
    ).run(
      nome,
      email,
      telefone,
      passwordFinal,
      preco_por_min,
      preco_chat,
      preco_voz,
      percentagem_ganho,
      foto_url,
      especialidades,
      apresentacao,
      ativo,
      destaque,
      online,
      pack1Qtd,
      pack1Preco,
      pack2Qtd,
      pack2Preco,
      pack3Qtd,
      pack3Preco,
      pack4Qtd,
      pack4Preco,
      consultorId
    );

    const atualizado = db
      .prepare(`SELECT * FROM consultores WHERE id = ?`)
      .get(consultorId);

    return NextResponse.json({
      ok: true,
      consultor: atualizado,
    });
  } catch (e: any) {
    console.error("ERRO PUT:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const consultorId = Number(id);

    if (!Number.isFinite(consultorId) || consultorId <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    db.prepare(`DELETE FROM consultores WHERE id = ?`).run(consultorId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro no servidor" },
      { status: 500 }
    );
  }
}