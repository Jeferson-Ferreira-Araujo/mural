"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useLit } from "@/i18n/literal";
import { handOf } from "@/lib/style";
import { fitSize } from "@/lib/fitText";
import type { Message, SealStyle } from "@/lib/types";
import { useInDetail } from "../board/ListEditContext";
import { Pin } from "./Pin";

type Seal = Extract<Message, { type: "seal" }>;

/** Cores de cada estilo de envelope (a arte inteira é desenhada em SVG, sem imagens). */
type Look = { body: string; flap: string; edge: string; wax: [string, string]; heart: string; paper: string; ink: string; twine?: boolean; flowers?: boolean; leaf?: boolean; air?: boolean; gold?: boolean };
export const SEAL_LOOK: Record<SealStyle, Look> = {
  classica: { body: "#eadfc6", flap: "#f5ecd7", edge: "#cdbb94", wax: ["#e0454a", "#9c1c1f"], heart: "#f6c9c4", paper: "#f7f1df", ink: "#3b2f4a", twine: true, flowers: true },
  minimalista: { body: "#f2ead9", flap: "#f9f3e6", edge: "#d9ccb4", wax: ["#e8c777", "#b48a2c"], heart: "#fbeabb", paper: "#fbf8ef", ink: "#3a3a46" },
  colorida: { body: "#f3b6bf", flap: "#f9cfd5", edge: "#e08f9c", wax: ["#f6c6cf", "#dd8497"], heart: "#fff0f2", paper: "#fdeaec", ink: "#6a2f45", flowers: true },
  rustica: { body: "#c9a36f", flap: "#d6b585", edge: "#a98351", wax: ["#c3382c", "#7d1810"], heart: "#f0b8ae", paper: "#f1e3c4", ink: "#4a3320", twine: true, leaf: true },
  elegante: { body: "#1f3b6b", flap: "#294a83", edge: "#142a4e", wax: ["#ecc56d", "#a97a1f"], heart: "#fff1c9", paper: "#f4eddb", ink: "#1f2c4a", gold: true },
  tematica: { body: "#f7f1e2", flap: "#f7f1e2", edge: "#d8cdb3", wax: ["#e0454a", "#9c1c1f"], heart: "#f9d3cf", paper: "#fbf7ec", ink: "#2c3a5e", air: true },
};

export const SEAL_LABEL: Record<SealStyle, string> = { classica: "Clássica", minimalista: "Minimalista", colorida: "Colorida", rustica: "Rústica", elegante: "Elegante", tematica: "Temática" };

const HEART = "M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9Z";

function Flower({ x, y, r = 3 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={0} cy={-r} r={r * 0.72} fill="#fffdf6" stroke="#e7dcc4" strokeWidth={0.3} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.42} fill="#e8b93e" />
    </g>
  );
}

