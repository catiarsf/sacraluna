export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

export async function GET() {
  try {
    const consultores = db
      .prepare(
        `
        SELECT
          c.id,
          c.nome,
          c.email,
          c.telefone,
          c.preco_por_min,
          c.preco_chat,
          c.preco_voz,
          c.percentagem_ganho,
          c.foto_url,
          c.especialidades,
          c.apresentacao,
          c.ativo,
          c.destaque,
          c.online,
          c.voip_ativo,
          c.pack_1_qtd,
          c.pack_1_preco,
          c.pack_2_qtd,
          c.pack_2_preco,
          c.pack_3_qtd,
          c.pack_3_preco,
          c.pack_4_qtd,
          c.pack_4_preco,
          COALESCE(w.balance_eur, 0) AS wallet_balance_eur,
          COALESCE(w.earned_eur, 0) AS wallet_earned_eur,
          COALESCE(w.spent_eur, 0) AS wallet_spent_eur
        FROM consultores c
        LEFT JOIN wallets w
          ON w.user_type = 'consultor'
         AND w.user_id = c.id
        ORDER BY c.id DESC
        `
      )
      .all();

    return NextResponse.json({
      ok: true,
      consultores,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao carregar consultores",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const nome = norm(body?.nome);
    const email = norm(body?.email).toLowerCase();
    const telefone = norm(body?.telefone);
    const password = norm(body?.password);
    const preco = toNumber(body?.preco_por_min ?? 1);
    const precoChat = toNumber(body?.preco_chat ?? preco);
    const precoVoz = toNumber(body?.preco_voz ?? preco);
    const percentagemGanho = toNumber(body?.percentagem_ganho ?? 40);
    const foto = norm(body?.foto_url) || "/consultores/default.jpg";
    const especialidades = norm(body?.especialidades);
    const apresentacao = norm(body?.apresentacao);
    const ativo = body?.ativo ? 1 : 0;
    const destaque = body?.destaque ? 1 : 0;
    const online = body?.online ? 1 : 0;
    const voipAtivo =
      typeof body?.voip_ativo === "undefined" ? 1 : body?.voip_ativo ? 1 : 0;

    const pack1Qtd = toInt(body?.pack_1_qtd ?? 1, 1);
    const pack1Preco = toNumber(body?.pack_1_preco ?? 1);

    const pack2Qtd = toInt(body?.pack_2_qtd ?? 3, 3);
    const pack2Preco = toNumber(body?.pack_2_preco ?? 3);

    const pack3Qtd = toInt(body?.pack_3_qtd ?? 5, 5);
    const pack3Preco = toNumber(body?.pack_3_preco ?? 5);

    const pack4Qtd = toInt(body?.pack_4_qtd ?? 10, 10);
    const pack4Preco = toNumber(body?.pack_4_preco ?? 10);

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
      .prepare(`SELECT id FROM consultores WHERE lower(email) = ?`)
      .get(email) as any;

    if (emailExiste) {
      return NextResponse.json(
        { ok: false, error: "Já existe um consultor com esse email." },
        { status: 400 }
      );
    }

    if (destaque === 1) {
      const totalDestaque = db
        .prepare(`SELECT COUNT(*) as total FROM consultores WHERE destaque = 1`)
        .get() as { total: number };

      if ((totalDestaque?.total ?? 0) >= 2) {
        return NextResponse.json(
          {
            ok: false,
            error: "Já existem 2 consultores em destaque. Remove um primeiro.",
          },
          { status: 400 }
        );
      }
    }

    const result = db
      .prepare(
        `
        INSERT INTO consultores
        (
          nome,
          email,
          telefone,
          password,
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
          voip_ativo,
          pack_1_qtd,
          pack_1_preco,
          pack_2_qtd,
          pack_2_preco,
          pack_3_qtd,
          pack_3_preco,
          pack_4_qtd,
          pack_4_preco
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        nome,
        email,
        telefone,
        password,
        preco,
        precoChat,
        precoVoz,
        percentagemGanho,
        foto,
        especialidades,
        apresentacao,
        ativo,
        destaque,
        online,
        voipAtivo,
        pack1Qtd,
        pack1Preco,
        pack2Qtd,
        pack2Preco,
        pack3Qtd,
        pack3Preco,
        pack4Qtd,
        pack4Preco
      );

    const consultor = db
      .prepare(
        `
        SELECT
          c.id,
          c.nome,
          c.email,
          c.telefone,
          c.preco_por_min,
          c.preco_chat,
          c.preco_voz,
          c.percentagem_ganho,
          c.foto_url,
          c.especialidades,
          c.apresentacao,
          c.ativo,
          c.destaque,
          c.online,
          c.voip_ativo,
          c.pack_1_qtd,
          c.pack_1_preco,
          c.pack_2_qtd,
          c.pack_2_preco,
          c.pack_3_qtd,
          c.pack_3_preco,
          c.pack_4_qtd,
          c.pack_4_preco,
          0 AS wallet_balance_eur,
          0 AS wallet_earned_eur,
          0 AS wallet_spent_eur
        FROM consultores c
        WHERE c.id = ?
        `
      )
      .get(result.lastInsertRowid);

    return NextResponse.json({
      ok: true,
      consultor,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao criar consultor",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}