import { useId } from "react";

export type SceneVariant = "sunset" | "hills" | "group";

/** Cena ilustrada (SVG) usada como "foto" nos mocks de Polaroid e vídeo. */
export function Scene({ variant = "sunset" }: { variant?: SceneVariant }) {
  const uid = useId().replace(/:/g, "");
  const warm = variant !== "hills";
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          {warm ? (
            <>
              <stop offset="0" stopColor="#3b4a7a" />
              <stop offset="0.45" stopColor="#d9766b" />
              <stop offset="0.78" stopColor="#f5b46a" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#7fb7d6" />
              <stop offset="0.7" stopColor="#f4e2b8" />
            </>
          )}
        </linearGradient>
        <radialGradient id={`${uid}-sun`}>
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#fff3c400" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${uid}-sky)`} />
      <circle cx={warm ? 120 : 60} cy={warm ? 112 : 70} r={warm ? 52 : 34} fill={`url(#${uid}-sun)`} />
      <circle cx={warm ? 120 : 60} cy={warm ? 112 : 70} r={warm ? 15 : 11} fill="#fff1c0" />
      {warm ? (
        <>
          <path d="M0 140 Q50 120 100 138 T200 128 V200 H0Z" fill="#4a3a58" opacity=".85" />
          <path d="M0 160 Q60 145 120 160 T200 152 V200 H0Z" fill="#2c2438" />
          {variant === "sunset" ? (
            <>
              <circle cx="62" cy="136" r="6" fill="#1a1424" />
              <path d="M54 170 q8 -34 16 0Z" fill="#1a1424" />
              <circle cx="82" cy="140" r="5" fill="#1a1424" />
              <path d="M75 170 q7 -30 14 0Z" fill="#1a1424" />
            </>
          ) : (
            /* grupo de amigos em silhueta */
            <g fill="#150f1e">
              {[38, 66, 94, 122, 150].map((x, i) => (
                <g key={x} transform={`translate(${x} ${i % 2 ? 6 : 0})`}>
                  <circle cx="0" cy="120" r="7.5" />
                  <path d="M-10 175 q10 -48 20 0Z" />
                </g>
              ))}
            </g>
          )}
        </>
      ) : (
        <>
          <path d="M0 130 Q40 90 90 125 T200 110 V200 H0Z" fill="#8fb27a" />
          <path d="M0 160 Q70 120 130 158 T200 145 V200 H0Z" fill="#6a9461" />
          <path d="M0 185 Q80 165 200 182 V200 H0Z" fill="#4f7a4e" />
        </>
      )}
    </svg>
  );
}
