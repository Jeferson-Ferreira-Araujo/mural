import { NextResponse } from "next/server";
import { payMode } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chave PÚBLICA do Mercado Pago do ambiente em uso (teste ou produção), para o formulário de cartão da tela.
 * É uma chave feita para ficar no navegador (não paga nem lê nada sozinha); o Access Token, que é secreto, nunca sai do servidor.
 */
export async function GET() {
  const env = await payMode();
  const key = env === "live" ? process.env.MP_PUBLIC_KEY_LIVE : process.env.MP_PUBLIC_KEY_TEST;
  if (!key || !/^[A-Za-z0-9_-]{20,80}$/.test(key)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}
