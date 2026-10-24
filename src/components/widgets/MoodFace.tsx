import type { ReactNode } from "react";

const INK = "#1d1416";
const BLUSH = "#f4998f";
const ROSE = "#ee5f5b";
const RED = "#e8303a";
const TEAR = "#3d97f5";

/** Estilo dos traços: arredondados e grossos, como no conjunto de rostos. */
const line = { fill: "none", stroke: INK, strokeWidth: 5.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Dot = ({ x, y, r = 5.6 }: { x: number; y: number; r?: number }) => <circle cx={x} cy={y} r={r} fill={INK} />;
const Cheek = ({ x, y }: { x: number; y: number }) => <ellipse cx={x} cy={y} rx={8} ry={6.5} fill={BLUSH} />;
const Smile = () => <path d="M39 59q11 12 22 0" {...line} />;
const Heart = ({ x, y }: { x: number; y: number }) => <path transform={`translate(${x} ${y})`} d="M0 17C-14 7-17-2-17-8c0-6 4-10 9-10 4 0 7 2 8 5 1-3 4-5 8-5 5 0 9 4 9 10 0 6-3 15-17 25Z" fill={RED} />;
const OpenMouth = ({ y = 56 }: { y?: number }) => (
  <g transform={`translate(0 ${y - 56})`}>
    <path d="M30 56h40c0 16-9 24-20 24S30 72 30 56Z" fill={INK} />
    <path d="M38 72c3-5 7-6 12-6s9 1 12 6c-3 5-7 7-12 7s-9-2-12-7Z" fill={ROSE} />
  </g>
);

/** Os rostos do display de humor: a chave (guardada no display) e o desenho. */
export const MOOD_FACES: Record<string, { bg: string; face: ReactNode }> = {
  happy: {
    bg: "#ffd35c",
    face: (
      <>
        <path d="M24 46q9-14 18 0M58 46q9-14 18 0" {...line} />
        <Cheek x={22} y={62} />
        <Cheek x={78} y={62} />
        <Smile />
      </>
    ),
  },
  love: {
    bg: "#f9a2a5",
    face: (
      <>
        <Heart x={30} y={40} />
        <Heart x={70} y={40} />
        <OpenMouth y={58} />
      </>
    ),
  },
  laugh: {
    bg: "#9cc8fa",
    face: (
      <>
        <path d="M22 33l18 9-18 9M78 33 60 42l18 9" {...line} />
        <path d="M22 62c-6 6-6 12 0 12s6-6 0-12ZM78 62c6 6 6 12 0 12s-6-6 0-12Z" fill={TEAR} />
        <OpenMouth y={56} />
      </>
    ),
  },
  wink: {
    bg: "#a9d8a5",
    face: (
      <>
        <Dot x={31} y={46} r={6} />
        <path d="M78 36 62 45l16 9" {...line} />
        <Cheek x={78} y={64} />
        <Smile />
      </>
    ),
  },
  wow: {
    bg: "#b0a8e6",
    face: (
      <>
        <path d="M23 26q6-6 13-2M64 24q7-4 13 2" {...line} strokeWidth={4} />
        <Dot x={36} y={44} r={7} />
        <Dot x={64} y={44} r={7} />
        <ellipse cx={50} cy={72} rx={9} ry={11} fill={INK} />
        <ellipse cx={50} cy={77} rx={5} ry={4.5} fill={ROSE} />
      </>
    ),
  },
  angry: {
    bg: "#f47373",
    face: (
      <>
        <path d="M20 34l22 12M80 34 58 46" {...line} strokeWidth={6.5} />
        <Dot x={34} y={52} r={6.5} />
        <Dot x={66} y={52} r={6.5} />
        <path d="M36 76q14-16 28 0" {...line} />
      </>
    ),
  },
  sad: {
    bg: "#c6c6d2",
    face: (
      <>
        <Dot x={32} y={47} r={6} />
        <Dot x={68} y={47} r={6} />
        <path d="M67 58c-6 8-6 15 0 15s6-7 0-15Z" fill={TEAR} />
        <path d="M38 70q9-10 18 0" {...line} />
      </>
    ),
  },
  calm: {
    bg: "#f8a862",
    face: (
      <>
        <path d="M22 45q9 9 18 0M60 45q9 9 18 0" {...line} />
        <Cheek x={24} y={64} />
        <Cheek x={76} y={64} />
        <Smile />
      </>
    ),
  },
  silly: {
    bg: "#fcdb86",
    face: (
      <>
        <Dot x={30} y={42} r={6} />
        <path d="M78 33 62 42l16 9" {...line} />
        <path d="M30 58h40c-2 10-6 14-12 14h-1c-2 0-4-1-5-3-1 2-3 3-5 3h-1c-8 0-14-4-16-14Z" fill={INK} />
        <path d="M43 62h14v14c0 6-3 9-7 9s-7-3-7-9Z" fill="#f08c8c" />
        <path d="M50 64v15" stroke="#d94a4a" strokeWidth={1.6} strokeLinecap="round" />
      </>
    ),
  },
  shy: {
    bg: "#f9b5ba",
    face: (
      <>
        <path d="M24 46q9-14 18 0M58 46q9-14 18 0" {...line} />
        <path d="M13 66l6-5M19 68l6-5M81 61l6 5M75 63l6 5" stroke={ROSE} strokeWidth={4.2} strokeLinecap="round" />
        <Smile />
      </>
    ),
  },
};

/** As chaves, na ordem em que aparecem na escolha. */
export const MOOD_KEYS = Object.keys(MOOD_FACES);

/** Um rosto do humor. Se o valor não é uma das chaves (displays antigos guardavam um emoji de texto), mostra o texto. */
export function MoodFace({ value, className, style }: { value?: string; className?: string; style?: React.CSSProperties }) {
  const f = value ? MOOD_FACES[value] : undefined;
  if (!f) return <span className={className} style={style}>{(value ?? "").trim() || "😄"}</span>;
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <circle cx={50} cy={50} r={50} fill={f.bg} />
      {f.face}
    </svg>
  );
}
