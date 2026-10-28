/** "X" desenhado (SVG) para os botões de fechar: fica sempre no centro do botão, diferente do caractere "×" da fonte, que sobe e desce conforme a fonte. */
export function CloseIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
