import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Sem ficheiro" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = Date.now() + "-" + file.name;
    const uploadPath = path.join(process.cwd(), "public", "consultores", fileName);

    fs.writeFileSync(uploadPath, buffer);

    return NextResponse.json({
      url: "/consultores/" + fileName
    });

  } catch (err) {
    return NextResponse.json(
      { error: "Falha no upload", detail: String(err) },
      { status: 500 }
    );
  }
}