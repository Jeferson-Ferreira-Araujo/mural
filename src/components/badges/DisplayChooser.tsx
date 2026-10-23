"use client";

import { useEffect, useState } from "react";
import { baseStyle } from "@/lib/displayShape";
import { DISPLAY_CATS, DisplayCard, splitDisplayId, type DisplayData } from "../widgets";
import { DisplayDialog } from "./DisplayDialog";
import { sampleFor } from "./StoreModal";
import { useTranslations, useLocale } from "next-intl";
import { demoLocaleOf } from "@/data/demoText";
import { useLit } from "@/i18n/literal";

/**
 * Aba "Displays" do compositor (clicou num espaço livre do próprio mural): os displays que a pessoa já comprou.
 * Primeiro as categorias (Versículos, Relógios, Clima…), cada uma com uma prévia; ao tocar numa, aparecem só os modelos dela.
 * Escolher um modelo coloca o display no centro daquele espaço; depois ela pode ampliar e mover do jeito que quiser.
 */
export function DisplayChooser({ ids, onPlace, onStore }: { ids: string[]; /** o display pronto (estilo, texto, datas…): entra no espaço clicado */ onPlace: (data: DisplayData) => void; onStore: () => void }) {
  const tx = useTranslations("components.badges.DisplayChooser");
  const tl = useLit();
  const demoLocale = demoLocaleOf(useLocale());
  const [cat, setCat] = useState<string | null>(null);

  // as categorias que a pessoa tem, na ordem de sempre da loja, cada uma com os seus modelos
  const groups = DISPLAY_CATS.map((c) => {
    const own = ids.filter((id) => splitDisplayId(id).product === c.id);
    return { ...c, ids: own, styles: new Set(own.map((id) => baseStyle(splitDisplayId(id).style))).size }; // styles: modelos diferentes (retangular e quadrado do mesmo estilo contam um)
  }).filter((g) => g.ids.length > 0);
  // só uma categoria? vai direto aos modelos, sem a etapa extra
  const open = groups.length === 1 ? groups[0] : (groups.find((g) => g.id === cat) ?? null);
  useEffect(() => {
    if (cat && !groups.some((g) => g.id === cat)) setCat(null); // a categoria deixou de existir (ex.: a lista mudou)
  }, [cat, groups]);

  if (ids.length === 0) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-[15px] text-[#6b5440]">{tx("voceAindaNaoTemDisplays")}</p>
        <button type="button" onClick={onStore} className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#d9a21b] px-5 py-3 text-base font-bold text-[#2a1c12] transition hover:bg-[#e6ae22] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]">
          {tx("verDisplaysNaLoja")}</button>
      </div>
    );
  }

  const card = "flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#e1d3ba] bg-white/70 text-left transition hover:border-[#d98a2b] hover:bg-white active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  const preview = (id: string, product: string, style?: string) => (
    <span className="grid place-items-center bg-[#e9d8b6]/70 px-4 py-5">
      <span className="pointer-events-none text-[9px]">
        <span className="relative block">
          <DisplayCard data={sampleFor(product, style, demoLocale)} key={id} preview />
        </span>
      </span>
    </span>
  );

  // segundo passo: o formulário da categoria escolhida, direto aqui (estilo, textos, datas…) e já coloca no mural
  if (open) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          {groups.length > 1 && (
            <button type="button" onClick={() => setCat(null)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#4a3826] hover:bg-black/5">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m15 6-6 6 6 6" />
              </svg>
              {tx("x_categorias")}</button>
          )}
          <h3 className="font-title text-base font-semibold">{tl(open.label)}</h3>
        </div>
        <DisplayDialog key={open.id} open inline product={open.id} style={splitDisplayId(open.ids[0]).style} styles={open.ids.map((id) => splitDisplayId(id).style)} editing={false} busy={false} error={null} onClose={() => undefined} onSubmit={onPlace} />
      </div>
    );
  }

  // primeiro passo: as categorias
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label={tx("seusDisplaysPorCategoria")}>
      {groups.map((g) => (
        <li key={g.id}>
          <button type="button" onClick={() => setCat(g.id)} className={card}>
            {preview(g.id, g.id, splitDisplayId(g.ids[0]).style)}
            <span className="flex items-center justify-between gap-2 p-3">
              <span className="font-title text-base font-semibold">{g.label}</span>
              <span className="text-xs font-semibold text-[#6b5440]">
                {g.styles} {g.styles === 1 ? "modelo" : "modelos"}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
