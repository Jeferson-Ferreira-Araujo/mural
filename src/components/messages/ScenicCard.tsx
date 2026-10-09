import type { ReactNode } from "react";
import { frameOf, type FrameColor } from "@/lib/style";
import { PinSlot } from "./fasteners";

export type SceneId = "meadow" | "mountains" | "day" | "night" | "cloudy" | "rain" | "storm" | "snow" | "fog";

/** Cor do texto sobre cada paisagem (clara onde o fundo é escuro). */
const INK: Record<SceneId, { color: string; shadow: string }> = {
  meadow: { color: "#3a2a12", shadow: "0 0.05em 0.2em rgba(255,240,200,.55)" },
  day: { color: "#0f3556", shadow: "0 0.05em 0.2em rgba(255,255,255,.5)" },
  fog: { color: "#26323b", shadow: "0 0.05em 0.2em rgba(255,255,255,.5)" },
  snow: { color: "#233545", shadow: "0 0.05em 0.2em rgba(255,255,255,.55)" },
  mountains: { color: "#ffffff", shadow: "0 0.06em 0.3em rgba(20,10,40,.6)" },
  night: { color: "#ffffff", shadow: "0 0.06em 0.3em rgba(0,0,20,.7)" },
  cloudy: { color: "#ffffff", shadow: "0 0.06em 0.3em rgba(20,30,40,.55)" },
  rain: { color: "#ffffff", shadow: "0 0.06em 0.3em rgba(10,20,30,.65)" },
  storm: { color: "#ffffff", shadow: "0 0.06em 0.3em rgba(0,0,0,.7)" },
};

const STARS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 37 + 11) % 97, y: (i * 53 + 7) % 62, r: 0.35 + ((i * 7) % 5) * 0.12 }));

const Cloud = ({ x, y, s = 1, o = 0.95, fill = "#fff" }: { x: number; y: number; s?: number; o?: number; fill?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill={fill}>
    <ellipse cx="12" cy="10" rx="12" ry="7" />
    <ellipse cx="24" cy="7" rx="10" ry="8" />
    <ellipse cx="34" cy="11" rx="11" ry="6.5" />
  </g>
);

const Pines = ({ fill, y = 100 }: { fill: string; y?: number }) => (
  <g fill={fill}>
    {[4, 13, 22, 80, 89, 97].map((x, i) => (
      <path key={x} d={`M${x} ${y - 24 - (i % 3) * 5} l-6 14 h4 l-5 10 h5 l-6 12 h20 l-6 -12 h5 l-5 -10 h4 z`} transform="translate(-5 0)" />
    ))}
  </g>
);

function Scene({ id }: { id: SceneId }) {
  switch (id) {
    case "meadow":
      return (
        <>
          <defs>
            <linearGradient id="g-meadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f9e7ad" />
              <stop offset="0.62" stopColor="#f4c277" />
              <stop offset="1" stopColor="#d9a352" />
            </linearGradient>
            <radialGradient id="g-meadow-sun" cx="0.72" cy="0.3" r="0.5">
              <stop offset="0" stopColor="#fff7d8" stopOpacity=".95" />
              <stop offset="1" stopColor="#fff7d8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g-meadow)" />
          <rect width="100" height="100" fill="url(#g-meadow-sun)" />
          <path d="M0 70 Q25 62 50 68 T100 64 V100 H0 Z" fill="#cfa04f" opacity=".7" />
          <path d="M0 82 Q30 74 60 80 T100 77 V100 H0 Z" fill="#8f9a45" />
          <g fill="#5d6a2c">
            {[6, 14, 22, 78, 86, 94].map((x, i) => (
              <path key={x} d={`M${x} 100 Q${x - 3} ${88 - (i % 3) * 4} ${x - 1} ${80 - (i % 3) * 5} Q${x + 2} ${90 - (i % 2) * 3} ${x + 3} 100 Z`} />
            ))}
          </g>
          <g fill="#e9b04a">
            {[10, 18, 82, 90].map((x, i) => (
              <circle key={x} cx={x} cy={82 - (i % 2) * 6} r="1.6" />
            ))}
          </g>
        </>
      );
    case "mountains":
      return (
        <>
          <defs>
            <linearGradient id="g-mount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b4a8c" />
              <stop offset="0.55" stopColor="#8a6aa8" />
              <stop offset="1" stopColor="#f3a766" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g-mount)" />
          <circle cx="62" cy="58" r="9" fill="#ffd9a0" opacity=".9" />
          <path d="M0 70 L22 44 L38 62 L58 38 L82 64 L100 52 V100 H0 Z" fill="#4a3f7a" />
          <path d="M0 78 L18 60 L34 74 L54 56 L76 76 L100 66 V100 H0 Z" fill="#352d63" />
          <rect y="80" width="100" height="20" fill="#e89a62" opacity=".55" />
          <Pines fill="#1c1a3c" y={104} />
        </>
      );
    case "day":
      return (
        <>
          <defs>
            <linearGradient id="g-day" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4fa8ee" />
              <stop offset="1" stopColor="#d9f0ff" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g-day)" />
          <circle cx="76" cy="26" r="10" fill="#fff6b8" />
          <circle cx="76" cy="26" r="15" fill="#fff6b8" opacity=".35" />
          <Cloud x={8} y={58} s={0.9} />
          <Cloud x={52} y={70} s={0.7} o={0.85} />
          <path d="M0 88 Q30 78 60 86 T100 82 V100 H0 Z" fill="#6bb86a" />
        </>
      );
    case "night":
      return (
        <>
          <defs>
            <linearGradient id="g-night" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#070c26" />
              <stop offset="1" stopColor="#2f2f78" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g-night)" />
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.55 + (i % 3) * 0.15} />
          ))}
          <circle cx="78" cy="24" r="7.5" fill="#f4efd6" />
          <circle cx="81" cy="22" r="7" fill="#1a1d4c" opacity=".55" />
          <Pines fill="#0a0d26" y={104} />
        </>
      );
    case "cloudy":
      return (
        <>
          <defs>
            <linearGradient id="g-cloudy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7d93a8" />
              <stop offset="1" stopColor="#c6d2dc" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g-cloudy)" />
          <Cloud x={-4} y={22} s={1.3} o={0.85} fill="#eef2f6" />
          <Cloud x={46} y={46} s={1.2} o={0.9} fill="#dfe6ec" />
          <Cloud x={6} y={68} s={1} o={0.8} fill="#f4f6f8" />
        </>
      );
    case "rain":
    case "storm":
      return (
        <>
          <defs>
            <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={id === "storm" ? "#2f3947" : "#4f6073"} />
              <stop offset="1" stopColor={id === "storm" ? "#59667a" : "#8795a4"} />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#g-${id})`} />
          <Cloud x={-2} y={14} s={1.4} o={0.95} fill={id === "storm" ? "#505d6e" : "#9fb0bf"} />
          <Cloud x={42} y={28} s={1.2} o={0.95} fill={id === "storm" ? "#46526a" : "#8fa1b2"} />
          <g stroke="#cfe3f5" strokeWidth="0.9" strokeLinecap="round" opacity=".8">
            {Array.from({ length: 22 }, (_, i) => (
              <line key={i} x1={(i * 13) % 100} y1={50 + ((i * 17) % 46)} x2={((i * 13) % 100) - 4} y2={58 + ((i * 17) % 46)} />
            ))}
          </g>
          {id === "storm" && <path d="M54 44 L44 66 H52 L46 88 L64 60 H55 L61 44 Z" fill="#ffe46b" />}
        </>
      );
    case "snow":
      return (
        <>
          <defs>
            <linearGradient id="g-snow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9fb4c8" />
              <stop offset="1" stopColor="#eaf1f7" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#g-snow)" />
          <Cloud x={6} y={10} s={1.3} o={0.9} fill="#f6f9fc" />
          <g fill="#fff">
            {Array.from({ length: 28 }, (_, i) => (
              <circle key={i} cx={(i * 29) % 100} cy={36 + ((i * 23) % 62)} r={0.8 + (i % 3) * 0.4} opacity=".9" />
            ))}
          </g>
        </>
      );
    case "fog":
      return (
        <>
          <rect width="100" height="100" fill="#c5ced5" />
          {[18, 36, 54, 72].map((y, i) => (
            <rect key={y} y={y} width="100" height="9" fill="#e6ebef" opacity={0.55 - i * 0.07} />
          ))}
        </>
      );
  }
}

