import { NextResponse } from "next/server";

export async function POST(req: Request) {

  const { searchParams } = new URL(req.url);
  const consultorId = searchParams.get("consultor");

  // exemplo simples (depois ligamos à base de dados)
  let numero = "+351900000000";

  if (consultorId === "1") numero = "+351911111111";
  if (consultorId === "2") numero = "+351922222222";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Say>A ligar ao consultor.</Say>
<Dial>${numero}</Dial>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}