/** O envelope fechado (ou, com `open`, aberto, com a aba para cima). Desenhado em 140 × 98. */
export function EnvelopeArt({ look, open = false, part = "back", className = "" }: { look: Look; open?: boolean; /** aberto: "back" = fundo com a aba para cima; "front" = o bolso da frente (a folha fica entre os dois) */ part?: "back" | "front"; className?: string }) {
  const id = useId().replace(/:/g, "");
  if (open && part === "front") {
    return (
      <svg viewBox="0 -42 140 140" className={className} aria-hidden>
        <defs>
          <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".22" />
            <stop offset="1" stopColor="#000" stopOpacity=".14" />
          </linearGradient>
        </defs>
        <path d="M1 34 70 66 139 34V94a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3Z" fill={look.body} stroke={look.edge} strokeWidth="1" strokeLinejoin="round" />
        <path d="M1 34 70 66 139 34V94a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3Z" fill={`url(#f${id})`} />
        <path d="M1 97 52 58M139 97 88 58" stroke={look.edge} strokeWidth="0.9" fill="none" />
        {look.air && <path d="M1 34 70 66 139 34" fill="none" stroke="#d9434a" strokeWidth="2" strokeDasharray="6 6" />}
        {look.gold && <path d="M6 40 70 69 134 40" fill="none" stroke="#d9b45a" strokeWidth="0.8" />}
      </svg>
    );
  }
  return (
    <svg viewBox={open ? "0 -42 140 140" : "0 0 140 98"} className={className} aria-hidden>
      <defs>
        <radialGradient id={`w${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={look.wax[0]} />
          <stop offset="1" stopColor={look.wax[1]} />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </linearGradient>
        {look.air && (
          <pattern id={`a${id}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="6" height="12" fill="#d9434a" />
            <rect x="6" width="6" height="12" fill="#3b5fa8" />
          </pattern>
        )}
      </defs>
      {/* corpo */}
      <rect x="1" y="1" width="138" height="96" rx="3" fill={look.body} stroke={look.edge} strokeWidth="1" />
      {look.air && <rect x="1" y="1" width="138" height="96" rx="3" fill="none" stroke={`url(#a${id})`} strokeWidth="5" />}
      {look.gold && <rect x="6" y="6" width="128" height="86" rx="2" fill="none" stroke="#d9b45a" strokeWidth="0.8" />}
      {/* dobras de baixo (fechado) */}
      {!open && (
        <>
          <path d="M1 97 70 50 139 97" fill="none" stroke={look.edge} strokeWidth="0.9" />
          <path d="M1 1 70 50 1 97Z" fill="#000" opacity=".05" />
          <path d="M139 1 70 50 139 97Z" fill="#000" opacity=".05" />
        </>
      )}
      <rect x="1" y="1" width="138" height="96" rx="3" fill={`url(#s${id})`} />
      {open ? (
        // aba aberta, para cima
        <path d="M1 1 70 -36 139 1Z" fill={look.flap} stroke={look.edge} strokeWidth="1" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M1 1H139L70 58Z" fill={look.flap} stroke={look.edge} strokeWidth="1" strokeLinejoin="round" />
          <path d="M1 1H139L70 58Z" fill={`url(#s${id})`} opacity=".7" />
        </>
      )}
      {!open && look.air && (
        // selo postal e carimbo
        <g>
          <rect x="105" y="10" width="24" height="29" fill="#fffaf0" stroke="#bdb192" strokeWidth="0.8" />
          <rect x="108.5" y="13.5" width="17" height="22" fill="#cfd6e4" stroke="#8d97ad" strokeWidth="0.5" />
          <circle cx="117" cy="22" r="4.5" fill="#9aa4bd" />
          <path d="M110 34c3-5 5-5 7-2s5 2 8-3v5h-15Z" fill="#7f8aa6" />
          <g fill="none" stroke="#6b6f7f" strokeWidth="0.7" opacity=".7">
            <circle cx="96" cy="26" r="9" />
            <path d="M82 20c4-2 7 2 11 0M82 25c4-2 7 2 11 0M82 30c4-2 7 2 11 0" />
          </g>
        </g>
      )}
      {!open && (
        <>
          {/* barbante */}
          {look.twine && (
            <g fill="none" stroke="#b58f55" strokeWidth="1.3" strokeLinecap="round">
              <path d="M40 8c8 22 22 38 30 48M100 8C92 30 80 44 70 56" opacity=".75" />
              <path d="M70 62c-12 2-22-4-27-12 8-3 20 0 27 8Z" />
              <path d="M70 62c12 2 22-4 27-12-8-3-20 0-27 8Z" />
              <path d="M66 68c-6 9-12 14-18 16M74 68c6 9 12 14 18 16" />
            </g>
          )}
          {/* lacre de cera com coração */}
          <g>
            <circle cx="70" cy="58" r="14.5" fill="#000" opacity=".18" transform="translate(1 1.5)" />
            <circle cx="70" cy="58" r="14" fill={`url(#w${id})`} />
            <circle cx="70" cy="58" r="10.2" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="1" />
            <path d={HEART} fill={look.heart} transform="translate(63.5 51.5) scale(.54)" />
            <ellipse cx="64" cy="51" rx="4.5" ry="2.2" fill="#fff" opacity=".25" transform="rotate(-30 64 51)" />
          </g>
          {look.flowers && (
            <g>
              <path d="M76 52c6-8 12-14 20-20M82 50c3-5 8-9 14-12" fill="none" stroke="#6f9a55" strokeWidth="1" strokeLinecap="round" />
              <Flower x={95} y={30} r={3.2} />
              <Flower x={101} y={38} r={2.6} />
              <Flower x={89} y={37} r={2.4} />
              <ellipse cx="84" cy="46" rx="4" ry="1.8" fill="#8db86a" transform="rotate(-35 84 46)" />
            </g>
          )}
          {look.leaf && (
            <g fill="#6d8f4e" stroke="#4f6e37" strokeWidth="0.4">
              <path d="M80 54c8-14 16-20 28-22" fill="none" stroke="#4f6e37" strokeWidth="1" strokeLinecap="round" />
              {[[88, 46, -50], [93, 41, -30], [99, 37, -10], [104, 34, 10], [90, 51, 40], [97, 46, 25]].map(([x, y, a], i) => (
                <ellipse key={i} cx={x} cy={y} rx="5" ry="2.2" transform={`rotate(${a} ${x} ${y})`} />
              ))}
            </g>
          )}
        </>
      )}
    </svg>
  );
}

