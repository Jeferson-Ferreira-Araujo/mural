/**
 * Retângulo "de verdade" de um pin colado no mural, na tela: o cartão mais a tachinha (que sai um pouco por cima) e uma folguinha ao redor.
 * É com ele que se confere se um pin, um display ou um botton fica sobre outro: o cartão sozinho deixava a tachinha entrar debaixo do vizinho.
 */
export function pinBox(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
  const em = (parseFloat(getComputedStyle(el).fontSize) || 10) * k; // tamanho de 1em na tela (com o zoom)
  return { left: r.left - 0.3 * em, right: r.right + 0.3 * em, top: r.top - 1 * em, bottom: r.bottom + 0.3 * em, em };
}

/** O retângulo de um pin que vai ser colocado em `full` (o cartão), com a tachinha e a folga. */
export function paddedBox(full: { left: number; right: number; top: number; bottom: number }, em: number) {
  return { left: full.left - 0.3 * em, right: full.right + 0.3 * em, top: full.top - 1 * em, bottom: full.bottom + 0.3 * em };
}
