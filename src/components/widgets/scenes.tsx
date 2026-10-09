import type { ReactNode } from "react";

/** Paisagens dos widgets (tela 200 × 100). Cada uma preenche o cartão inteiro. */
export type SceneId = "dawn" | "day" | "dusk" | "night" | "mountains" | "beach" | "lake" | "pixel" | "rain" | "cloudy" | "snow" | "fog" | "storm" | "parchment" | "floral" | "forest";

/** Cor do texto sobre cada paisagem (clara onde o fundo é escuro). */
export const INK: Record<SceneId, { color: string; shadow: string }> = {
  dawn: { color: "#fff7e6", shadow: "0 0.05em 0.25em rgba(80,30,0,.55)" },
  day: { color: "#ffffff", shadow: "0 0.05em 0.25em rgba(10,50,90,.5)" },
  dusk: { color: "#ffffff", shadow: "0 0.05em 0.3em rgba(40,10,40,.6)" },
  night: { color: "#ffffff", shadow: "0 0.05em 0.3em rgba(0,0,20,.7)" },
  mountains: { color: "#ffffff", shadow: "0 0.05em 0.3em rgba(20,10,40,.6)" },
  beach: { color: "#ffffff", shadow: "0 0.05em 0.25em rgba(10,60,100,.55)" },
  lake: { color: "#ffffff", shadow: "0 0.05em 0.25em rgba(5,30,40,.6)" },
  pixel: { color: "#ffffff", shadow: "0 0.08em 0 rgba(20,40,90,.8)" },
  rain: { color: "#ffffff", shadow: "0 0.05em 0.3em rgba(0,10,20,.7)" },
  cloudy: { color: "#ffffff", shadow: "0 0.05em 0.3em rgba(20,30,40,.55)" },
  snow: { color: "#1e3447", shadow: "0 0.05em 0.2em rgba(255,255,255,.6)" },
  fog: { color: "#26323b", shadow: "0 0.05em 0.2em rgba(255,255,255,.5)" },
  storm: { color: "#ffffff", shadow: "0 0.05em 0.3em rgba(0,0,0,.7)" },
  parchment: { color: "#3a2a12", shadow: "0 0.04em 0.15em rgba(255,244,214,.6)" },
  floral: { color: "#5a1f3a", shadow: "0 0.04em 0.15em rgba(255,235,242,.7)" },
  forest: { color: "#fff6dc", shadow: "0 0.05em 0.25em rgba(5,30,10,.65)" },
};

const STARS = Array.from({ length: 46 }, (_, i) => ({ x: (i * 53 + 17) % 197, y: (i * 37 + 5) % 58, r: 0.4 + ((i * 7) % 5) * 0.14 }));

