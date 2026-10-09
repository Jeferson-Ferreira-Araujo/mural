import type { SceneId } from "./scenes";
import { Corner, LeafIcon, MoonIcon, SunIcon, WidgetFrame } from "./core";

export type TextStyle = "classic" | "night" | "floral" | "natural";

const SCENE: Record<TextStyle, SceneId> = { classic: "parchment", night: "dusk", floral: "floral", natural: "forest" };

/** Frases e versículos: quatro estilos. O texto de hoje vem do servidor e muda sozinho a cada dia. */
export function TextWidget({ style = "classic", text, reference, frame, label }: { style?: string; text?: string; reference?: string | null; frame?: string | null; label: string }) {
  const st: TextStyle = style === "night" || style === "floral" || style === "natural" ? style : "classic";
  const body = text ?? "O texto de hoje aparece aqui.";
  const quote = st !== "natural";
  // textos longos pedem letra menor para caber no cartão
  const size = body.length <= 50 ? 1.75 : body.length <= 90 ? 1.45 : body.length <= 140 ? 1.18 : body.length <= 200 ? 0.98 : 0.84;
  const serif = st === "natural" ? "var(--font-patrick), cursive" : "var(--font-playfair), Georgia, serif";
  return (
    <WidgetFrame frame={frame} label={label} scene={SCENE[st]}>
      {st === "classic" && (
        <Corner side="left">
          <LeafIcon />
        </Corner>
      )}
      {st === "night" && (
        <>
          <Corner side="left">
            <LeafIcon />
          </Corner>
          <Corner side="right">
            <MoonIcon />
          </Corner>
        </>
      )}
      {st === "natural" && (
        <Corner side="right">
          <SunIcon />
        </Corner>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[3.2em] pt-[0.3em] pb-[0.6em] text-center">
        <p className="leading-[1.18] [overflow-wrap:anywhere]" style={{ fontFamily: serif, fontSize: `${size}em`, fontStyle: st === "natural" ? "normal" : "italic", fontWeight: st === "natural" ? 600 : 500 }}>
          {quote ? "“" : ""}
          {body}
          {quote ? "”" : ""}
        </p>
        {reference && (
          <p className="mt-[0.3em] text-[0.8em] leading-tight font-semibold opacity-85" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            {reference}
          </p>
        )}
        {st === "floral" && !reference && (
          <svg viewBox="0 0 24 24" className="mt-[0.25em] size-[1.1em]" aria-hidden>
            <path d="M12 21s-7-4.6-9.2-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.2 12C19 16.4 12 21 12 21Z" fill="#e0537f" />
          </svg>
        )}
      </div>
    </WidgetFrame>
  );
}
