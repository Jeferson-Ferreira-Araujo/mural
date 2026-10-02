/** Personalização dos cards de texto: letra, cor da tachinha e cor da fita (escolhidas por quem cola o pin). */

export type HandId = "caveat" | "kalam" | "patrick" | "indie";

export type HandFont = {
  id: HandId;
  label: string;
  /** font-family (variáveis do next/font em layout.tsx) */
  family: string;
  /** Tamanho relativo à Caveat (a base dos cards): nivela a largura do texto entre as letras. */
  scale: number;
  /** Ajuste (em) da pauta da folha de caderno, para a base das letras assentar na linha em cada fonte. */
  rule: number;
};

export const HAND_FONTS: readonly HandFont[] = [
  { id: "caveat", label: "Caveat", family: "var(--font-caveat), cursive", scale: 1, rule: 0 },
  { id: "kalam", label: "Kalam", family: "var(--font-kalam), cursive", scale: 0.84, rule: -0.2 },
  { id: "patrick", label: "Patrick", family: "var(--font-patrick), cursive", scale: 0.98, rule: 0.07 },
  { id: "indie", label: "Indie", family: "var(--font-indie), cursive", scale: 0.84, rule: -0.2 },
];

export const DEFAULT_HAND: HandId = "caveat";
export const handOf = (id?: string | null): HandFont => HAND_FONTS.find((f) => f.id === id) ?? HAND_FONTS[0];

// ---- tachinha ----
export type PinColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "black";

/** A imagem da tachinha é vermelha; as outras cores vêm de filtros. */
export const PIN_COLORS: readonly { id: PinColor; label: string; swatch: string; filter: string }[] = [
  { id: "red", label: "Vermelha", swatch: "#d62a2a", filter: "" },
  { id: "orange", label: "Laranja", swatch: "#ef8a1e", filter: "hue-rotate(28deg) saturate(1.15) " },
  { id: "yellow", label: "Amarela", swatch: "#f2c71c", filter: "hue-rotate(52deg) saturate(1.2) brightness(1.1) " },
  { id: "green", label: "Verde", swatch: "#3aa84a", filter: "hue-rotate(115deg) saturate(1.05) " },
  { id: "blue", label: "Azul", swatch: "#2f6fe0", filter: "hue-rotate(215deg) saturate(1.1) " },
  { id: "purple", label: "Roxa", swatch: "#8a4fd6", filter: "hue-rotate(265deg) saturate(1.05) " },
  { id: "pink", label: "Rosa", swatch: "#ee5fa0", filter: "hue-rotate(320deg) saturate(1.05) brightness(1.1) " },
  { id: "black", label: "Preta", swatch: "#2a2a2e", filter: "grayscale(1) brightness(0.42) contrast(1.15) " },
];
export const pinOf = (id?: string | null) => PIN_COLORS.find((c) => c.id === id) ?? PIN_COLORS[0];

// ---- fita ----
export type TapeColor = "yellow" | "pink" | "blue" | "green" | "white" | "black";

export const TAPE_COLORS: readonly { id: TapeColor; label: string; swatch: string; tone: string }[] = [
  { id: "yellow", label: "Amarela", swatch: "#eee0a8", tone: "rgba(238, 224, 168, .72)" },
  { id: "pink", label: "Rosa", swatch: "#f4b3c8", tone: "rgba(244, 179, 200, .72)" },
  { id: "blue", label: "Azul", swatch: "#a9d1ee", tone: "rgba(169, 209, 238, .72)" },
  { id: "green", label: "Verde", swatch: "#b6dc92", tone: "rgba(182, 220, 146, .72)" },
  { id: "white", label: "Branca", swatch: "#f4f1ea", tone: "rgba(250, 248, 242, .78)" },
  { id: "black", label: "Preta", swatch: "#34343a", tone: "rgba(48, 48, 54, .8)" },
];
export const tapeOf = (id?: string | null) => TAPE_COLORS.find((c) => c.id === id) ?? TAPE_COLORS[0];
