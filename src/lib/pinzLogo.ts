/** Camadas do logo (geradas da imagem sem tachinha): posições em % do papel (1180x885). */
export const LOGO_RATIO = 1180 / 885;

/** Tachinha sobre o papel (em % do tamanho do logo). */
export const TACK = { left: "46.8%", top: "12.4%", width: "15%" } as const;

/** Ordem em que as letras são "escritas": ms de duração, eixo da varredura. */
export const INK_ORDER = [
  { k: "p", ms: 160, axis: "y" },
  { k: "i", ms: 110, axis: "y" },
  { k: "n", ms: 140, axis: "x" },
  { k: "z", ms: 170, axis: "x" },
  { k: "s1", ms: 60, axis: "x" },
  { k: "s2", ms: 60, axis: "x" },
  { k: "s3", ms: 60, axis: "x" },
  { k: "u", ms: 180, axis: "x" },
] as const;

export const INK_BOX: Record<(typeof INK_ORDER)[number]["k"], { left: number; top: number; width: number; height: number }> = {
  "p": {
    "left": 10.593,
    "top": 37.74,
    "width": 22.797,
    "height": 48.249
  },
  "i": {
    "left": 31.695,
    "top": 27.797,
    "width": 9.831,
    "height": 40.452
  },
  "n": {
    "left": 39.915,
    "top": 37.74,
    "width": 21.356,
    "height": 28.362
  },
  "z": {
    "left": 60.254,
    "top": 30.96,
    "width": 24.068,
    "height": 34.802
  },
  "s1": {
    "left": 80,
    "top": 29.04,
    "width": 9.153,
    "height": 16.158
  },
  "s2": {
    "left": 82.288,
    "top": 41.356,
    "width": 11.017,
    "height": 9.379
  },
  "s3": {
    "left": 83.39,
    "top": 51.751,
    "width": 10.678,
    "height": 8.362
  },
  "u": {
    "left": 22.966,
    "top": 64.52,
    "width": 56.017,
    "height": 16.384
  }
};
