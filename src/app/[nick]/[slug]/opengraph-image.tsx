import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/lib/mural";
import { H, renderStage, W } from "@/lib/muralStage";

export const alt = "Mural no Pinz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const dynamic = "force-dynamic";

// guarda a imagem pronta por alguns minutos (as redes sociais pedem a mesma prévia várias vezes)
const cache = new Map<string, { at: number; buf: ArrayBuffer }>();
const TTL = 5 * 60_000;

async function build(nick: string, slug: string): Promise<ArrayBuffer> {
  const { owner, logo, avatar, stage, BAND } = await renderStage(nick, slug);
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
            <div style={{ display: "flex", fontSize: 32, color: "#f1dfbd", marginTop: 8, whiteSpace: "nowrap" }}>Deixe um recado no meu mural</div>
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
