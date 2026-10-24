import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STARTED_AT = Date.now();
const NSFW_URL = process.env.NSFW_URL ?? "http://nsfw-check:8080";

type Check = { ok: boolean; ms: number; reason?: string };

/** Roda uma verificação com limite de tempo; nunca lança erro: falhou, volta com o motivo (sem detalhes internos). */
async function check(fn: () => Promise<void>, timeoutMs = 4000): Promise<Check> {
  const t0 = Date.now();
  try {
    await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs))]);
    return { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    const m = e instanceof Error ? e.message : "erro";
    return { ok: false, ms: Date.now() - t0, reason: m === "timeout" ? "não respondeu a tempo" : m.slice(0, 120) };
  }
}

/**
 * Estado do Pinz, aberto a qualquer um (sem dados pessoais nem segredos).
 * - "ok": tudo funcionando; "degraded": o site responde, mas uma parte (ex.: verificador de imagens) está fora; "down": o site não consegue usar o banco de dados (503).
 * - uptime: há quanto tempo este servidor está de pé; history: a disponibilidade medida de fora, a cada minuto, pelo banco de dados (mostra até quedas em que o próprio site não pôde responder).
 */
export async function GET() {
  const db = adminClient();
  const [database, images] = await Promise.all([
    check(async () => {
      const { error } = await db.from("app_settings").select("key").limit(1);
      if (error) throw new Error("banco de dados indisponível");
    }),
    check(async () => {
      const r = await fetch(`${NSFW_URL}/health`, { cache: "no-store" });
      if (!r.ok) throw new Error(`verificador de imagens respondeu ${r.status}`);
    }, 2500),
  ]);
  const status = !database.ok ? "down" : !images.ok ? "degraded" : "ok";
  const reasons = [!database.ok ? `banco de dados: ${database.reason}` : null, !images.ok ? `verificador de imagens: ${images.reason}` : null].filter(Boolean) as string[];

  let history: unknown = null;
  if (database.ok) {
    const { data } = await db.rpc("uptime_summary");
    history = data ?? null;
  }
  const up = Math.floor((Date.now() - STARTED_AT) / 1000);
  return NextResponse.json(
    {
      status,
      reasons,
      checkedAt: new Date().toISOString(),
      server: { startedAt: new Date(STARTED_AT).toISOString(), uptimeSeconds: up, uptime: `${Math.floor(up / 86400)}d ${Math.floor((up % 86400) / 3600)}h ${Math.floor((up % 3600) / 60)}min`, node: process.version },
      checks: { database, images },
      history,
    },
    { status: status === "down" ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
