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
type Preview = { nickname: string; avatar: string | null; board: string; open: boolean; items: Item[]; displays?: { slots: number[] | null; product: string }[] };
const DISPLAY_BG: Record<string, string> = { clock: "#1d2a4a", weather: "#3f86c9", calendar: "#f4efe2", countdown: "#35205a", daycount: "#3a2a1e", book: "#5a3a24", top3: "#251f3d", poll: "#1f3d3a", bible: "#2b2f55", motivation: "#6a3b52" };

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
  if (it.sealed) return { ...base, background: "#4a3320", border: "3px solid #c9a24a", borderRadius: 8, alignItems: "center", justifyContent: "center" };
  // trancado, em segredo ou de aparelho: só uma silhueta suave, sem conteúdo
  if (it.hidden) {
    const bg = it.type === "postit" ? (NOTE[it.color ?? "yellow"] ?? "#fbe36a") : it.type === "photo" ? "#fdfcf7" : "#f5f0e2";
    return { ...base, background: bg, borderRadius: 4, padding: it.type === "photo" ? Math.round(side * 0.08) : Math.round(side * 0.14), flexDirection: "column" as const, justifyContent: it.type === "photo" ? "flex-start" : "center", gap: Math.round(side * 0.07) };
  }
  if (it.type === "postit") return { ...base, background: NOTE[it.color ?? "yellow"] ?? "#fbe36a", borderRadius: 4, padding: 8, color: "#34281a", fontSize: Math.round(side * 0.13) };
  if (it.type === "photo" || it.type === "draw") return { ...base, background: "#fdfcf7", borderRadius: 3, padding: Math.round(side * 0.08), flexDirection: "column" as const, ...(photo ? {} : {}) };
  if (it.type === "music" || it.type === "video" || it.type === "voice" || it.type === "place") return { ...base, background: "#1f232b", borderRadius: 12, alignItems: "center", justifyContent: "center" };
  return { ...base, background: "#f5f0e2", borderRadius: 3, padding: 8, color: "#243a7a", fontSize: Math.round(side * 0.12), flexDirection: "column" as const };
}

