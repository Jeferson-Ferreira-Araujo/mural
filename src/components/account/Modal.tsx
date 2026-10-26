"use client";

import { useBackClose } from "@/lib/backStack";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/**
 * Onde as janelas do menu da conta aparecem quando o menu é a gaveta: em vez de uma janela por cima, o conteúdo ocupa a parte de baixo da gaveta
 * (abaixo do cabeçalho), com uma seta para voltar ao menu. Sem esse contexto (por exemplo, na coluna do computador), é a janela de sempre.
 */
export const EmbedCtx = createContext<HTMLElement | null>(null);

const ArrowBack = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
);

/** Janela centralizada do menu da conta (abre por cima do menu lateral). */
export function Modal({ open, onClose, title, label, children, wide = false, xl = false, aside, headerLeft, onBack, overlay, footer, danger = false }: { /** seta no canto esquerdo do cabeçalho, antes do título (voltar a uma etapa anterior da própria janela) */ onBack?: () => void; /** barra fixa no pé da janela (sempre visível, fora da rolagem) */ footer?: ReactNode; /** janela de alerta (ex.: excluir a conta): borda, fundo e título em vermelho */ danger?: boolean; aside?: ReactNode; /** cobre a janela inteira (ex.: confirmação de que salvou) */ overlay?: ReactNode; /** no lugar do título, à esquerda do cabeçalho (ex.: botão de voltar) */ headerLeft?: ReactNode; xl?: boolean; open: boolean; onClose: () => void; /** título do cabeçalho; vazio = janela sem título (só o botão de fechar) */ title: string; /** nome da janela para leitores de tela quando não há título */ label?: string; children: ReactNode; wide?: boolean }) {
  const tx = useTranslations("components.account.Modal");
  const tl = useLit();
  const ref = useRef<HTMLDialogElement>(null);
  const slot = useContext(EmbedCtx);
  useBackClose(open, onClose); // o botão voltar (Android) fecha esta janela em vez de sair da página
  useEffect(() => {
    if (slot) return; // embutido: não usa a janela nativa
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, slot]);

  // dentro da gaveta: o conteúdo ocupa a parte de baixo, com a seta de voltar ao menu principal
  if (slot) {
    if (!open) return null;
    return createPortal(
      <div role="region" aria-label={title || label} className={`absolute inset-0 flex flex-col ${danger ? "bg-[#fdf1ed] text-[#4a1d14]" : "bg-[#f7efdc] text-[#2f2218]"}`}>
        <header className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 ${danger ? "border-[#e3b3a8] bg-[#a23b2a] text-white" : "border-[#e6d8bd]"}`}>
          {headerLeft ?? (
            <button type="button" onClick={onBack ?? onClose} aria-label={tx("voltarAoMenu")} title={tx("voltarAoMenu")} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg transition hover:bg-black/5 active:scale-95">
              <ArrowBack />
            </button>
          )}
          {title && <h2 className="font-title min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>}
          {!title && <span className="flex-1" />}
          {aside && <div className="shrink-0">{aside}</div>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-[#e6d8bd] bg-[#f7efdc] px-4 py-3">{footer}</div>}
        {overlay}
      </div>,
      slot,
    );
  }

  return (
    <dialog
      ref={ref}
      // só o "close" desta própria janela conta: o React repassa o de uma janela aninhada (ex.: imagem ampliada na Loja), que não pode fechar esta
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title || label}
      className={`m-auto max-h-[92dvh] ${xl ? "w-[min(96vw,62rem)]" : wide ? "w-[min(94vw,40rem)]" : "w-[min(94vw,32rem)]"} overflow-hidden rounded-3xl border ${danger ? "border-[#d98a7c] bg-[#fdf1ed] text-[#4a1d14]" : "border-[#e6d8bd] bg-[#fbf6ea] text-[#2f2218]"} p-0 shadow-[0_2rem_5rem_rgba(0,0,0,.55)] backdrop:bg-black/60`}
    >
      {open && (
        <div className="relative flex max-h-[92dvh] flex-col">
          <header className={`flex items-center gap-3 px-5 py-3 ${title || headerLeft ? `justify-between border-b ${danger ? "border-[#e3b3a8] bg-[#a23b2a] text-white" : "border-[#e6d8bd]"}` : "justify-end pb-0"}`}>
            {(title || onBack) && (
              <div className="flex min-w-0 items-center gap-1.5">
                {onBack && (
                  <button type="button" onClick={onBack} aria-label={tl("Voltar")} title={tl("Voltar")} className="-ml-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg transition hover:bg-black/5 active:scale-95">
                    <ArrowBack />
                  </button>
                )}
                {title && <h2 className="font-title text-lg font-semibold">{title}</h2>}
              </div>
            )}
            {headerLeft}
            {aside && <div className="ml-auto">{aside}</div>}
            <button type="button" onClick={onClose} aria-label={tx("fechar")} className="grid size-9 cursor-pointer place-items-center rounded-lg text-2xl hover:bg-black/5">
              ×
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="shrink-0 border-t border-[#e6d8bd] bg-[#fbf6ea] px-5 py-3">{footer}</div>}
          {overlay}
        </div>
      )}
    </dialog>
  );
}
