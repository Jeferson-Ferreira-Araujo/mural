import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Chave pública (VAPID) para o navegador se inscrever nas notificações. Pública por natureza; a privada nunca sai do servidor. */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? "";
  return NextResponse.json({ key }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
