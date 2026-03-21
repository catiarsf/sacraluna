import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Sem ficheiro" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFileName = file.name.replace(/\s+/g, "-");
    const fileName = `${Date.now()}-${safeFileName}`;

    // 👇 NOVO CAMINHO (IMPORTANTE)
    const uploadDir = path.join(process.cwd(), "public", "uploads", "consultores");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadPath = path.join(uploadDir, fileName);

    fs.writeFileSync(uploadPath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/consultores/${fileName}`, // 👈 também mudou
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha no upload", detail: String(err) },
      { status: 500 }
    );
  }
}