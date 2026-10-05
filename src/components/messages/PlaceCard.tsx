"use client";

import { useState } from "react";
import type { PlayerColor } from "@/lib/types";
import { CaptionNote } from "./CaptionNote";
import { PLAYER_PALETTE } from "./playerPalette";

const MIN_ZOOM = 4;
const MAX_ZOOM = 18;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
/** O lugar fica um pouco abaixo do meio, para o pino não ficar escondido atrás do cartão do topo (o servidor já centraliza o mapa assim). */
const FOCUS_Y = 62;

/** Link para abrir o lugar no Google Maps (não precisa de chave). */
export const mapsUrl = (lat: number, lon: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

/**
 * Local: um mini aparelho de mapa (visto de frente) com cartão do lugar, zoom e botão para abrir no Maps.
 * O mapa é uma imagem do Google Maps, pedida ao nosso servidor (a chave fica lá). A mensagem curta, se houver, vai num papelzinho embaixo.
 */
export function PlaceCard({
  name,
  address,
  lat,
  lon,
  caption,
  color = "silver",
  blank = false,
}: {
  name: string;
  address: string;
  lat: number;
  lon: number;
  caption: string;
  color?: PlayerColor;
  /** só o desenho (pin em blur): não carrega o mapa */
  blank?: boolean;
}) {
  const look = PLAYER_PALETTE[color];
  const [zoom, setZoom] = useState(14);
  const zoomBtn = "grid size-[1.7em] cursor-pointer place-items-center text-[1.05em] leading-none font-bold text-[#2f3a4a] transition hover:bg-black/5 active:bg-black/10 disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2a6fd6]";

  return (
    <article aria-label="Local no mapa" className="relative w-[14em]">
      {/* corpo do aparelho */}
      <div
        className="relative rounded-[1.1em] p-[0.55em]"
        style={{
          background: `linear-gradient(172deg, ${look.body[0]} 0%, ${look.body[1]} 46%, ${look.body[2]} 100%)`,
          boxShadow: [
            `inset 0 0 0 0.09em ${look.rim}`,
            "inset 0.1em 0.14em 0.2em rgba(255,255,255,.45)",
            "inset -0.1em -0.16em 0.24em rgba(0,0,0,.45)",
            "0 0.06em 0.1em rgba(40,20,5,.35)",
            "0.14em 0.55em 0.75em -0.1em rgba(40,20,5,.45)",
            "0.32em 1.1em 1.3em -0.3em rgba(40,20,5,.35)",
          ].join(", "),
        }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.1em]" style={{ background: "linear-gradient(150deg, rgba(255,255,255,.36) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 70%, rgba(255,255,255,.12) 100%)" }} />

        {/* tela do mapa */}
        <div className="relative rounded-[0.7em] bg-black p-[0.16em]" style={{ boxShadow: "inset 0 0 0 0.06em rgba(255,255,255,.1), 0 0.08em 0.1em rgba(255,255,255,.4), inset 0 0.2em 0.5em rgba(0,0,0,.8)" }}>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.55em] bg-[#e9e4d8]">
            {/* mapa do Google */}
            {!blank && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/places/map?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&z=${zoom}`}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                draggable={false}
                className="absolute inset-0 size-full select-none object-cover"
              />
            )}

            {/* marcador no centro */}
            <svg aria-hidden viewBox="0 0 24 32" className="pointer-events-none absolute left-1/2 h-[2.2em] w-[1.65em] -translate-x-1/2 -translate-y-full drop-shadow-[0_0.15em_0.12em_rgba(0,0,0,.45)]" style={{ top: `${FOCUS_Y}%` }}>
              <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 32 12 32s12-12 12-20.3C24 5.2 18.6 0 12 0Z" fill="#e53935" />
              <circle cx="12" cy="11.5" r="4.4" fill="#fff" />
            </svg>
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 mt-[0.2em] max-w-[8em] -translate-x-1/2 truncate text-[0.58em] leading-tight font-bold text-[#1f2933]"
              style={{ top: `${FOCUS_Y}%`, textShadow: "0 0 0.25em #fff, 0 0 0.25em #fff, 0 0 0.25em #fff, 0 0 0.25em #fff" }}
            >
              {name}
            </span>

            {/* cartão do lugar */}
            <div className="absolute top-[0.45em] left-[0.45em] flex max-w-[78%] items-center gap-[0.45em] rounded-[0.55em] bg-white/95 p-[0.35em] pr-[0.6em] shadow-[0_0.15em 0.4em_rgba(0,0,0,.3)]" style={{ boxShadow: "0 0.15em 0.4em rgba(0,0,0,.3)" }}>
              <span aria-hidden className="grid size-[2.1em] shrink-0 place-items-center rounded-[0.4em] text-white" style={{ background: "linear-gradient(135deg, #5aa5ff, #1c52b0)" }}>
                <svg viewBox="0 0 24 32" className="h-[1.2em]" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 32 12 32s12-12 12-20.3C24 5.2 18.6 0 12 0Zm0 16a4.3 4.3 0 1 1 0-8.6A4.3 4.3 0 0 1 12 16Z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.7em] leading-tight font-bold text-[#1f2933]">{name}</span>
                {address && <span className="block truncate text-[0.52em] leading-tight text-[#5b6675]">{address}</span>}
              </span>
            </div>

            {/* abrir no Maps */}
            <a
              href={mapsUrl(lat, lon)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir ${name} no Google Maps`}
              title="Abrir no Google Maps"
              className="absolute top-[0.45em] right-[0.45em] grid size-[1.9em] place-items-center rounded-[0.5em] bg-white/95 text-[#2f3a4a] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-[#2a6fd6]"
              style={{ boxShadow: "0 0.15em 0.4em rgba(0,0,0,.3)" }}
            >
              <svg viewBox="0 0 24 24" className="size-[0.95em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
              </svg>
            </a>

            {/* zoom */}
            <div className="absolute right-[0.45em] bottom-[0.9em] flex flex-col overflow-hidden rounded-[0.5em] bg-white/95 divide-y divide-black/10" style={{ boxShadow: "0 0.15em 0.4em rgba(0,0,0,.3)" }}>
              <button type="button" aria-label="Aproximar o mapa" onClick={() => setZoom((z) => clamp(z + 1, MIN_ZOOM, MAX_ZOOM))} disabled={zoom >= MAX_ZOOM} className={zoomBtn}>
                +
              </button>
              <button type="button" aria-label="Afastar o mapa" onClick={() => setZoom((z) => clamp(z - 1, MIN_ZOOM, MAX_ZOOM))} disabled={zoom <= MIN_ZOOM} className={zoomBtn}>
                −
              </button>
            </div>

          </div>
        </div>
      </div>

      {caption && <CaptionNote>{caption}</CaptionNote>}
    </article>
  );
}
