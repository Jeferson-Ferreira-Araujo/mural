import { useEffect, useState } from "react";
import type { HiddenItem, Message } from "@/lib/types";
import { useInDetail } from "../board/ListEditContext";
import { MessageView } from "./MessageView";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";
import { useSecretToggle } from "./SecretContext";

/** Imagem transparente de 1×1: só para a foto de enchimento ter fita (como a de verdade) sem mostrar nada. */
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const LOREM = "——— ———— —— ————— ——— ———— ——";

/**
 * Cartão com texto de enchimento (nunca o conteúdo de verdade) para desenhar o pin em blur.
 * O servidor só manda o tipo e o estilo visual (cor, papel, letra...), então o mural parece cheio de cards diferentes.
 */
export function placeholderFor(h: HiddenItem): Message | null {
  const style = { font: h.font, pin: h.pin, tape: h.tape, pos: h.pos };
  switch (h.type) {
    case "postit":
      return { id: h.id, type: "postit", color: h.color ?? "yellow", text: LOREM, ...style };
    case "text":
      return { id: h.id, type: "text", variant: h.variant ?? "letter", text: `${LOREM} ${LOREM}`, ...style };
    case "list":
      return { id: h.id, type: "list", title: "————— ———", items: [{ text: "———— ———", done: false }, { text: "—— ————— ——", done: true }, { text: "———— ——", done: false }], ...style };
    case "photo":
      return { id: h.id, type: "photo", caption: "", scene: "hills", src: h.media ? PIXEL : undefined, ratio: h.ratio, ...style };
    case "draw":
      return { id: h.id, type: "draw", caption: "", ...style };
    case "music":
      return { id: h.id, type: "music", title: "————— ———", artist: "———— ——", caption: "", playerColor: h.playerColor };
    case "video":
      return { id: h.id, type: "video", caption: "", playerColor: h.playerColor };
    case "voice":
      return { id: h.id, type: "voice", caption: "", playerColor: h.playerColor };
    case "place":
      return { id: h.id, type: "place", name: "————— ———", address: "", lat: 0, lon: 0, caption: "", playerColor: h.playerColor, blank: true } as Message;
    default:
      return null;
  }
}

/**
 * Espaço ocupado em blur: o conteúdo NÃO veio do servidor (pin aguardando aprovação de outra pessoa ou pin que o dono
 * (PINZ+) deixou oculto). Mostra o mesmo tipo de card, borrado e sem interação.
 */
/** Selo no meio do pin em segredo (virado de costas): só o olho fechado, sem texto. */
export function SecretBadge({ locked = false, what = "pin", scale = "2.4em" }: { /** quem vê não tem permissão para revelar (visitante): tocar no selo avisa */ locked?: boolean; /** o que está em segredo (muda o texto do aviso) */ what?: "pin" | "display"; /** tamanho do selo no mural (no detalhe é sempre 1em) */ scale?: string }) {
  const tx = useTranslations("components.messages.HiddenPin");
  const tl = useLit();
  const inDetail = useInDetail();
  const sec = useSecretToggle(); // no detalhe, quem pode ver o pin revela e esconde pelo selo
  const [warn, setWarn] = useState(false);
  useEffect(() => {
    if (!warn) return;
    const t = window.setTimeout(() => setWarn(false), 3000);
    return () => window.clearTimeout(t);
  }, [warn]);
  const noPerm = what === "display" ? tl("Você não tem permissão para ver esse display.") : tl("Você não tem permissão para ver esse pin.");
  // no detalhe (janela por cima de tudo) o aviso aparece ali mesmo; no mural, vira o aviso comum da tela
  const action = sec ? () => sec.toggle() : locked ? () => (inDetail ? setWarn(true) : window.dispatchEvent(new CustomEvent("pinz:notify", { detail: noPerm }))) : null;
  const cls = "grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]";
  const icon = (
    <svg viewBox="0 0 24 24" className="size-[1.4em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
  return (
    <span className="pz-fade pointer-events-none absolute inset-0 z-30 grid place-items-center" style={{ fontSize: inDetail ? "1em" : scale }}>
      {action ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            action();
          }}
          aria-label={sec ? tl("Visualizar pin") : tx("segredo")}
          title={sec ? tl("Visualizar pin") : tx("segredo")}
          className={`${cls} pointer-events-auto cursor-pointer transition hover:bg-black/65 active:scale-95`}
        >
          {icon}
        </button>
      ) : (
        <span role="img" aria-label={tx("segredo")} className={cls}>
          {icon}
        </span>
      )}
      {warn && (
        <span role="status" className="pz-fade absolute top-[calc(50%+2.2em)] left-1/2 w-max max-w-[90%] -translate-x-1/2 rounded-xl bg-black/80 px-[1em] py-[0.5em] text-center text-[0.9em] font-semibold text-white shadow-lg">
          {noPerm}
        </span>
      )}
    </span>
  );
}

export function HiddenPin({ item }: { item: HiddenItem }) {
  const tx = useTranslations("components.messages.HiddenPin");
  const inDetail = useInDetail();
  const fake = placeholderFor(item);
  return (
    <div aria-label={tx("pinEmSegredo")} role="img" className="relative select-none">
      <div inert aria-hidden className="pointer-events-none" style={{ filter: "blur(0.38em) saturate(0.9)" }}>
        {fake ? (
          <MessageView message={fake} />
        ) : (
          <div className="h-[13.5em] w-[14em] rounded-[0.2em] bg-[#e8dcc0]" />
        )}
      </div>
      <span aria-hidden className={item.backdrop ? "hidden" : "absolute inset-0 grid place-items-center"} style={{ fontSize: inDetail ? "1em" : item.pending ? "1.4em" : "2.4em" }}>
        {item.pending ? (
          // aguardando o dono liberar: olho + aviso (os outros veem o pin, mas borrado)
          <span className="flex flex-col items-center gap-[0.45em]">
            <span className="grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]">
              <svg viewBox="0 0 24 24" className="size-[1.4em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="max-w-[9.5em] rounded-lg bg-black/55 px-[0.9em] py-[0.4em] text-center text-[0.85em] leading-tight font-semibold text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.35)]">{tx("aguardandoLiberacaoDoDonoDo")}</span>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-[0.45em]">
            <span className="grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]">
              <svg viewBox="0 0 24 24" className="size-[1.3em]" fill="currentColor">
                <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
              </svg>
            </span>
            <span className="rounded-lg bg-black/55 px-[0.9em] py-[0.4em] text-center text-[0.85em] leading-tight font-semibold text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.35)]">{tx("segredo")}</span>
          </span>
        )}
      </span>
    </div>
  );
}