function inner(it: Item, side: number, photo: string | null) {
  if (it.sealed) return <div style={{ display: "flex", width: side * 0.3, height: side * 0.3, borderRadius: 999, background: "#c9a24a" }} />;
  if (it.hidden) {
    // sem mostrar o conteúdo: a foto vira um retrato de céu suave e o resto, linhas de texto
    if (it.type === "photo") {
      const d = dims(it, side);
      const pad = Math.round(side * 0.16);
      return <div style={{ display: "flex", width: d.w - pad, height: d.h - pad, background: "linear-gradient(160deg, #8fbfe6 0%, #cfe3d4 55%, #efc99a 100%)" }} />;
    }
    const bar = (w: string) => <div style={{ display: "flex", width: w, height: Math.max(6, Math.round(side * 0.07)), borderRadius: 99, background: "rgba(60,40,20,.2)" }} />;
    return (
      <>
        {bar("90%")}
        {bar("70%")}
        {bar("82%")}
      </>
    );
  }
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
  const BAND = 175; // faixa de baixo com o dono do mural e o logo (fica abaixo da cortiça)
  const top0 = ct - off;
  const cellW = cw / 7;
  const cellH = ch / 4;
  const side = Math.round(Math.min(cellW, cellH) * 0.78 * look.size);

  const items = (pv?.items ?? []).filter((i) => typeof i.slot === "number" && i.slot >= 0 && i.slot < 28);
  const photos = new Map<number, string | null>();
  if (pv?.open) {
    await Promise.all(items.filter((i) => (i.type === "photo" || i.type === "draw") && !i.hidden).slice(0, 8).map(async (i) => photos.set(i.slot, await remoteImage(i.src, "inside"))));
  }

  // 1) o palco: a foto do quadro com todos os pins e displays no lugar; 2) desfoque leve (a prévia é pequena e nada do conteúdo precisa ser lido); 3) a faixa com o dono e o logo por cima
  const dsp = (pv?.displays ?? []).filter((d) => Array.isArray(d.slots) && d.slots.length);
  const stage = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: "#2a1a0e", overflow: "hidden" }}>
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} width={W} height={IMG_H} style={{ position: "absolute", left: 0, top: -off }} alt="" />
        )}
        {items.map((it) => {
          const col = it.slot % 7;
          const row = Math.floor(it.slot / 7);
          const dm = dims(it, side);
          const x = cl + col * cellW + (cellW - dm.w) / 2;
          const y = top0 + row * cellH + (cellH - dm.h) / 2;
          return (
            <div key={it.slot} style={{ ...card(it, side, photos.get(it.slot) ?? null), left: x, top: y }}>
              {inner(it, side, photos.get(it.slot) ?? null)}
              {/* tachinha */}
              <div style={{ position: "absolute", top: 5, left: Math.round(dm.w / 2) - 9, width: 18, height: 18, borderRadius: 999, background: "#d62f2f", border: "2px solid #ff9a8d", boxShadow: "0 3px 5px rgba(0,0,0,.45)", display: "flex" }} />
            </div>
          );
        })}
        {dsp.map((d, i) => {
          const cols = d.slots!.map((x) => x % 7);
          const row = Math.floor(d.slots![0] / 7);
          const x0 = cl + Math.min(...cols) * cellW + 6;
          const wd = (Math.max(...cols) - Math.min(...cols) + 1) * cellW - 12;
          const y0 = top0 + row * cellH + cellH * 0.1;
          return (
            <div key={`d${i}`} style={{ position: "absolute", left: x0, top: y0, width: wd, height: cellH * 0.8, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: DISPLAY_BG[d.product] ?? "#2a2f3a", border: "3px solid rgba(255,255,255,.55)", boxShadow: "0 8px 16px rgba(0,0,0,.5)" }}>
              <div style={{ display: "flex", width: "46%", height: Math.max(10, Math.round(cellH * 0.12)), borderRadius: 99, background: d.product === "calendar" ? "rgba(60,40,20,.35)" : "rgba(255,255,255,.55)" }} />
            </div>
          );
        })}
      </div>
    ),
    { width: W, height: H },
  );
  let stageUrl: string | null = null;
  try {
    const sharp = (await import("sharp")).default;
    const blurred = await sharp(Buffer.from(await stage.arrayBuffer())).blur(2.2).jpeg({ quality: 80 }).toBuffer();
    stageUrl = `data:image/jpeg;base64,${blurred.toString("base64")}`;
  } catch {
    stageUrl = null;
  }
  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: "#2a1a0e", overflow: "hidden", fontFamily: "sans-serif" }}>
        {stageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stageUrl} width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
        )}
        {/* faixa de baixo: quem é o dono, o convite e o logo, grandes para serem lidos na miniatura */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAND + 30, display: "flex", background: "linear-gradient(to top, rgba(18,9,3,.97) 0%, rgba(18,9,3,.92) 65%, rgba(18,9,3,0) 100%)" }} />
        <div style={{ position: "absolute", left: 48, right: 48, bottom: 22, height: 130, display: "flex", alignItems: "center" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={112} height={112} style={{ borderRadius: 999, border: "5px solid #fbf6ea", objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ width: 112, height: 112, borderRadius: 999, background: "#d98a2b", border: "5px solid #fbf6ea", color: "#fff", fontSize: 66, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {owner.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 30, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700, color: "#fff7e6", lineHeight: 1.05 }}>{`@${owner}`}</div>
            <div style={{ display: "flex", fontSize: 32, color: "#f1dfbd", marginTop: 8, whiteSpace: "nowrap" }}>{SITE_HOST}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={173} height={130} alt="" />
            )}
          </div>
        </div>
        <div style={{ position: "absolute", right: 48, top: 22, display: "flex", fontSize: 26, fontWeight: 700, color: "#2a1c12", background: "#f6c63c", padding: "8px 20px", borderRadius: 99, boxShadow: "0 4px 10px rgba(0,0,0,.4)" }}>{SITE_HOST}</div>
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
