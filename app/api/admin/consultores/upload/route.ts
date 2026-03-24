export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Sem ficheiro" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name.replace(/\s+/g, "-");
    const publicId = `${Date.now()}-${originalName.replace(/\.[^.]+$/, "")}`;
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "sacraluna/consultores",
      public_id: publicId,
      resource_type: "image",
    });

    return NextResponse.json({
      ok: true,
      url: result.secure_url,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha no upload", detail: String(err) },
      { status: 500 }
    );
  }
}