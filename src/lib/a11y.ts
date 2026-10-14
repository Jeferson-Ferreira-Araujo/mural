/**
 * Acessibilidade do site: daltonismo (correção de cores), tamanho do texto, contraste alto, fonte de leitura fácil, mais espaço entre letras e linhas
 * e menos animações. A escolha fica guardada neste aparelho (localStorage) e vale em todas as telas, antes mesmo de entrar na conta.
 */
export type ColorMode = "none" | "protan" | "deutan" | "tritan" | "mono";
export type A11y = {
  color: ColorMode;
  /** 0 = normal, 1 = grande */
  text: 0 | 1;
  contrast: boolean;
  /** fonte desenhada para ser lida com facilidade (Atkinson Hyperlegible) */
  font: boolean;
  spacing: boolean;
  /** menos animações */
  calm: boolean;
};

export const A11Y_KEY = "pinz:a11y";
export const A11Y_OPEN_EVENT = "pinz:open-a11y";
export const A11Y_DEFAULT: A11y = { color: "none", text: 0, contrast: false, font: false, spacing: false, calm: false };

export function loadA11y(): A11y {
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<A11y>) : null;
    const base = { ...A11Y_DEFAULT, ...(v ?? {}) };
    // sem escolha guardada, quem pediu "reduzir movimento" no aparelho já começa com menos animações
    if (!v && typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) base.calm = true;
    if (base.text > 1) base.text = 1; // o antigo "muito grande" virou "grande"
    return base;
  } catch {
    return { ...A11Y_DEFAULT };
  }
}

export function saveA11y(s: A11y) {
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

const TEXT_SIZE = ["100%", "118%"] as const;

/** Põe a escolha na página: atributos no <html> (que o CSS lê), o tamanho do texto e o filtro de cores. */
export function applyA11y(s: A11y) {
  const el = document.documentElement;
  el.dataset.a11yFont = s.font ? "1" : "";
  el.dataset.a11ySpacing = s.spacing ? "1" : "";
  el.dataset.a11yCalm = s.calm ? "1" : "";
  el.dataset.a11yContrast = s.contrast ? "1" : "";
  el.style.fontSize = TEXT_SIZE[s.text];
  const filters: string[] = [];
  if (s.color !== "none") filters.push(`url(#pinz-cb-${s.color})`);
  if (s.contrast) filters.push("contrast(1.18)");
  el.style.filter = filters.join(" ");
}

type M3 = number[][];
const I3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mul = (a: M3, b: M3): M3 => a.map((r) => [0, 1, 2].map((j) => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
const sub = (a: M3, b: M3): M3 => a.map((r, i) => r.map((v, j) => v - b[i][j]));
const add = (a: M3, b: M3): M3 => a.map((r, i) => r.map((v, j) => v + b[i][j]));

/** Simulação de cada tipo de daltonismo (Machado et al., 2009, gravidade máxima). */
const SIM: Record<"protan" | "deutan" | "tritan", M3> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
/** Para onde vai a informação de cor que a pessoa não distingue ("daltonização": o que se perde passa para os canais que ela vê). */
const SHIFT: Record<"protan" | "deutan" | "tritan", M3> = {
  protan: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]],
  deutan: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]],
  tritan: [[1, 0, 0.7], [0, 1, 0.7], [0, 0, 0]],
};

/** Matriz 4×5 do filtro SVG (feColorMatrix) que corrige as cores para cada tipo: original + deslocamento × (original − visto). */
export function colorMatrix(kind: "protan" | "deutan" | "tritan" | "mono"): string {
  if (kind === "mono") return "0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0";
  const c = add(I3, mul(SHIFT[kind], sub(I3, SIM[kind])));
  const f = (n: number) => n.toFixed(4);
  return `${c[0].map(f).join(" ")} 0 0  ${c[1].map(f).join(" ")} 0 0  ${c[2].map(f).join(" ")} 0 0  0 0 0 1 0`;
}

/** Script que roda antes da primeira pintura: o texto, a fonte e os atributos já nascem como a pessoa escolheu (sem a tela "pular"). */
export const A11Y_INIT_SCRIPT = `try{var a=JSON.parse(localStorage.getItem("${A11Y_KEY}")||"null");if(a){var d=document.documentElement;if(a.font)d.dataset.a11yFont="1";if(a.spacing)d.dataset.a11ySpacing="1";if(a.calm)d.dataset.a11yCalm="1";if(a.contrast)d.dataset.a11yContrast="1";d.style.fontSize=["100%","118%"][a.text||0]||"100%"}}catch(e){}`;
