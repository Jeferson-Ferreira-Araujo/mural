import { toCanvas } from "html-to-image";

/** O quadro (aspecto 3:2) que está visível agora: o desktop e o celular existem juntos no HTML, mas só um deles tem tamanho. */
export function visibleBoardElement(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-board-capture]"));
  return all.find((el) => el.offsetWidth > 0 && el.getClientRects().length > 0) ?? null;
}

/** Larguras (da imagem final, já cortada na moldura) tentadas, da melhor para a mais leve: se o aparelho não aguenta, cai para a próxima. */
function widthsToTry(): number[] {
  const phone = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  return phone ? [4000, 3000, 2400] : [5600, 4400, 3400, 2400];
}

/** Moldura + cortiça do quadro (frações de 0 a 1 do quadro): a imagem final é cortada aí, sem as laterais e o piso decorativos. */
function cropOf(el: HTMLElement) {
  const [l, t, w, h] = (el.dataset.boardCrop ?? "0,0,1,1").split(",").map(Number);
  return [l, t, w, h].every(Number.isFinite) ? { l, t, w, h } : { l: 0, t: 0, w: 1, h: 1 };
}

/**
 * Desenha o quadro (moldura, pins e botons) numa imagem JPEG de alta qualidade (5600 px de largura no computador),
 * cortada na moldura (sem as laterais decorativas, para os pins ocuparem mais da imagem) e sem os marcadores de "espaço livre". Os textos são desenhados direto na resolução final (não é uma foto ampliada),
 * então dá para dar zoom e ler tudo. JPEG 95% fica com poucos MB e é o formato que as redes sociais aceitam melhor.
 */
export async function boardToImage(el: HTMLElement): Promise<Blob> {
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
    // nunca fica girando para sempre (ex.: aba em segundo plano ou imagem externa que não responde)
    const deadline = Date.now() + 120_000;
    let lastError: unknown = new Error("sem imagem");
    const crop = cropOf(el);
    for (const width of widthsToTry()) {
      try {
        const left = deadline - Date.now();
        if (left <= 0) break;
        // o quadro inteiro é desenhado numa escala em que a parte cortada tenha `width` pixels de largura
        const full = await Promise.race([
          toCanvas(el, { pixelRatio: width / (w * crop.w), width: w, height: h, backgroundColor: "#3b2616" }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), left)),
        ]);
        const cw = Math.round(full.width * crop.w);
        const ch = Math.round(full.height * crop.h);
        const out = document.createElement("canvas");
        out.width = cw;
        out.height = ch;
        const ctx = out.getContext("2d");
        if (!ctx) throw new Error("sem canvas");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(full, Math.round(full.width * crop.l), Math.round(full.height * crop.t), cw, ch, 0, 0, cw, ch);
        const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/jpeg", 0.95));
        if (blob && blob.size > 10_000) return blob;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
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
export async function deliverImage(blob: Blob, name: string): Promise<"shared" | "downloaded" | "canceled"> {
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const file = new File([blob], `${name}.${ext}`, { type: blob.type || "image/jpeg" });
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
  a.download = `${name}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
