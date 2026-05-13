export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY no .env.local");
  }

  return new Stripe(secretKey);
}

function makePedidoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function norm(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const sessionUser = await getSession();
    const user = sessionUser?.user;

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Tens de iniciar sessão para comprar este serviço." },
        { status: 401 }
      );
    }

    if (user.role !== "cliente") {
      return NextResponse.json(
        { ok: false, error: "Apenas clientes podem comprar serviços." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const servicoId = Number(body?.servico_id ?? 0);
    const nomeCliente = norm(body?.nome_cliente || (user as any)?.nome);
    const emailCliente = norm(body?.email_cliente || (user as any)?.email);
    const telefoneCliente = norm(body?.telefone_cliente || (user as any)?.telefone);
    const notas = norm(body?.notas);

    if (!Number.isFinite(servicoId) || servicoId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Serviço inválido." },
        { status: 400 }
      );
    }

    if (!nomeCliente) {
      return NextResponse.json(
        { ok: false, error: "O nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!emailCliente || !emailCliente.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    if (!telefoneCliente) {
      return NextResponse.json(
        { ok: false, error: "O telefone/WhatsApp é obrigatório." },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      return NextResponse.json(
        { ok: false, error: "Falta NEXT_PUBLIC_SITE_URL no .env.local" },
        { status: 500 }
      );
    }

    const servico = db
      .prepare(
        `
        SELECT
          s.id,
          s.nome,
          s.descricao,
          s.preco_tipo,
          s.preco_eur,
          s.preco_texto,
          s.consultor_id,
          s.imagem_url,
          s.ativo,
          c.nome AS consultor_nome
        FROM servicos s
        LEFT JOIN consultores c ON c.id = s.consultor_id
        WHERE s.id = ?
          AND s.ativo = 1
        LIMIT 1
        `
      )
      .get(servicoId) as any;

    if (!servico) {
      return NextResponse.json(
        { ok: false, error: "Serviço não encontrado ou inativo." },
        { status: 404 }
      );
    }

    if (String(servico.preco_tipo ?? "fixo") !== "fixo") {
      return NextResponse.json(
        { ok: false, error: "Este serviço não pode ser comprado diretamente." },
        { status: 400 }
      );
    }

    if (!servico.consultor_id) {
      return NextResponse.json(
        { ok: false, error: "Este serviço não tem consultora associada." },
        { status: 400 }
      );
    }

    const preco = Number(servico.preco_eur ?? 0);

    if (!preco || preco <= 0) {
      return NextResponse.json(
        { ok: false, error: "Preço do serviço inválido." },
        { status: 400 }
      );
    }

    const pedidoId = makePedidoId();

    db.prepare(
      `
      INSERT INTO pedidos_servicos (
        id,
        servico_id,
        nome_cliente,
        email_cliente,
        telefone_cliente,
        notas,
        preco_eur,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', strftime('%s','now'))
      `
    ).run(
      pedidoId,
      servicoId,
      nomeCliente,
      emailCliente,
      telefoneCliente,
      notas,
      preco
    );

    const successUrl =
      `${siteUrl}/cliente/servicos` +
      `?payment=success&pedido=${encodeURIComponent(pedidoId)}` +
      `&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${siteUrl}/loja/${servicoId}` +
      `?payment=cancel&pedido=${encodeURIComponent(pedidoId)}`;

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: emailCliente,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: servico.nome,
              description: servico.descricao || undefined,
            },
            unit_amount: Math.round(preco * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "servico_ticket",
        pedidoId,
        servicoId: String(servicoId),
        clienteId: String(user.id),
        consultorId: String(servico.consultor_id),
        amount: String(preco),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    db.prepare(
      `
      UPDATE pedidos_servicos
      SET stripe_session_id = ?
      WHERE id = ?
      `
    ).run(stripeSession.id ?? null, pedidoId);

    return NextResponse.json({
      ok: true,
      url: stripeSession.url,
      pedido_id: pedidoId,
    });
  } catch (e: any) {
    console.error("ERRO CHECKOUT LOJA:", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Erro ao criar checkout do serviço.",
      },
      { status: 500 }
    );
  }
}