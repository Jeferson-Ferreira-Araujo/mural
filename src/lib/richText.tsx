import type { ReactNode } from "react";

/**
 * Texto do aviso em formato simples (nada de HTML cru, então não há como injetar código):
 *   # Título · - item de lista · **negrito** · *itálico* · [texto](link) · ![](imagem) sozinha numa linha
 * Links e imagens só aceitam "/caminho" ou "https://…".
 */
const SAFE_URL = /^(\/(?!\/)|https:\/\/)[^\s"<>()]+$/;
const IMG_LINE = /^!\[[^\]]*\]\(([^)\s]+)\)$/;
const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Linhas que são só uma imagem não se traduzem; o resto sim. */
export const isImageLine = (line: string) => {
  const m = IMG_LINE.exec(line.trim());
  return !!m && SAFE_URL.test(m[1]);
};

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{inline(m[1], k)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{m[2]}</em>);
    else if (SAFE_URL.test(m[4])) {
      const ext = !m[4].startsWith("/");
      out.push(
        <a key={k} href={m[4]} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-semibold text-[#8a5a00] underline">
          {m[3]}
        </a>,
      );
    } else out.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Mostra o texto do aviso já formatado. */
export function RichBody({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`l${blocks.length}`} className="my-2 list-disc space-y-0.5 pl-5">
        {items.map((t, i) => (
          <li key={i}>{inline(t, `l${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
  };
  text.split("\n").forEach((raw, n) => {
    const line = raw.trim();
    const img = IMG_LINE.exec(line);
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      return;
    }
    flush();
    if (!line) return;
    if (img && SAFE_URL.test(img[1])) {
      // eslint-disable-next-line @next/next/no-img-element
      blocks.push(<img key={n} src={img[1]} alt="" loading="lazy" className="mx-auto my-3 max-h-72 w-auto max-w-full rounded-lg object-contain" />);
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h3 key={n} className="font-title mt-3 text-lg leading-tight font-bold text-[#2a1c12]">
          {inline(line.slice(2), `h${n}`)}
        </h3>,
      );
    } else {
      blocks.push(
        <p key={n} className="mt-2 first:mt-0">
          {inline(line, `p${n}`)}
        </p>,
      );
    }
  });
  flush();
  return <div className="text-[15px] leading-snug text-[#3a2c1d]">{blocks}</div>;
}
