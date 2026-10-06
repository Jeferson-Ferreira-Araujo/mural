"use client";

type Props = { title: string; /** caminho a compartilhar (padrão: a página atual) */ path?: string; onNotify: (msg: string) => void; className?: string };

export function ShareButton({ title, path, onNotify, className = "" }: Props) {
  async function share() {
    const url = path ? `${window.location.origin}${path}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      onNotify("Link copiado!");
    } catch {
      /* compartilhamento cancelado pelo usuário */
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f0dd] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7" />
      </svg>
      Compartilhar
    </button>
  );
}
