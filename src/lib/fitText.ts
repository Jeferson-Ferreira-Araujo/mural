/** Largura estimada do texto em "em" de fonte 1 (letra latina ~0,5; chinês, japonês, coreano e tailandês ocupam cerca de 1). */
function widthEm(text: string): number {
  let u = 0;
  for (const ch of text) u += (ch.codePointAt(0) ?? 0) >= 0x0e00 ? 1 : 0.5;
  return u;
}

/**
 * Maior tamanho de letra (em `em`) em que o texto cabe numa área de `w` × `h` em, de `max` até `min`.
 * `lh` é a altura de linha (múltiplo do tamanho) e `hand` o fator da letra manuscrita escolhida. Se nem o menor couber, devolve o menor.
 */
export function fitSize(text: string, { w, h, lh, max, min, hand = 1, lineEm }: { w: number; h: number; lh: number; max: number; min: number; hand?: number; /** altura de linha fixa, em em (papel pautado) */ lineEm?: number }): number {
  const total = widthEm(text) + (text.split("\n").length - 1) * 4; // quebra de linha explícita custa uma linha inteira, em média
  for (let s = max; s > min + 0.001; s -= 0.05) {
    const size = s * hand;
    const lines = Math.max(1, Math.ceil(((total * size) / w) * 1.18)); // 18% a mais: palavras inteiras não aproveitam o fim da linha
    if (lines * (lineEm ?? lh * size) <= h) return s;
  }
  return min;
}