const icon = { viewBox: "0 0 24 24", className: "size-full", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export const LeafIcon = () => (
  <svg {...icon}>
    <path d="M5 19c0-9 6-14 14-14 0 8-5 14-14 14Z" />
    <path d="M5 19c3-4 6-6 9-8" />
  </svg>
);
export const SunIcon = () => (
  <svg {...icon}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
  </svg>
);
export const MoonIcon = () => (
  <svg {...icon}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
);
export const ClockIcon = () => (
  <svg {...icon}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const CloudIcon = () => (
  <svg {...icon}>
    <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18Z" />
  </svg>
);

/**
 * Cartão quadrado com aro colorido e paisagem de fundo (modelo dos pins da loja): ícone da categoria no canto esquerdo,
 * sol ou lua no direito e o conteúdo no centro. Quem cola o pin escolhe a cor do aro.
 */
export function ScenicCard({ scene, frame, left, right, label, children }: { scene: SceneId; frame?: FrameColor | string | null; left: ReactNode; right: ReactNode; label: string; children: ReactNode }) {
  const f = frameOf(frame);
  const ink = INK[scene];
  return (
    <div className="relative w-[12.5em]">
      <article aria-label={label} className="relative aspect-square w-full rounded-[1.5em] p-[0.3em]" style={{ background: `linear-gradient(145deg, ${f.from}, ${f.to})`, boxShadow: "0 0.25em 0.7em rgba(30,12,0,.4), inset 0 0.05em 0.12em rgba(255,255,255,.7)" }}>
        <div className="relative size-full overflow-hidden rounded-[1.25em]" style={{ color: ink.color, textShadow: ink.shadow, boxShadow: "inset 0 0 0.5em rgba(0,0,0,.3)" }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
            <Scene id={scene} />
          </svg>
          <span className="absolute top-[0.7em] left-[0.75em] size-[1.5em] opacity-80">{left}</span>
          <span className="absolute top-[0.7em] right-[0.75em] size-[1.5em] opacity-80">{right}</span>
          <div className="relative flex size-full flex-col items-center justify-center px-[1em] pt-[1.6em] pb-[0.9em] text-center">{children}</div>
        </div>
      </article>
      <PinSlot tone="red" pos="center" top="top-[-0.25em]" />
    </div>
  );
}