const fmtDate = (iso: string, locale: string) => {
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString();
  }
};
const fmtTime = (iso: string, locale: string) => {
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString();
  }
};

/** Contagem regressiva (só no detalhe do pin): dias, horas, minutos e segundos até a abertura. Ao zerar, pede ao mural que recarregue (uma vez). */
function Countdown({ opensAt }: { opensAt: string }) {
  const tl = useLit();
  const locale = useLocale();
  const [now, setNow] = useState<number | null>(null);
  const reloaded = useRef(false);
  useEffect(() => {
    const t = () => setNow(Date.now());
    t();
    const i = setInterval(t, 1000);
    return () => clearInterval(i);
  }, []);
  const ms = now === null ? null : Math.max(0, new Date(opensAt).getTime() - now);
  useEffect(() => {
    if (ms === 0 && !reloaded.current) {
      reloaded.current = true;
      window.dispatchEvent(new Event("pinz:reload-board"));
    }
  }, [ms]);
  const total = ms === null ? 0 : Math.floor(ms / 1000);
  const cells: [number, string][] = [
    [Math.floor(total / 86400), tl("dias")],
    [Math.floor((total % 86400) / 3600), tl("horas")],
    [Math.floor((total % 3600) / 60), tl("min")],
    [total % 60, tl("seg")],
  ];
  return (
    <div className="mx-auto w-[15.6em] rounded-[0.9em] bg-[#fff8ea] px-[0.9em] py-[0.8em] text-center text-[#3a2c1d] shadow-[0_0.4em_1.4em_rgba(30,12,0,.4)]">
      <p className="text-[1.02em] font-bold">{tl("Carta Selada")}</p>
      <p className="mt-[0.25em] text-[0.72em] leading-tight text-[#6b5440]">{tl("Essa carta será aberta em:")}</p>
      <div className="mt-[0.6em] grid grid-cols-4 gap-[0.35em]" role="timer" aria-live="off">
        {cells.map(([n, label]) => (
          <div key={label} className="rounded-[0.5em] bg-[#f0e4c8] py-[0.4em]">
            <div className="font-title text-[1.25em] leading-none font-semibold tabular-nums">{ms === null ? "–" : String(n).padStart(2, "0")}</div>
            <div className="mt-[0.2em] text-[0.58em] leading-none text-[#6b5440]">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-[0.65em] flex items-center justify-center gap-[0.4em] text-[0.7em] text-[#4a3826]">
        <svg viewBox="0 0 24 24" className="size-[1.2em] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span>
          {fmtDate(opensAt, locale)} · {fmtTime(opensAt, locale)}
        </span>
      </p>
    </div>
  );
}

/**
 * Carta ainda fechada: o envelope lacrado com a etiqueta da data. No detalhe do pin ele escurece e a contagem regressiva aparece por cima.
 * Só recebe o estilo e a data: o conteúdo nem existe aqui.
 */
export function ClosedSeal({ style, opensAt }: { style?: SealStyle; opensAt: string }) {
  const tl = useLit();
  const locale = useLocale();
  const inDetail = useInDetail();
  const look = SEAL_LOOK[style ?? "classica"];
  const hand = handOf("caveat");
  return (
    <article aria-label={tl("Carta Selada fechada")} className="relative w-[14em]">
      <div className={inDetail ? "brightness-[.55] saturate-[.8]" : ""}>
        <EnvelopeArt look={look} className="block w-full drop-shadow-[0_0.3em_0.35em_rgba(40,18,0,.45)]" />
      </div>
      <Pin tone="red" className="top-[0.35em] left-[6.24em]" />
      {inDetail ? (
        <div className="absolute inset-x-0 bottom-[-6.4em] z-20">
          <Countdown opensAt={opensAt} />
        </div>
      ) : (
        <div className="absolute right-[-0.4em] bottom-[-2.6em] z-10 w-[6.8em] rotate-[-5deg] rounded-[0.25em] bg-[#ead7aa] px-[0.5em] pt-[0.7em] pb-[0.55em] text-center text-[#4a3320] shadow-[0_0.2em_0.45em_rgba(40,18,0,.4)]">
          <span aria-hidden className="absolute top-[0.25em] left-1/2 size-[0.5em] -translate-x-1/2 rounded-full bg-[#7b5f3a]/60" />
          <p className="leading-[1] font-semibold" style={{ fontFamily: hand.family, fontSize: `${1.05 * hand.scale}em` }}>
            {tl("Abrir em")}
          </p>
          <p className="mt-[0.1em] leading-[1.05]" style={{ fontFamily: hand.family, fontSize: `${1.05 * hand.scale}em` }}>
            {fmtDate(opensAt, locale)}
          </p>
          <span aria-hidden className="mt-[0.2em] block text-[0.7em] leading-none text-[#c9524f]">
            ♥
          </span>
        </div>
      )}
    </article>
  );
}

const Clip = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="size-[1.1em] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const ICON = {
  photo: "M4 7h3l1.5-2h7L17 7h3v12H4V7Zm8 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  video: "M4 6h11v12H4V6Zm11 4 5-3v10l-5-3",
  voice: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-6 9a6 6 0 0 0 12 0M12 18v3",
};

/**
 * Carta aberta (depois da data). No mural: o envelope aberto com a folha à mostra e o começo do texto.
 * No detalhe: a carta inteira, com o texto, a foto, o vídeo e o áudio.
 */
export function OpenSeal({ m }: { m: Seal }) {
  const tl = useLit();
  const inDetail = useInDetail();
  const look = SEAL_LOOK[m.style] ?? SEAL_LOOK.classica;
  const hand = handOf(m.font);

  if (!inDetail) {
    const size = fitSize(m.text, { w: 10.4, h: 5.2, lh: 1.15, max: 1.4, min: 0.9, hand: hand.scale });
    return (
      <article aria-label={tl("Carta Selada aberta")} className="relative h-[14em] w-[14em]">
        <EnvelopeArt look={look} open part="back" className="absolute inset-0 block size-full drop-shadow-[0_0.3em_0.35em_rgba(40,18,0,.4)]" />
        {/* a folha sai do envelope */}
        <div className="absolute inset-x-[1.3em] top-[2.3em] bottom-[3em] rotate-[-1.2deg] overflow-hidden rounded-[0.2em] px-[0.8em] pt-[0.8em] shadow-[0_-0.1em_0.5em_rgba(40,18,0,.25)]" style={{ background: look.paper, backgroundImage: "repeating-linear-gradient(180deg, transparent 0, transparent 1.18em, rgba(120,100,70,.18) 1.18em, rgba(120,100,70,.18) calc(1.18em + 1px))" }}>
          <p className="line-clamp-5 leading-[1.18] [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${size * hand.scale}em`, color: look.ink }}>
            {m.text}
          </p>
        </div>
        <EnvelopeArt look={look} open part="front" className="pointer-events-none absolute inset-0 block size-full" />
        {(m.src || m.video || m.voice) && (
          <p className="absolute right-[1.4em] bottom-[0.7em] z-10 flex items-center gap-[0.45em] text-[0.85em] opacity-80" style={{ color: look.ink }} aria-hidden>
            {m.src && <Clip d={ICON.photo} />}
            {m.video && <Clip d={ICON.video} />}
            {m.voice && <Clip d={ICON.voice} />}
          </p>
        )}
        <Pin tone="red" className="top-[0.35em] left-[6.24em]" />
      </article>
    );
  }

  // detalhe: a carta inteira
  const media = !!(m.src || m.video || m.voice);
  const size = fitSize(m.text, { w: 14.2, h: media ? 8 : 15, lh: 1.15, max: 1.5, min: 0.85, hand: hand.scale });
  return (
    <article aria-label={tl("Carta Selada aberta")} className="relative w-[18em] rounded-[0.4em] p-[0.9em] shadow-[0_0.4em_1.4em_rgba(30,12,0,.4)]" style={{ background: look.body, border: `0.12em solid ${look.edge}` }}>
      <div className="rounded-[0.25em] px-[1em] py-[0.9em]" style={{ background: look.paper, backgroundImage: "repeating-linear-gradient(180deg, transparent 0, transparent 1.18em, rgba(120,100,70,.16) 1.18em, rgba(120,100,70,.16) calc(1.18em + 1px))" }}>
        <p className="leading-[1.18] whitespace-pre-line [overflow-wrap:anywhere]" style={{ fontFamily: hand.family, fontSize: `${size * hand.scale}em`, color: look.ink }}>
          {m.text}
        </p>
      </div>
      {media && (
        <div className="mt-[0.8em] space-y-[0.6em]">
          {m.src && (
            <div className="mx-auto w-fit rotate-[-1.5deg] bg-[#fdfcf7] p-[0.45em] shadow-[0_0.15em_0.5em_rgba(0,0,0,.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.src} alt={tl("Foto da carta")} className="block max-h-[9em] max-w-[15em] object-contain" draggable={false} />
            </div>
          )}
          {m.video && (
            <video src={m.video} controls playsInline preload="metadata" aria-label={tl("Vídeo da carta")} className="block max-h-[9.5em] w-full rounded-[0.35em] bg-black" />
          )}
          {m.voice && <audio src={m.voice} controls preload="metadata" aria-label={tl("Áudio da carta")} className="block h-[2.6em] w-full" />}
        </div>
      )}
      <Pin tone="red" className="top-[0.1em] left-[8.2em]" />
    </article>
  );
}

/** Altura (em `em`) que a carta aberta ocupa no detalhe, para o detalhe escolher o tamanho da letra. */
export function sealDetailSize(m: Pick<Seal, "src" | "video" | "voice">) {
  const media = !!(m.src || m.video || m.voice);
  return { h: media ? 9 + (m.src ? 10.6 : 0) + (m.video ? 10.1 : 0) + (m.voice ? 3.2 : 0) + 3 : 20, w: 19 };
}
