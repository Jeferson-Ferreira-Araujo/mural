/**
 * Links de música/vídeo que tocam DENTRO da página (iframe oficial do serviço).
 * Só reconhecemos endereços conhecidos e extraímos apenas o ID: nunca usamos o link da pessoa direto no iframe.
 */
export type Embed = { provider: "youtube" | "spotify"; src: string; /** ID do vídeo (só YouTube) */ id?: string; /** altura do player em relação à largura do card */ kind: "video" | "audio" };

const YT_ID = /^[\w-]{11}$/;

export function embedFor(link?: string): Embed | null {
  if (!link) return null;
  let u: URL;
  try {
    u = new URL(link.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");

  // YouTube: youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com") {
    id = u.searchParams.get("v");
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
    if (!id && m) id = m[1];
  }
  if (id && YT_ID.test(id)) {
    return { provider: "youtube", kind: "video", id, src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0` };
  }

  // Spotify: open.spotify.com/(intl-xx/)track|album|playlist|episode|show/ID
  if (host === "open.spotify.com") {
    const m = u.pathname.match(/\/(track|album|playlist|episode|show)\/([A-Za-z0-9]{10,30})/);
    if (m) return { provider: "spotify", kind: "audio", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=pinz` };
  }
  return null;
}
