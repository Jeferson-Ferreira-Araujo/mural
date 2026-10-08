import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { boardById } from "@/lib/boards";
import { SITE_HOST } from "@/lib/mural";

export const alt = "Mural no Pinz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;
const IMG_H = 800; // o fundo é 1200×800 (3:2) e a prévia mostra a faixa central

type Item = { slot: number; ratio?: number; type?: string; hidden?: boolean; sealed?: boolean; color?: string; text?: string; title?: string; caption?: string; src?: string; items?: { text: string }[] };
type Preview = { nickname: string; avatar: string | null; board: string; open: boolean; items: Item[] };

const NOTE: Record<string, string> = { yellow: "#fbe36a", pink: "#f7a8c0", green: "#b9e08a", orange: "#fbbd78", blue: "#a9d8f0" };
const clean = (s: unknown, n: number) => String(s ?? "").replace(/[^ -ɏ]/g, "").trim().slice(0, n);

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

/** Foto de fora (perfil ou pin): baixa, reduz para um quadrado pequeno em JPG (aceita WebP, HEIC já convertido etc.) e devolve como data URL. Falhou? null (vira um quadrado cinza). */
async function remoteImage(url?: string | null, fit: "cover" | "inside" = "cover"): Promise<string | null> {
  if (!url || !url.startsWith("https://")) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok || !r.headers.get("content-type")?.startsWith("image/")) return null;
    const input = Buffer.from(await r.arrayBuffer());
    if (input.length > 10_000_000) return null;
    const sharp = (await import("sharp")).default;
    const out = await sharp(input).rotate().resize(300, 300, { fit }).jpeg({ quality: 72 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Largura e altura do cartão: a foto segue a proporção (lado maior = tamanho padrão), igual ao pin do mural. */
function dims(it: Item, side: number) {
  const r = it.type === "photo" && it.ratio ? Math.min(2, Math.max(0.5, it.ratio)) : 1;
  const w = Math.min(12.2, 14 * r) / 12.2; // mesma regra do pin: largura até 12,2 e altura até 14 (em unidades do quadro padrão)
  return { w: Math.round(side * w), h: Math.round((side * w) / r) };
}

function card(it: Item, side: number, photo: string | null) {
  const rot = ((it.slot * 37) % 7) - 3;
  const { w, h } = dims(it, side);
  const base = { position: "absolute" as const, display: "flex", width: w, height: h, transform: `rotate(${rot}deg)`, overflow: "hidden", boxShadow: "0 6px 14px rgba(20,8,0,.45)" };
  if (it.sealed) return { ...base, background: "#3b2616", borderRadius: 8, opacity: 0.85 };
  // trancado, em segredo ou de aparelho: só uma silhueta suave, sem conteúdo
  if (it.hidden) {
    const bg = it.type === "postit" ? (NOTE[it.color ?? "yellow"] ?? "#fbe36a") : it.type === "photo" ? "#fdfcf7" : "#f5f0e2";
    return { ...base, background: bg, opacity: 0.55, borderRadius: 6, boxShadow: "0 0 18px 8px rgba(255,255,255,.4)" };
  }
  if (it.type === "postit") return { ...base, background: NOTE[it.color ?? "yellow"] ?? "#fbe36a", borderRadius: 4, padding: 8, color: "#34281a", fontSize: Math.round(side * 0.13) };
  if (it.type === "photo" || it.type === "draw") return { ...base, background: "#fdfcf7", borderRadius: 3, padding: Math.round(side * 0.08), flexDirection: "column" as const, ...(photo ? {} : {}) };
  if (it.type === "music" || it.type === "video" || it.type === "voice" || it.type === "place") return { ...base, background: "#1f232b", borderRadius: 12, alignItems: "center", justifyContent: "center" };
  return { ...base, background: "#f5f0e2", borderRadius: 3, padding: 8, color: "#243a7a", fontSize: Math.round(side * 0.12), flexDirection: "column" as const };
}

function inner(it: Item, side: number, photo: string | null) {
  if (it.hidden || it.sealed) return null;
  if (it.type === "postit") return clean(it.text, 60);
  if (it.type === "photo" || it.type === "draw") {
    const d = dims(it, side);
    const pad = Math.round(side * 0.16);
    const iw = d.w - pad;
    const ih = d.h - pad;
    return photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} width={iw} height={ih} style={{ objectFit: "cover" }} alt="" />
    ) : (
      <div style={{ width: iw, height: ih, background: "#c9c2b4", display: "flex" }} />
    );
  }
  if (it.type === "music" || it.type === "video" || it.type === "voice" || it.type === "place") {
    return <div style={{ width: side * 0.38, height: side * 0.38, borderRadius: 999, background: "#e9e5df", display: "flex" }} />;
  }
  if (it.type === "list") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontWeight: 700 }}>{clean(it.title, 18)}</div>
        {(it.items ?? []).slice(0, 3).map((x, i) => (
          <div key={i} style={{ display: "flex", marginTop: 2 }}>{`- ${clean(x.text, 16)}`}</div>
        ))}
      </div>
    );
  }
  return clean(it.text, 80);
}

