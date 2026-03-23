export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getOrCreateWallet } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ userType: string; userId: string }> }
) {
  try {
    const params = await context.params;
    const userType = String(params.userType || "").trim();
    const userId = Number(params.userId || 0);

    if (!["cliente", "consultor"].includes(userType)) {
      return NextResponse.json(
        { ok: false, error: "userType inválido." },
        { status: 400 }
      );
    }

    if (!userId || userId <= 0) {
      return NextResponse.json(
        { ok: false, error: "userId inválido." },
        { status: 400 }
      );
    }

    const wallet = getOrCreateWallet(userType, userId);

    return NextResponse.json({
      ok: true,
      wallet: {
        id: wallet.id,
        user_type: wallet.user_type,
        user_id: wallet.user_id,
        balance_eur: wallet.balance_eur,
        earned_eur: wallet.earned_eur,
        spent_eur: wallet.spent_eur,
        updated_at: wallet.updated_at,
      },
    });
  } catch (e: any) {
    console.error("ERRO GET WALLET:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao ler wallet." },
      { status: 500 }
    );
  }
}