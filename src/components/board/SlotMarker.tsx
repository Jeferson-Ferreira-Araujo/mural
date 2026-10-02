/** Espaço livre do mural (ainda sem mensagem). Mesmo tamanho de uma mensagem; tamanho via font-size do pai. */
export function EmptySlot() {
  return (
    <div
      aria-hidden
      className="grid h-[13em] w-[14em] place-items-center rounded-[0.6em] border-[0.16em] border-dashed border-[#fff3d6]/55 bg-[#fff3d6]/[0.08] text-[#fff3d6]/75"
    >
      <span className="text-center">
        <span className="mx-auto mb-[0.3em] block size-[0.9em] rounded-full border-[0.14em] border-current" />
        <span className="font-hand text-[1.4em] leading-none">espaço livre</span>
      </span>
    </div>
  );
}

/** Espaço dos 15 que o plano atual (FREE) ainda não libera. */
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
