/** Aviso sobre o quadro desfocado. */
export function LockedNotice({ hasSelection, dark = false }: { hasSelection: boolean; dark?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center px-4">
      <p
        className={`rise flex max-w-[20rem] items-center gap-3 rounded-2xl px-5 py-3.5 text-center text-[15px] font-semibold shadow-[0_0.8rem_2rem_rgba(0,0,0,.35)] ${
          dark ? "bg-[#1c1510]/85 text-[#fbf3e2] backdrop-blur" : "bg-[#fbf6ea]/95 text-[#2a1c12]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
          <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
        </svg>
        {hasSelection ? "Responda a pergunta para revelar o mural" : "Procure alguém pelo nickname para ver o mural"}
      </p>
    </div>
  );
}