const Cloud = ({ x, y, s = 1, o = 0.95, fill = "#fff" }: { x: number; y: number; s?: number; o?: number; fill?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill={fill}>
    <ellipse cx="12" cy="10" rx="12" ry="7" />
    <ellipse cx="24" cy="7" rx="10" ry="8" />
    <ellipse cx="34" cy="11" rx="11" ry="6.5" />
  </g>
);

const Pines = ({ fill, y = 100, xs }: { fill: string; y?: number; xs: number[] }) => (
  <g fill={fill}>
    {xs.map((x, i) => (
      <path key={x} d={`M${x} ${y - 30 - (i % 3) * 6} l-7 16 h4.5 l-6 11 h5.5 l-7 14 h22 l-7 -14 h5.5 l-6 -11 h4.5 z`} transform="translate(-9 0)" />
    ))}
  </g>
);

const Grad = ({ id, stops, vertical = true }: { id: string; stops: [number, string][]; vertical?: boolean }) => (
  <linearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
    {stops.map(([o, c]) => (
      <stop key={o} offset={o} stopColor={c} />
    ))}
  </linearGradient>
);

const Sky = ({ id, stops, children }: { id: string; stops: [number, string][]; children?: ReactNode }) => (
  <>
    <defs>
      <Grad id={id} stops={stops} />
    </defs>
    <rect width="200" height="100" fill={`url(#${id})`} />
    {children}
  </>
);

const Moon = ({ x, y, r = 8 }: { x: number; y: number; r?: number }) => (
  <>
    <circle cx={x} cy={y} r={r * 1.9} fill="#f4efd6" opacity=".14" />
    <circle cx={x} cy={y} r={r} fill="#f4efd6" />
    <circle cx={x + r * 0.4} cy={y - r * 0.3} r={r * 0.92} fill="#1d1f55" opacity=".5" />
  </>
);

const Sun = ({ x, y, r = 9 }: { x: number; y: number; r?: number }) => (
  <>
    <circle cx={x} cy={y} r={r * 2.1} fill="#fff6b8" opacity=".3" />
    <circle cx={x} cy={y} r={r * 1.45} fill="#fff6b8" opacity=".45" />
    <circle cx={x} cy={y} r={r} fill="#fff3a0" />
  </>
);

const Skyline = ({ fill }: { fill: string }) => (
  <g fill={fill}>
    {[8, 22, 34, 50, 64, 80, 96, 112, 128, 146, 162, 178, 192].map((x, i) => (
      <rect key={x} x={x} y={74 - ((i * 13) % 20)} width={9 + (i % 3) * 3} height={30 + ((i * 13) % 20)} />
    ))}
  </g>
);

export function Scene({ id }: { id: SceneId }) {
  switch (id) {
    case "dawn":
      return (
        <Sky id="s-dawn" stops={[[0, "#3a4f9a"], [0.5, "#e58f7a"], [1, "#f9d28a"]]}>
          <circle cx="150" cy="66" r="12" fill="#ffe4a8" opacity=".95" />
          <path d="M0 78 L34 56 L58 72 L96 48 L136 74 L170 60 L200 74 V100 H0 Z" fill="#6b4a78" />
          <path d="M0 88 L30 74 L66 86 L110 70 L160 88 L200 78 V100 H0 Z" fill="#3d2d5c" />
          <Pines fill="#1d1535" y={104} xs={[6, 20, 176, 190]} />
        </Sky>
      );
    case "day":
      return (
        <Sky id="s-day" stops={[[0, "#3f9be8"], [1, "#d2edff"]]}>
          <Sun x={160} y={26} r={10} />
          <Cloud x={14} y={34} s={1.1} />
          <Cloud x={92} y={50} s={0.8} o={0.9} />
          <path d="M0 86 Q50 70 100 82 T200 76 V100 H0 Z" fill="#6cbc6a" />
          <path d="M0 94 Q60 84 120 92 T200 88 V100 H0 Z" fill="#4a9a50" />
        </Sky>
      );
    case "dusk":
    case "mountains":
      return (
        <Sky id={`s-${id}`} stops={[[0, "#2b3f86"], [0.55, "#9a6aa6"], [1, "#f6a463"]]}>
          <circle cx="132" cy="66" r="11" fill="#ffd9a0" opacity=".92" />
          <path d="M0 72 L40 40 L70 62 L112 34 L156 64 L200 46 V100 H0 Z" fill="#4a3f7a" />
          <path d="M0 82 L36 62 L72 78 L116 58 L160 80 L200 68 V100 H0 Z" fill="#352d63" />
          <rect y="84" width="200" height="16" fill="#e89a62" opacity=".5" />
          <Pines fill="#1c1a3c" y={104} xs={[8, 22, 36, 170, 184, 196]} />
        </Sky>
      );
    case "night":
      return (
        <Sky id="s-night" stops={[[0, "#060b24"], [1, "#2e2f78"]]}>
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.5 + (i % 3) * 0.17} />
          ))}
          <Moon x={166} y={26} r={9} />
          <path d="M0 84 L40 70 L84 82 L130 66 L200 84 V100 H0 Z" fill="#1a1d4c" />
          <Pines fill="#0a0d26" y={104} xs={[8, 22, 36, 170, 184, 196]} />
        </Sky>
      );
    case "beach":
      return (
        <Sky id="s-beach" stops={[[0, "#3d9be6"], [0.65, "#bfe6ff"], [1, "#f8e8c0"]]}>
          <Sun x={34} y={34} r={13} />
          <Cloud x={110} y={26} s={0.9} />
          <Cloud x={150} y={44} s={0.7} o={0.85} />
          <path d="M70 70 L96 50 L118 66 L142 44 L172 68 L200 56 V74 H70 Z" fill="#5c8fb0" opacity=".85" />
          <rect y="68" width="200" height="14" fill="#35b4d8" />
          <path d="M0 80 Q60 74 120 80 T200 78 V100 H0 Z" fill="#f3dca6" />
          {[150, 168, 186].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 92 q-1 -${16 + i * 2} ${i % 2 ? 2 : -2} -${20 + i * 2}`} stroke="#6a4a2a" strokeWidth="1.6" fill="none" />
              <path d={`M${x} ${72 - i * 2} q-8 -4 -13 2 M${x} ${72 - i * 2} q8 -4 13 2 M${x} ${72 - i * 2} q-5 -8 -10 -4 M${x} ${72 - i * 2} q5 -8 10 -4`} stroke="#2f8a3c" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </Sky>
      );
    case "lake":
      return (
        <Sky id="s-lake" stops={[[0, "#6bb0e8"], [0.55, "#cfe8f6"], [1, "#e8f0e0"]]}>
          <Cloud x={120} y={14} s={0.9} />
          <path d="M0 66 L30 40 L52 58 L84 34 L118 60 L150 44 L200 66 V74 H0 Z" fill="#6a8fb0" />
          <path d="M0 70 L24 56 L50 68 L80 52 L110 70 L200 64 V76 H0 Z" fill="#456f8e" />
          <Pines fill="#1f5a3a" y={96} xs={[6, 18, 30, 42, 176, 188, 198]} />
          <rect y="74" width="200" height="26" fill="#6fb2c8" />
          <rect y="74" width="200" height="26" fill="#2c7a96" opacity=".35" />
          <path d="M20 84 h40 M90 90 h50 M150 82 h30" stroke="#fff" strokeWidth="0.8" opacity=".5" />
          <g>
            <rect x="130" y="64" width="16" height="10" fill="#7a4a2a" />
            <path d="M127 64 L138 55 L149 64 Z" fill="#a23b2a" />
            <rect x="136" y="67" width="3" height="4" fill="#ffd36a" />
          </g>
        </Sky>
      );
    case "pixel":
      return (
        <g shapeRendering="crispEdges">
          <rect width="200" height="100" fill="#5fb7f0" />
          <rect width="200" height="30" fill="#4fa6e8" />
          {[
            [16, 18, 30],
            [64, 30, 24],
            [128, 14, 34],
          ].map(([x, y, w]) => (
            <g key={x} fill="#fff">
              <rect x={x} y={y + 4} width={w} height="8" />
              <rect x={x + 6} y={y} width={w - 12} height="6" />
            </g>
          ))}
          <rect y="74" width="200" height="26" fill="#58b23a" />
          <rect y="74" width="200" height="4" fill="#7fd04a" />
          <rect x="40" y="62" width="40" height="12" fill="#58b23a" />
          <rect x="110" y="58" width="60" height="16" fill="#4ea232" />
          <rect x="140" y="62" width="24" height="12" fill="#e8f2ff" />
          <rect x="136" y="56" width="32" height="6" fill="#d9472e" />
          <rect x="144" y="50" width="16" height="6" fill="#d9472e" />
          <rect x="148" y="66" width="6" height="8" fill="#7a4a2a" />
          {[8, 18, 28].map((x) => (
            <rect key={x} x={x} y="68" width="4" height="12" fill="#7a4a2a" />
          ))}
          <rect x="4" y="76" width="28" height="3" fill="#b08040" />
        </g>
      );
    case "rain":
      return (
        <>
          <Sky id="s-rain" stops={[[0, "#1e2c40"], [1, "#4b6176"]]}>
            <Cloud x={-6} y={-2} s={2} o={0.55} fill="#6c8196" />
            <Cloud x={90} y={4} s={1.8} o={0.5} fill="#5b7087" />
            <g stroke="#cfe3f5" strokeWidth="0.7" strokeLinecap="round" opacity=".7">
              {Array.from({ length: 46 }, (_, i) => (
                <line key={i} x1={(i * 29) % 200} y1={(i * 17) % 90} x2={((i * 29) % 200) - 3} y2={((i * 17) % 90) + 9} />
              ))}
            </g>
            {Array.from({ length: 16 }, (_, i) => (
              <circle key={i} cx={(i * 37 + 11) % 196} cy={(i * 23 + 9) % 92} r={1 + (i % 3) * 0.5} fill="#cfe3f5" opacity=".35" />
            ))}
          </Sky>
        </>
      );
    case "cloudy":
      return (
        <Sky id="s-cloudy" stops={[[0, "#7d93a8"], [1, "#c6d2dc"]]}>
          <Cloud x={-6} y={14} s={1.9} o={0.85} fill="#eef2f6" />
          <Cloud x={84} y={32} s={1.7} o={0.9} fill="#dfe6ec" />
          <Cloud x={20} y={56} s={1.4} o={0.8} fill="#f4f6f8" />
        </Sky>
      );
    case "storm":
      return (
        <Sky id="s-storm" stops={[[0, "#262f3c"], [1, "#58667a"]]}>
          <Cloud x={-4} y={4} s={2} o={0.95} fill="#4d5a6c" />
          <Cloud x={92} y={14} s={1.8} o={0.95} fill="#44506a" />
          <g stroke="#cfe3f5" strokeWidth="0.7" opacity=".6">
            {Array.from({ length: 30 }, (_, i) => (
              <line key={i} x1={(i * 31) % 200} y1={40 + ((i * 17) % 50)} x2={((i * 31) % 200) - 3} y2={49 + ((i * 17) % 50)} />
            ))}
          </g>
          <path d="M104 30 L92 60 H102 L95 86 L116 52 H105 L112 30 Z" fill="#ffe46b" />
        </Sky>
      );
    case "snow":
      return (
        <Sky id="s-snow" stops={[[0, "#9fb4c8"], [1, "#eaf1f7"]]}>
          <Cloud x={6} y={6} s={1.9} o={0.9} fill="#f6f9fc" />
          <g fill="#fff">
            {Array.from({ length: 40 }, (_, i) => (
              <circle key={i} cx={(i * 29) % 200} cy={30 + ((i * 23) % 66)} r={0.9 + (i % 3) * 0.5} opacity=".9" />
            ))}
          </g>
        </Sky>
      );
    case "fog":
      return (
        <>
          <rect width="200" height="100" fill="#c5ced5" />
          {[14, 34, 54, 74].map((y, i) => (
            <rect key={y} y={y} width="200" height="12" fill="#e6ebef" opacity={0.55 - i * 0.08} />
          ))}
        </>
      );
    case "parchment":
      return (
        <>
          <defs>
            <linearGradient id="s-parch" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7e9c4" />
              <stop offset="1" stopColor="#e6cc96" />
            </linearGradient>
            <radialGradient id="s-parch-v" cx="0.5" cy="0.5" r="0.75">
              <stop offset="0.6" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#7a5a20" stopOpacity=".28" />
            </radialGradient>
          </defs>
          <rect width="200" height="100" fill="url(#s-parch)" />
          <rect width="200" height="100" fill="url(#s-parch-v)" />
          {/* folhas no canto esquerdo */}
          <g fill="#4f7a3a" opacity=".92">
            <path d="M6 96 C4 76 14 62 30 58 C30 76 22 90 6 96 Z" />
            <path d="M14 98 C14 84 26 72 44 70 C42 86 30 96 14 98 Z" fill="#6a9a4a" />
            <path d="M2 70 C2 58 8 50 18 46 C18 58 12 66 2 70 Z" fill="#3f6a30" />
          </g>
          <g fill="#4f7a3a" opacity=".5">
            <path d="M196 4 C198 18 190 28 178 32 C178 18 184 8 196 4 Z" />
          </g>
        </>
      );
    case "floral":
      return (
        <>
          <Sky id="s-floral" stops={[[0, "#ffd0de"], [1, "#f6a8c2"]]} />
          {[
            [10, 12, 9],
            [28, 6, 7],
            [6, 40, 7],
            [186, 14, 9],
            [172, 6, 7],
            [194, 42, 8],
            [180, 82, 10],
            [12, 88, 9],
            [28, 94, 7],
            [160, 92, 7],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy={-r * 0.62} rx={r * 0.46} ry={r * 0.62} fill="#fbe0ea" stroke="#e9879f" strokeWidth="0.4" transform={`rotate(${a})`} />
              ))}
              <circle r={r * 0.18} fill="#d44f78" />
            </g>
          ))}
          <path d="M0 18 Q20 28 36 10 M200 84 Q176 70 158 92" stroke="#7a4a3a" strokeWidth="1.2" fill="none" opacity=".6" />
        </>
      );
    case "forest":
      return (
        <>
          <Sky id="s-forest" stops={[[0, "#2e6a3a"], [0.6, "#5d9a4a"], [1, "#d9c36a"]]}>
            <circle cx="150" cy="30" r="20" fill="#fff0a8" opacity=".35" />
            <circle cx="150" cy="30" r="10" fill="#fff3b8" opacity=".6" />
            {[
              [10, 20, 18],
              [38, 8, 14],
              [24, 52, 16],
              [186, 70, 18],
              [170, 90, 14],
              [60, 78, 12],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? "#3f8040" : "#2a5a30"} opacity=".8" />
            ))}
            <path d="M0 100 L0 84 Q40 74 80 86 T200 82 V100 Z" fill="#244a2c" />
            <g fill="#10201a">
              <ellipse cx="172" cy="90" rx="9" ry="7" />
              <circle cx="172" cy="80" r="5" />
              <path d="M167 78 l2 -6 l3 4 Z M177 78 l-2 -6 l-3 4 Z" />
              <path d="M180 92 q10 0 8 -9" stroke="#10201a" strokeWidth="2" fill="none" />
            </g>
          </Sky>
        </>
      );
  }
}

export { Skyline, Moon, Sun, Cloud, Pines };
