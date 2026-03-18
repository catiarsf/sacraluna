import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY no .env.local");
}

const stripe = new Stripe(secretKey);

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
    const body = await req.json().catch(() => ({}));

    const servicoId = Number(body?.servico_id ?? 0);
    const nomeCliente = norm(body?.nome_cliente);
    const emailCliente = norm(body?.email_cliente);
    const telefoneCliente = norm(body?.telefone_cliente);
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

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json(
        { ok: false, error: "Falta NEXT_PUBLIC_SITE_URL no .env.local" },
        { status: 500 }
      );
    }

    const servico = db
      .prepare(
        `
        SELECT
          id,
          nome,
          descricao,
          preco_eur,
          imagem_url,
          ativo
        FROM servicos
        WHERE id = ? AND ativo = 1
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
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente')
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
      `${process.env.NEXT_PUBLIC_SITE_URL}/loja/${servicoId}` +
      `?payment=success&pedido=${pedidoId}&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${process.env.NEXT_PUBLIC_SITE_URL}/loja/${servicoId}` +
      `?payment=cancel&pedido=${pedidoId}`;

    const session = await stripe.checkout.sessions.create({
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
        kind: "servico",
        pedidoId,
        servicoId: String(servicoId),
        nomeCliente,
        emailCliente,
        telefoneCliente,
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
    ).run(session.id ?? null, pedidoId);

    return NextResponse.json({
      ok: true,
      url: session.url,
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