async function build(nick: string, slug: string): Promise<ArrayBuffer> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false } });
  const { data } = await sb.rpc("get_share_preview", { p_nick: nick, p_slug: slug });
  const pv = (data ?? null) as Preview | null;
  const owner = pv?.nickname ?? nick;
  const look = boardById(pv?.board);

  const [bg, logo, avatar] = await Promise.all([localAsset(`${look.id}.jpg`), localAsset("logo.png"), remoteImage(pv?.avatar)]);

  // geometria: a área útil do quadro (cork) dividida em 7 × 4 espaços, centralizada na faixa de 630 px
  const cw = (look.cork.width / 100) * W;
  const ch = (look.cork.height / 100) * IMG_H;
  const cl = (look.cork.left / 100) * W;
  const ct = (look.cork.top / 100) * IMG_H;
  const off = Math.max(0, Math.min(IMG_H - H, ct - (H - ch) / 2));
  const cellW = cw / 7;
  const cellH = ch / 4;
  const side = Math.round(Math.min(cellW, cellH) * 0.78 * look.size);

  const items = (pv?.items ?? []).filter((i) => typeof i.slot === "number" && i.slot >= 0 && i.slot < 28);
  const photos = new Map<number, string | null>();
  if (pv?.open) {
    await Promise.all(items.filter((i) => (i.type === "photo" || i.type === "draw") && !i.hidden).slice(0, 8).map(async (i) => photos.set(i.slot, await remoteImage(i.src, "inside"))));
  }

  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: "#2a1a0e", overflow: "hidden", fontFamily: "sans-serif" }}>
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} width={W} height={IMG_H} style={{ position: "absolute", left: 0, top: -off }} alt="" />
        )}
        {items.map((it) => {
          const col = it.slot % 7;
          const row = Math.floor(it.slot / 7);
          const dm = dims(it, side);
          const x = cl + col * cellW + (cellW - dm.w) / 2;
          const y = ct - off + row * cellH + (cellH - dm.h) / 2;
          return (
            <div key={it.slot} style={{ ...card(it, side, photos.get(it.slot) ?? null), left: x, top: y }}>
              {inner(it, side, photos.get(it.slot) ?? null)}
            </div>
          );
        })}
        {/* cartão de quem é o mural */}
        <div style={{ position: "absolute", left: 36, bottom: 30, width: 720, height: 128, display: "flex", alignItems: "center", background: "#fbf6ea", border: "3px solid #e6d8bd", borderRadius: 28, padding: "0 28px", boxShadow: "0 12px 30px rgba(0,0,0,.55)" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={84} height={84} style={{ borderRadius: 999, border: "4px solid #fff", objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ width: 84, height: 84, borderRadius: 999, background: "#d98a2b", border: "4px solid #fff", color: "#fff", fontSize: 44, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {owner.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 22, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#2f2218" }}>{`@${owner}`}</div>
            <div style={{ display: "flex", fontSize: 25, color: "#4a3826", marginTop: 4, whiteSpace: "nowrap" }}>Deixe um recado no meu mural</div>
          </div>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={120} height={90} alt="" />
          )}
        </div>
        <div style={{ position: "absolute", right: 28, bottom: 18, display: "flex", fontSize: 22, color: "#f6efe2", textShadow: "0 2px 4px rgba(0,0,0,.7)" }}>{SITE_HOST}</div>
      </div>
    ),
    { width: W, height: H },
  );
  // WhatsApp e outros ignoram prévias acima de ~300 KB (mostram só o logo): o PNG do gerador tem ~1 MB, o JPG fica em poucas dezenas de KB
  const png = Buffer.from(await res.arrayBuffer());
  try {
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(png).flatten({ background: "#2a1a0e" }).jpeg({ quality: 76, mozjpeg: true }).toBuffer();
    return new Uint8Array(jpg).buffer as ArrayBuffer;
  } catch {
    return new Uint8Array(png).buffer as ArrayBuffer;
  }
}

export default async function Image({ params }: { params: Promise<{ nick: string; slug: string }> }) {
  const p = await params;
  const nick = decodeURIComponent(p.nick).toLowerCase();
  const slug = decodeURIComponent(p.slug).toLowerCase();
  const key = `${nick}/${slug}`;
  const hit = cache.get(key);
  const headers = { "Content-Type": "image/jpeg", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" };
  if (hit && Date.now() - hit.at < TTL) return new Response(hit.buf, { headers });
  const buf = await build(nick, slug);
  if (cache.size > 200) cache.clear();
  cache.set(key, { at: Date.now(), buf });
  return new Response(buf, { headers });
}
