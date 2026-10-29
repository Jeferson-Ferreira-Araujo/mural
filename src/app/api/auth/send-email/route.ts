import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { authMail } from "@/lib/authMail";
import { sendMail } from "@/lib/mail";
import { adminClient } from "@/lib/mercadopago";
import { SITE_HOST } from "@/lib/mural";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HookBody = {
  user?: { id?: string; email?: string; user_metadata?: { locale?: string } };
  email_data?: { token?: string; token_hash?: string; redirect_to?: string; email_action_type?: string };
};

const refuse = (status: number, message: string) => NextResponse.json({ error: { http_code: status, message } }, { status });

/** Confere a assinatura do Supabase (padrão Standard Webhooks: id.timestamp.corpo, HMAC-SHA256 com a chave secreta do gancho). */
function validSignature(req: Request, raw: string): boolean {
  const secret = (process.env.SEND_EMAIL_HOOK_SECRET ?? "").replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
  const id = req.headers.get("webhook-id");
  const ts = req.headers.get("webhook-timestamp");
  const sigs = req.headers.get("webhook-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // mensagem velha demais
  const expected = createHmac("sha256", Buffer.from(secret, "base64")).update(`${id}.${ts}.${raw}`).digest();
  return sigs.split(" ").some((s) => {
    const got = Buffer.from(s.replace(/^v1,/, ""), "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/**
 * Gancho "Send Email" do Supabase Auth: em vez de o Supabase mandar o e-mail de confirmação ou de redefinição de senha,
 * ele chama esta rota e o Pinz envia (pelo Resend) no idioma da pessoa, com botão e, na confirmação, o código.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(req, raw)) return refuse(401, "invalid_signature");
  let body: HookBody;
  try {
    body = JSON.parse(raw) as HookBody;
  } catch {
    return refuse(400, "invalid_body");
  }
  const to = body.user?.email;
  const d = body.email_data;
  if (!to || !d?.token_hash || !d.email_action_type) return refuse(400, "invalid_data");

  // o idioma vem do cadastro; se faltar, do perfil; por último, português
  let lang: Locale = "pt";
  const fromMeta = body.user?.user_metadata?.locale;
  if (fromMeta && isLocale(fromMeta)) lang = fromMeta;
  else if (body.user?.id) {
    const { data } = await adminClient().from("profiles").select("locale").eq("user_id", body.user.id).maybeSingle();
    if (data?.locale && isLocale(data.locale)) lang = data.locale;
  }

  // o link leva ao próprio site (que confere o código no navegador): abrir o e-mail em outro aparelho ou navegador também funciona
  let origin = `https://${SITE_HOST}`;
  try {
    const u = new URL(d.redirect_to ?? "");
    if (u.hostname === SITE_HOST || u.hostname === `www.${SITE_HOST}` || u.hostname === "localhost") origin = u.origin;
  } catch {}
  const url = `${origin}/auth/callback?token_hash=${encodeURIComponent(d.token_hash)}&type=${encodeURIComponent(d.email_action_type)}`;

  const mail = authMail({ lang, kind: d.email_action_type === "recovery" ? "reset" : "confirm", url, code: d.token });
  const ok = await sendMail({ to, ...mail });
  return ok ? NextResponse.json({}) : refuse(500, "send_failed");
}
