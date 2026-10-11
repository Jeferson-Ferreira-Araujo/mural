import type { SceneId } from "./scenes";
import { Corner, LeafIcon, MoonIcon, SunIcon, WidgetFrame } from "./core";

export type TextStyle = "classic" | "night" | "floral" | "natural";

const SCENE: Record<TextStyle, SceneId> = { classic: "parchment", night: "dusk", floral: "floral", natural: "forest" };

/** Frases e versículos: quatro estilos. O texto de hoje vem do servidor e muda sozinho a cada dia. */
export function TextWidget({ style = "classic", text, reference, frame, label }: { style?: string; text?: string; reference?: string | null; frame?: string | null; label: string }) {
  const st: TextStyle = style === "night" || style === "floral" || style === "natural" ? style : "classic";
  const body = text ?? "O texto de hoje aparece aqui.";
  const quote = st !== "natural";
  // a letra cresce até ocupar a área útil do cartão (cerca de 21em × 7em): quanto mais longo o texto, menor, mas sempre o maior que cabe
  const size = Math.min(2.1, Math.max(0.74, Math.sqrt((190 * (reference ? 0.8 : 1)) / (body.length + 6))));
  const font = "var(--font-jakarta), system-ui, sans-serif";
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[1.5em] pt-[1.7em] pb-[0.7em] text-center">
        <p className="leading-[1.26] text-balance [overflow-wrap:anywhere]" style={{ fontFamily: font, fontSize: `${size}em`, fontWeight: 600 }}>
          {quote ? "“" : ""}
          {body}
          {quote ? "”" : ""}
        </p>
        {reference && (
          <p className="mt-[0.35em] text-[0.82em] leading-tight font-bold opacity-90" style={{ fontFamily: font }}>
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
