import { NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chave pública da Stripe (pk_...): feita para ficar no navegador, é o que o Stripe.js precisa para abrir o pagamento dentro do Pinz. Vem do .env do servidor. */
export async function GET() {
  const key = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
  if (!stripeConfigured() || !/^pk_(test|live)_/.test(key)) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ publishableKey: key }, { headers: { "Cache-Control": "private, max-age=300" } });
}
