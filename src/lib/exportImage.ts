import { toBlob } from "html-to-image";

/** O quadro (aspecto 3:2) que está visível agora: o desktop e o celular existem juntos no HTML, mas só um deles tem tamanho. */
export function visibleBoardElement(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-board-capture]"));
  return all.find((el) => el.offsetWidth > 0 && el.getClientRects().length > 0) ?? null;
}

/**
 * Desenha o quadro inteiro (fundo, pins e botons) numa imagem PNG, sem os marcadores de "espaço livre".
 * `width` é a largura final em pixels (a altura segue a proporção 3:2): 3000 × 2000 dá uma imagem nítida para redes sociais.
 */
export async function boardToPng(el: HTMLElement, width = 3000): Promise<Blob> {
  // cortina por cima da tela durante a captura: o quadro muda de lugar por alguns segundos e a pessoa não precisa ver isso
  const veil = document.createElement("div");
  veil.setAttribute("role", "status");
  veil.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(42,26,14,.94);color:#f7f0dd;font:600 18px system-ui,sans-serif;text-align:center;padding:24px";
  veil.textContent = "Gerando a imagem do mural…";
  document.body.appendChild(veil);
  el.setAttribute("data-exporting", "");
  // o quadro fica centralizado no mural por left/top 50% + translate -50%: para a imagem, ele vai para o canto (0,0) só durante a captura
  const prev = { left: el.style.left, top: el.style.top, translate: el.style.translate, transform: el.style.transform };
  el.style.left = "0px";
  el.style.top = "0px";
  el.style.translate = "none";
  el.style.transform = "none";
  try {
    await document.fonts?.ready;
    // dá um respiro para o navegador aplicar o estilo de exportação antes de copiar
    await new Promise((r) => setTimeout(r, 60));
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const capture = toBlob(el, {
      pixelRatio: width / w,
      width: w,
      height: h,
      backgroundColor: "#3b2616",
    });
    // nunca fica girando para sempre (ex.: aba em segundo plano ou imagem externa que não responde)
    const blob = await Promise.race([capture, new Promise<null>((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), 90_000))]);
    if (!blob) throw new Error("sem imagem");
    return blob;
  } finally {
    el.style.left = prev.left;
    el.style.top = prev.top;
    el.style.translate = prev.translate;
    el.style.transform = prev.transform;
    el.removeAttribute("data-exporting");
    veil.remove();
  }
}

/**
 * Entrega a imagem: no celular/tablet abre o menu de compartilhar (dá para postar direto ou salvar na galeria);
 * no computador baixa o arquivo.
 */
export async function deliverPng(blob: Blob, name: string): Promise<"shared" | "downloaded" | "canceled"> {
  const file = new File([blob], `${name}.png`, { type: "image/png" });
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Meu mural no Pinz" });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "canceled";
      // sem permissão de compartilhar: cai para o download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
