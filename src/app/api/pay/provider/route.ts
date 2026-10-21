import { NextResponse } from "next/server";
import { providerFor } from "@/lib/payProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meio de pagamento e moeda desta pessoa: Mercado Pago em reais (América Latina e Portugal) ou Stripe em dólar (demais países, quando a Stripe estiver ligada).
 * O país vem do cabeçalho da Cloudflare; sem ele (ou com a Stripe desligada) vale o Mercado Pago.
 */
export async function GET(req: Request) {
  const provider = await providerFor(req);
  return NextResponse.json({ provider, currency: provider === "stripe" ? "USD" : "BRL" }, { headers: { "Cache-Control": "private, no-store" } });
}
