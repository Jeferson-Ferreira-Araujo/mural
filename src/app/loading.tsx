import { Skeleton } from "@/components/Skeleton";
import { useTranslations } from "next-intl";

/** Tela de carregamento entre páginas: a coluna da esquerda e o mural como esqueleto, no lugar de uma tela em branco. */
export default function Loading() {
  const tx = useTranslations("app.loading");
  return (
    <div role="status" aria-label={tx("carregando")} className="flex h-dvh w-full overflow-hidden bg-[#3b2616] portrait:flex-col">
      <div className="hidden w-[clamp(290px,23vw,360px)] shrink-0 flex-col gap-4 bg-[#f2e8d3] p-6 md:flex">
        <Skeleton className="mx-auto h-16 w-36 rounded-2xl" />
        <Skeleton className="mx-auto h-4 w-2/3 rounded-full" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="relative flex-1 p-4 md:p-8">
        <div className="skeleton !bg-[#4a3220] size-full rounded-2xl opacity-80" />
      </div>
      <span className="sr-only">{tx("carregando2")}</span>
    </div>
  );
}
