"use client";

type Props = {
  title: string;
  /** frase do convite que acompanha o link */
  text?: string;
  /** caminho a compartilhar (padrão: a página atual) */
  path?: string;
  onNotify: (msg: string) => void;
  className?: string;
  /** só o ícone (com dica e leitor de tela) */
  iconOnly?: boolean;
};

export function ShareButton({ title, text, path, onNotify, className = "", iconOnly = false }: Props) {
  async function share() {
    const url = path ? `${window.location.origin}${path}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
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
      aria-label={iconOnly ? title : undefined}
      title={iconOnly ? title : undefined}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${iconOnly ? "size-11" : "px-4 py-2"} ${className}`}
    >
      <svg viewBox="0 0 24 24" className={iconOnly ? "size-5" : "size-4"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7" />
      </svg>
      {!iconOnly && "Compartilhar"}
    </button>
  );
}
