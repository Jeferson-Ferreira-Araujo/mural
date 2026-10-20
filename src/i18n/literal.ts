import { useTranslations } from "next-intl";

/**
 * Textos que ficam em constantes fora dos componentes (mensagens de erro de src/lib, nomes de bottons, categorias…) continuam escritos em português
 * no código. Na hora de mostrar, `tl(texto)` procura a tradução desse texto no catálogo (namespace "lit", chave = hash do texto em português).
 * Sem tradução (ou em português), devolve o próprio texto. Por isso é seguro passar qualquer string por `tl`.
 */
export function litKey(s: string): string {
  let h = 0x811c9dc5; // FNV-1a de 32 bits
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "h" + h.toString(36);
}

/** Para componentes (cliente ou servidor sem async): `const tl = useLit(); tl("Texto em português")`. */
export function useLit(): (s: string) => string {
  const t = useTranslations("lit");
  return (s: string) => (s && t.has(litKey(s)) ? t(litKey(s)) : s);
}
