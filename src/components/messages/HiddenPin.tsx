import type { HiddenItem, Message } from "@/lib/types";
import { MessageView } from "./MessageView";

const LOREM = "Lorem ipsum dolor sit amet consectetur";

/**
 * Cartão com texto de enchimento (nunca o conteúdo de verdade) para desenhar o pin em blur.
 * O servidor só manda o tipo e o estilo visual (cor, papel, letra...), então o mural parece cheio de cards diferentes.
 */
function placeholderFor(h: HiddenItem): Message | null {
  const style = { font: h.font, pin: h.pin, tape: h.tape };
  switch (h.type) {
    case "postit":
      return { id: h.id, type: "postit", color: h.color ?? "yellow", text: LOREM, ...style };
    case "text":
      return { id: h.id, type: "text", variant: h.variant ?? "letter", text: `${LOREM} ${LOREM}`, ...style };
    case "list":
      return { id: h.id, type: "list", title: "Lorem ipsum", items: [{ text: "Lorem ipsum", done: false }, { text: "Dolor sit amet", done: true }, { text: "Consectetur", done: false }], ...style };
    case "photo":
      return { id: h.id, type: "photo", caption: "", scene: "hills", ...style };
    case "music":
      return { id: h.id, type: "music", title: "Lorem ipsum", artist: "Dolor sit", caption: "", playerColor: h.playerColor };
    case "video":
      return { id: h.id, type: "video", caption: "", playerColor: h.playerColor };
    case "voice":
      return { id: h.id, type: "voice", caption: "", playerColor: h.playerColor };
    case "place":
      return { id: h.id, type: "place", name: "Lorem ipsum", address: "", lat: 0, lon: 0, caption: "", playerColor: h.playerColor, blank: true } as Message;
    default:
      return null;
  }
}

/**
 * Espaço ocupado em blur: o conteúdo NÃO veio do servidor (pin aguardando aprovação de outra pessoa ou pin que o dono
 * (FULL) deixou oculto). Mostra o mesmo tipo de card, borrado e sem interação.
 */
export function HiddenPin({ item }: { item: HiddenItem }) {
  const fake = placeholderFor(item);
  return (
    <div aria-label="Pin em blur" role="img" className="relative select-none">
      <div inert aria-hidden className="pointer-events-none" style={{ filter: "blur(0.38em) saturate(0.9)" }}>
        {fake ? (
          <MessageView message={fake} />
        ) : (
          <div className="h-[13.5em] w-[14em] rounded-[0.2em] bg-[#e8dcc0]" />
        )}
      </div>
      <span aria-hidden className="absolute inset-0 grid place-items-center">
        {item.pending ? (
          // aguardando o dono liberar: olho + aviso (os outros veem o pin, mas borrado)
          <span className="flex flex-col items-center gap-[0.45em]">
            <span className="grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]">
              <svg viewBox="0 0 24 24" className="size-[1.4em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="max-w-[11em] rounded-full bg-black/55 px-[0.9em] py-[0.4em] text-center text-[0.68em] leading-tight font-semibold text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.35)]">Aguardando liberação do dono do mural</span>
          </span>
        ) : (
          <span className="grid size-[2.6em] place-items-center rounded-full bg-black/45 text-white shadow-[0_0.2em_0.6em_rgba(0,0,0,.4)]">
            <svg viewBox="0 0 24 24" className="size-[1.3em]" fill="currentColor">
              <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
            </svg>
          </span>
        )}
      </span>
    </div>
  );
}
