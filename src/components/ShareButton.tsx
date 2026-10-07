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
  /** texto ao lado do ícone (quando não é só o ícone); padrão: "Compartilhar" */
  label?: string;
};

export function ShareButton({ title, text, path, onNotify, className = "", iconOnly = false, label = "Compartilhar" }: Props) {
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
        <circle cx="18" cy="5" r="2.6" />
        <circle cx="6" cy="12" r="2.6" />
        <circle cx="18" cy="19" r="2.6" />
        <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" />
      </svg>
      {!iconOnly && label}
    </button>
  );
}
