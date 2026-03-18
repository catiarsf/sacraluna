import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const cols = db.prepare("PRAGMA table_info(consultores)").all();
    return NextResponse.json({ columns: cols });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}