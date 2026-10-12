/** Cores de um estilo de display de números (calendário, data, contadores): fundo, texto, número grande, caixinhas e destaque. */
export type Skin = {
  bg: string;
  ink: string;
  /** texto de apoio */
  sub: string;
  /** o número grande */
  num: string;
  /** fundo e contorno das caixinhas */
  box: string;
  edge: string;
  glow: string;
  /** destaque (faixa, marcas) e a cor do texto sobre ele */
  accent: string;
  onAccent: string;
};

/** Estilos que vários displays compartilham (cada um tem os seus próprios estilos de origem e escolhe destes os que faltam). */
export const SHARED_SKINS: Record<string, Skin> = {
  mint: { bg: "linear-gradient(155deg,#ecf8ee,#bfe5c9)", ink: "#1d4a2e", sub: "#4f7f62", num: "#1f8a4c", box: "rgba(255,255,255,.66)", edge: "rgba(31,138,76,.26)", glow: "none", accent: "#1f8a4c", onAccent: "#ffffff" },
  rose: { bg: "linear-gradient(155deg,#fff1f4,#f8c4d0)", ink: "#5a1f33", sub: "#94495f", num: "#d6336c", box: "rgba(255,255,255,.66)", edge: "rgba(214,51,108,.24)", glow: "none", accent: "#d6336c", onAccent: "#ffffff" },
  mono: { bg: "linear-gradient(155deg,#ffffff,#e9e9ec)", ink: "#111111", sub: "#666666", num: "#111111", box: "rgba(0,0,0,.05)", edge: "rgba(0,0,0,.18)", glow: "none", accent: "#111111", onAccent: "#ffffff" },
  night: { bg: "linear-gradient(145deg,#1b2433,#0d121b)", ink: "#eef2f7", sub: "rgba(238,242,247,.6)", num: "#5cc4ff", box: "rgba(255,255,255,.06)", edge: "rgba(92,196,255,.28)", glow: "0 0 0.5em rgba(92,196,255,.5)", accent: "#5cc4ff", onAccent: "#08202e" },
  dusk: { bg: "linear-gradient(155deg,#2c2160,#8a3f7a 55%,#ee8a6a)", ink: "#ffffff", sub: "rgba(255,255,255,.82)", num: "#ffe9b8", box: "rgba(255,255,255,.12)", edge: "rgba(255,255,255,.28)", glow: "0 0.05em 0.35em rgba(40,10,60,.45)", accent: "#ffe9b8", onAccent: "#3a1d4a" },
};

/** Nome e dica de cada estilo compartilhado, para a loja. */
export const SHARED_SKIN_INFO: Record<string, { name: string; hint: string }> = {
  mint: { name: "Menta", hint: "Verde fresco e leve." },
  rose: { name: "Rosa", hint: "Suave e delicado." },
  mono: { name: "Minimal", hint: "Preto e branco, limpo." },
  night: { name: "Noite", hint: "Escuro, com números luminosos." },
  dusk: { name: "Entardecer", hint: "Cores do fim de tarde." },
};
