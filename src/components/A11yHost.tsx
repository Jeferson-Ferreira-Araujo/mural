"use client";

import { useEffect, useRef, useState } from "react";
import { A11Y_DEFAULT, A11Y_OPEN_EVENT, applyA11y, colorMatrix, loadA11y, saveA11y, type A11y, type ColorMode } from "@/lib/a11y";
import { getBrowserSupabase } from "@/lib/supabase";
import { Modal } from "./account/Modal";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

const COLOR_OPTIONS: { id: ColorMode; label: string; hint: string }[] = [
  { id: "none", label: "Desligado", hint: "Cores normais" },
  { id: "protan", label: "Protanopia", hint: "Dificuldade com vermelho" },
  { id: "deutan", label: "Deuteranopia", hint: "Dificuldade com verde" },
  { id: "tritan", label: "Tritanopia", hint: "Dificuldade com azul" },
  { id: "mono", label: "Preto e branco", hint: "Sem cores" },
];

function Switch({ on, label, hint, onChange }: { on: boolean; label: string; hint: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#e1d3ba] bg-white/70 px-4 py-3 text-left transition hover:bg-white">
      <span className="min-w-0">
        <span className="block text-[15px] font-bold">{label}</span>
        <span className="block text-xs text-[#6b5440]">{hint}</span>
      </span>
      <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-[#2f8f4e]" : "bg-[#b9ad9b]"}`}>
        <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

/**
 * Acessibilidade: aplica a escolha guardada no aparelho assim que o site abre e mostra a janela "Acessibilidade" quando algum botão pede (evento).
 * Também guarda os filtros de cor (SVG) usados para o daltonismo.
 */
export function A11yHost() {
  const tx = useTranslations("components.A11yHost");
  const tl = useLit();
  const [s, setS] = useState<A11y>(A11Y_DEFAULT);
  const [open, setOpen] = useState(false);
  const synced = useRef<string | null>(null); // conta cuja escolha já foi buscada
  const cur = useRef<A11y>(A11Y_DEFAULT); // a escolha mais recente (dois toques seguidos não se desfazem)

  useEffect(() => {
    const v = loadA11y();
    cur.current = v;
    setS(v);
    applyA11y(v);
    const o = () => setOpen(true);
    window.addEventListener(A11Y_OPEN_EVENT, o);
    // com conta: a escolha guardada no perfil vale em qualquer aparelho; se a conta ainda não tem uma, sobe a deste aparelho
    const sb = getBrowserSupabase();
    const sync = (uid: string | undefined) => {
      if (!uid || synced.current === uid) return;
      synced.current = uid;
      void sb.rpc("get_a11y").then(({ data, error }) => {
        if (error) return;
        if (data && typeof data === "object") {
          const v = { ...A11Y_DEFAULT, ...(data as Partial<A11y>) };
          cur.current = v;
          setS(v);
          saveA11y(v);
          applyA11y(v);
        } else if (JSON.stringify(cur.current) !== JSON.stringify(A11Y_DEFAULT)) {
          void sb.rpc("set_a11y", { p_data: cur.current });
        }
      });
    };
    void sb.auth.getSession().then(({ data }) => sync(data.session?.user.id));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (!session) synced.current = null;
      else sync(session.user.id);
    });
    return () => {
      window.removeEventListener(A11Y_OPEN_EVENT, o);
      sub.subscription.unsubscribe();
    };
  }, []);

  function commit(next: A11y) {
    cur.current = next;
    setS(next);
    saveA11y(next);
    applyA11y(next);
    if (synced.current) void getBrowserSupabase().rpc("set_a11y", { p_data: next }); // logado: guarda na conta
  }
  const patch = (p: Partial<A11y>) => commit({ ...cur.current, ...p });

  return (
    <>
      {/* filtros de cor (invisíveis): o <html> usa um deles quando o modo de daltonismo está ligado */}
      <svg aria-hidden width="0" height="0" className="pointer-events-none absolute size-0">
        <defs>
          {(["protan", "deutan", "tritan", "mono"] as const).map((k) => (
            <filter key={k} id={`pinz-cb-${k}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={colorMatrix(k)} />
            </filter>
          ))}
        </defs>
      </svg>

      <Modal open={open} onClose={() => setOpen(false)} title={tx("acessibilidade")}>
        <div className="space-y-5 text-[#2f2218]">
          <p className="text-sm text-[#4a3826]">{tx("queremosQueOPinzSeja")}</p>

          <section aria-label={tx("daltonismo")}>
            <h3 className="font-title text-base font-semibold">{tx("daltonismo")}</h3>
            <p className="text-xs text-[#6b5440]">{tx("corrigeAsCoresDaTela")}</p>
            <div role="radiogroup" aria-label={tx("tipoDeDaltonismo")} className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {COLOR_OPTIONS.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={s.color === o.id} onClick={() => patch({ color: o.id })} className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-left transition ${s.color === o.id ? "border-[#d9a21b] bg-[#fff6dd]" : "border-[#e1d3ba] bg-white/70 hover:bg-white"}`}>
                  <span className="block text-sm font-bold">{tl(o.label)}</span>
                  <span className="block text-xs text-[#6b5440]">{tl(o.hint)}</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label={tx("tamanhoDoTexto")}>
            <h3 className="font-title text-base font-semibold">{tx("tamanhoDoTexto")}</h3>
            <div role="radiogroup" aria-label={tx("tamanhoDoTexto")} className="mt-2 grid grid-cols-2 gap-1.5">
              {(
                [
                  [0, tl("Normal"), "text-sm"],
                  [1, tl("Grande"), "text-base"],
                ] as const
              ).map(([v, label, sz]) => (
                <button key={v} type="button" role="radio" aria-checked={s.text === v} onClick={() => patch({ text: v })} className={`cursor-pointer rounded-xl border-2 px-2 py-2 font-bold transition ${sz} ${s.text === v ? "border-[#d9a21b] bg-[#fff6dd]" : "border-[#e1d3ba] bg-white/70 hover:bg-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section aria-label={tx("leitura")} className="space-y-2">
            <Switch on={s.contrast} label={tx("contrasteAlto")} hint={tx("coresMaisFortesParaVer")} onChange={(v) => patch({ contrast: v })} />
            <Switch on={s.font} label={tx("fonteDeLeituraFacil")} hint={tx("letrasDesenhadasParaNaoSerem")} onChange={(v) => patch({ font: v })} />
            <Switch on={s.spacing} label={tx("maisEspacoEntreLetrasE")} hint={tx("oTextoFicaMenosApertado")} onChange={(v) => patch({ spacing: v })} />
            <Switch on={s.calm} label={tx("reduzirAnimacoes")} hint={tx("menosMovimentoNaTela")} onChange={(v) => patch({ calm: v })} />
          </section>

          <button type="button" onClick={() => commit({ ...A11Y_DEFAULT })} className="w-full cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-white">
            {tx("restaurarOPadrao")}</button>
        </div>
      </Modal>
    </>
  );
}
