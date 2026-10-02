import type { PlayerColor } from "@/lib/types";

export type PlayerLook = {
  label: string;
  /** cor de amostra (seletor) */
  swatch: string;
  /** corpo do aparelho: topo → meio → base */
  body: [string, string, string];
  /** aro metálico fino em volta */
  rim: string;
  /** botões: topo → base */
  btn: [string, string];
  /** ícones dos botões */
  icon: string;
  /** furinhos do alto-falante / marca gravada */
  hole: string;
};

/** Cores do mini player (a pessoa que envia escolhe). */
export const PLAYER_PALETTE: Record<PlayerColor, PlayerLook> = {
  black: { label: "Preto", swatch: "#2a2a2e", body: ["#55555b", "#202023", "#101012"], rim: "#c99560", btn: ["#505056", "#1d1d20"], icon: "#ececf0", hole: "#050506" },
  silver: { label: "Prata", swatch: "#c9cad2", body: ["#f1f1f5", "#c3c4cc", "#8e8f99"], rim: "#ffffff", btn: ["#fbfbfd", "#bfc0c8"], icon: "#2b2c33", hole: "#4a4b53" },
  red: { label: "Vermelho", swatch: "#d6281d", body: ["#ff7a6c", "#d6281d", "#85110a"], rim: "#ffb3a8", btn: ["#ff6a5c", "#a81a11"], icon: "#fff3f1", hole: "#4a0a06" },
  blue: { label: "Azul", swatch: "#2a6fd6", body: ["#7bbcff", "#2a6fd6", "#133a85"], rim: "#b9dcff", btn: ["#5aa5ff", "#1c52b0"], icon: "#f2f8ff", hole: "#08214f" },
  pink: { label: "Rosa", swatch: "#e2468f", body: ["#ffaad2", "#e2468f", "#951a58"], rim: "#ffd3e8", btn: ["#ff8cc0", "#c02c74"], icon: "#fff1f8", hole: "#5a0e34" },
  green: { label: "Verde", swatch: "#2fae62", body: ["#8ceaae", "#2fae62", "#14633a"], rim: "#c4f5d6", btn: ["#5fd88c", "#1f8a4b"], icon: "#f0fff6", hole: "#0b3a21" },
};

export const PLAYER_COLOR_IDS = Object.keys(PLAYER_PALETTE) as PlayerColor[];
