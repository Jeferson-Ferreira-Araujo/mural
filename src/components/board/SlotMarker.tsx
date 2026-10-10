/** Espaço livre do mural (ainda sem mensagem). Mesmo tamanho de uma mensagem; tamanho via font-size do pai. */
export function EmptySlot() {
  return (
    <div
      aria-hidden
      className="grid h-[13em] w-[14em] place-items-center rounded-[0.6em] border-[0.2em] border-dashed border-[#fff3d6]/90 bg-[#fff3d6]/[0.22] text-[#fff3d6] shadow-[0_0_1em_rgba(255,243,214,.3),inset_0_0_1.4em_rgba(255,243,214,.22)] [text-shadow:0_0.06em_0.25em_rgba(0,0,0,.55)]"
    >
      <span className="text-center">
        {/* botão "+" bem visível: convida a colar um pin aqui */}
        <span className="mx-auto mb-[0.45em] grid size-[3em] place-items-center rounded-[0.5em] bg-[#fff3d6] text-[#3b2616] shadow-[0_0.1em_0.4em_rgba(0,0,0,.35)] [text-shadow:none]">
          <svg viewBox="0 0 24 24" className="size-[1.9em]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="block text-[1.9em] leading-[1.05] font-extrabold tracking-wide uppercase">espaço<br />livre</span>
      </span>
    </div>
  );
}

/** Espaço dos 28 que o plano atual (FREE) ainda não libera. */
export function LockedSlot() {
  return (
    <div
      aria-hidden
      className="grid h-[13em] w-[14em] place-items-center rounded-[0.6em] border-[0.16em] border-dotted border-black/30 bg-black/[0.18] text-black/45"
    >
      <span className="text-center">
        <svg viewBox="0 0 24 24" className="mx-auto mb-[0.35em] size-[1.7em]" fill="currentColor">
          <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
        </svg>
        <span className="font-hand text-[1.3em] leading-none">bloqueado</span>
      </span>
    </div>
  );
}
