/** Selo discreto sobre o quadro desfocado (a pergunta fica no cartão ao lado). */
export function LockedNotice({ dark = false }: { hasSelection?: boolean; dark?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center px-4">
      <p
        className={`rise flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.3)] ${
          dark ? "bg-[#1c1510]/85 text-[#fbf3e2] backdrop-blur" : "bg-[#fbf6ea]/95 text-[#2a1c12]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
          <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
        </svg>
        Mural privado
      </p>
    </div>
  );
}
