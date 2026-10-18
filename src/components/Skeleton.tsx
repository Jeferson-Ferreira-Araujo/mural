/** Esqueletos de carregamento: blocos suaves com um brilho que passa, no lugar do texto "Carregando…". */

/** Um bloco (linha, foto, botão…): use className para o tamanho e o arredondamento. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} />;
}

/** Lista de pessoas ou itens: foto redonda e duas linhas (nome e detalhe). */
export function ListSkeleton({ rows = 5, label = "Carregando" }: { rows?: number; label?: string }) {
  return (
    <ul role="status" aria-label={label} className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-2.5">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5 rounded-full" />
            <Skeleton className="h-3 w-3/5 rounded-full" />
          </span>
          <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
        </li>
      ))}
      <li className="sr-only">{label}…</li>
    </ul>
  );
}

/** Grade de cartões (loja de bottons, por exemplo). */
export function GridSkeleton({ count = 9, className = "grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6", label = "Carregando" }: { count?: number; className?: string; label?: string }) {
  return (
    <ul role="status" aria-label={label} className={className}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-[#e1d3ba] bg-white/60 p-2.5">
          <Skeleton className="size-14 rounded-xl" />
          <Skeleton className="h-3 w-3/4 rounded-full" />
          <Skeleton className="h-7 w-full rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

/** Um cartão grande (pin em detalhe, perfil): imagem e linhas. */
export function CardSkeleton({ label = "Carregando" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      <Skeleton className="mx-auto h-40 w-4/5 rounded-2xl" />
      <Skeleton className="mx-auto h-4 w-1/2 rounded-full" />
      <Skeleton className="mx-auto h-3 w-2/3 rounded-full" />
      <span className="sr-only">{label}…</span>
    </div>
  );
}
