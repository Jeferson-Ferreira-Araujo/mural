import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_HOST } from "@/lib/mural";

export const alt = "Perfil no Pinz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

type Summary = { nickname: string; avatar: string | null; plus: boolean };

// guarda a imagem pronta por alguns minutos (as redes sociais pedem a mesma prévia várias vezes)
const cache = new Map<string, { at: number; buf: ArrayBuffer }>();
const TTL = 5 * 60_000;

async function localAsset(name: string): Promise<string | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "img", "og", name));
    return `data:${name.endsWith(".png") ? "image/png" : "image/jpeg"};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Foto de perfil: baixa, reduz para um quadrado pequeno em JPG e devolve como data URL. Falhou? null (vira a inicial do nome). */
async function remoteImage(url?: string | null): Promise<string | null> {
  if (!url || !url.startsWith("https://")) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok || !r.headers.get("content-type")?.startsWith("image/")) return null;
    const input = Buffer.from(await r.arrayBuffer());
    if (input.length > 10_000_000) return null;
    const sharp = (await import("sharp")).default;
    const out = await sharp(input).rotate().resize(360, 360, { fit: "cover" }).jpeg({ quality: 78 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

async function build(nick: string): Promise<ArrayBuffer> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false } });
  const { data } = await sb.rpc("get_profile_summary", { p_nick: nick });
  const pv = (data ?? null) as Summary | null;
  const owner = pv?.nickname ?? nick;
  const [bg, logo, avatar] = await Promise.all([localAsset("cortica.jpg"), localAsset("logo.png"), remoteImage(pv?.avatar)]);

  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: "#2a1a0e", overflow: "hidden", fontFamily: "sans-serif", alignItems: "center", justifyContent: "center" }}>
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} width={W} height={800} style={{ position: "absolute", left: 0, top: -85 }} alt="" />
        )}
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: "rgba(18,9,3,.55)", display: "flex" }} />
        {/* cartão de visita */}
        <div style={{ position: "relative", width: 900, height: 430, background: "#fbf3e1", borderRadius: 44, display: "flex", alignItems: "center", padding: "0 56px", boxShadow: "0 20px 50px rgba(0,0,0,.55)" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={250} height={250} style={{ width: 250, height: 250, borderRadius: 999, objectFit: "cover", border: `${pv?.plus ? 12 : 8}px solid ${pv?.plus ? "#f2b81c" : "#ffffff"}` }} alt="" />
          ) : (
            <div style={{ width: 250, height: 250, borderRadius: 999, background: "#d98a2b", color: "#fff", fontSize: 120, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "8px solid #fff" }}>{owner.slice(0, 1).toUpperCase()}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 30, color: "#8a7b69", fontWeight: 700 }}>PERFIL NO PINZ</div>
            <div style={{ display: "flex", fontSize: owner.length > 14 ? 56 : 72, fontWeight: 700, color: "#2f2218", lineHeight: 1.05, marginTop: 6 }}>{`@${owner}`}</div>
            {pv?.plus && (
              <div style={{ display: "flex", marginTop: 16 }}>
                <div style={{ display: "flex", background: "#f2b81c", color: "#2a1c12", fontSize: 30, fontWeight: 800, padding: "6px 22px", borderRadius: 16 }}>PINZ+</div>
              </div>
            )}
            <div style={{ display: "flex", fontSize: 28, color: "#4a3826", marginTop: 22 }}>Veja os murais e deixe um recado</div>
          </div>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={170} height={128} alt="" style={{ position: "absolute", right: 36, top: 28 }} />
          )}
        </div>
        <div style={{ position: "absolute", right: 36, bottom: 24, display: "flex", fontSize: 26, color: "#f6efe2", fontWeight: 700 }}>{SITE_HOST}</div>
      </div>
    ),
    { width: W, height: H },
  );
  // WhatsApp e outros ignoram prévias acima de ~300 KB: JPG leve
  const png = Buffer.from(await res.arrayBuffer());
  try {
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(png).flatten({ background: "#2a1a0e" }).jpeg({ quality: 76, mozjpeg: true }).toBuffer();
    return new Uint8Array(jpg).buffer as ArrayBuffer;
  } catch {
    return new Uint8Array(png).buffer as ArrayBuffer;
  }
}

export default async function Image({ params }: { params: Promise<{ nick: string }> }) {
  const nick = decodeURIComponent((await params).nick).toLowerCase();
  const headers = { "Content-Type": "image/jpeg", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" };
  const hit = cache.get(nick);
  if (hit && Date.now() - hit.at < TTL) return new Response(hit.buf, { headers });
  const buf = await build(nick);
  if (cache.size > 200) cache.clear();
  cache.set(nick, { at: Date.now(), buf });
  return new Response(buf, { headers });
}
