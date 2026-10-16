import { NextResponse } from "next/server";
import { renderStage } from "@/lib/muralStage";

export const dynamic = "force-dynamic";

/** Miniatura do mural como ele está (fundo, pins e displays no lugar, sem desfoque nem faixa), para a lista "Meus murais". Só mostra o que a prévia pública já mostra. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const nick = (u.searchParams.get("nick") ?? "").toLowerCase().slice(0, 40);
  const slug = (u.searchParams.get("slug") ?? "").toLowerCase().slice(0, 80);
  if (!/^[a-z0-9._-]+$/.test(nick) || !/^[a-z0-9._-]+$/.test(slug)) return new NextResponse(null, { status: 400 });
  try {
    const { stage } = await renderStage(nick, slug);
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(Buffer.from(await stage.arrayBuffer())).resize(540, 360, { fit: "cover", position: "centre" }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    return new NextResponse(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=60" } });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
