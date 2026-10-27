import { NextResponse } from "next/server";
import { adminClient } from "@/lib/mercadopago";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Alert = { kind: "site_down" | "site_back" | "pay_error" | "error_spike"; detail: string; count?: number };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const COPY: Record<Alert["kind"], (a: Alert) => { subject: string; lines: string[] }> = {
  site_down: (a) => ({ subject: "🔴 Pinz fora do ar", lines: ["As duas últimas checagens (a cada minuto) falharam.", `Motivo: ${a.detail}`] }),
  site_back: () => ({ subject: "🟢 Pinz voltou ao ar", lines: ["A última checagem respondeu normalmente."] }),
  pay_error: (a) => ({ subject: "💳 Erro em pagamento no Pinz", lines: [`${a.count} ocorrência(s) nos últimos 30 minutos. Pode haver compra paga sem liberar acesso.`, `Último erro: ${a.detail}`, "Veja os detalhes em /admin/status."] }),
  error_spike: (a) => ({ subject: "⚠️ Onda de erros no Pinz", lines: [`${a.count} erros nos últimos 15 minutos.`, `Último erro: ${a.detail}`, "Veja os detalhes em /admin/status."] }),
};

/**
 * Chamada a cada minuto pelo agendador do banco (pg_cron), só com o segredo certo.
 * O banco decide quais avisos valem agora (claim_alerts: cada ocorrência sai uma vez) e esta rota manda o e-mail aos administradores.
 */
export async function POST(req: Request) {
  const given = req.headers.get("x-cron-secret") ?? "";
  const db = adminClient();
  const { data: okSecret } = given ? await db.rpc("check_cron_secret", { p_secret: given }) : { data: false };
  if (okSecret !== true) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await db.rpc("claim_alerts");
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const { alerts, to } = (data ?? { alerts: [], to: [] }) as { alerts: Alert[]; to: string[] };

  let sent = 0;
  for (const a of alerts) {
    const c = COPY[a.kind]?.(a);
    if (!c) continue;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;padding:16px;color:#2a1c12"><h1 style="font-size:18px">${esc(c.subject)}</h1>${c.lines.map((l) => `<p style="margin:6px 0">${esc(l)}</p>`).join("")}<p><a href="https://pinz.digital/admin/status">Abrir o painel de status</a></p></div>`;
    for (const addr of to) if (await sendMail({ to: addr, subject: c.subject, html, text: `${c.subject}\n\n${c.lines.join("\n")}\n\nhttps://pinz.digital/admin/status` })) sent += 1;
  }
  return NextResponse.json({ alerts: alerts.length, sent });
}
