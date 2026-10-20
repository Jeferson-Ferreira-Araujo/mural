"use client";

import { useState } from "react";
import { loginUrl } from "@/lib/auth";
import { baseStyle } from "@/lib/displayShape";
import { usePoll } from "@/lib/poll";
import { useInDetail } from "../board/ListEditContext";
import { WidgetFrame } from "./core";
import { useTranslations } from "next-intl";

/** Estilos da enquete: papel (claro), noite (escuro) e colorido. */
const SKINS: Record<string, { bg: string; ink: string; sub: string; row: string; fill: string; mine: string; tag: string }> = {
  paper: { bg: "linear-gradient(155deg,#fffaf0,#f1e4c6)", ink: "#2f2218", sub: "#6b5440", row: "rgba(255,255,255,.7)", fill: "rgba(200,69,47,.28)", mine: "#c8452f", tag: "#c8452f" },
  night: { bg: "linear-gradient(150deg,#1b2433,#0c111a)", ink: "#eef2f7", sub: "rgba(238,242,247,.62)", row: "rgba(255,255,255,.07)", fill: "rgba(92,196,255,.34)", mine: "#5cc4ff", tag: "#5cc4ff" },
  pop: { bg: "linear-gradient(150deg,#ff7a59,#ff3d81 55%,#8a3ffc)", ink: "#ffffff", sub: "rgba(255,255,255,.85)", row: "rgba(255,255,255,.18)", fill: "rgba(255,255,255,.34)", mine: "#ffe66d", tag: "#ffe66d" },
};

/**
 * Enquete (quadrada): a pergunta e duas respostas com a porcentagem de cada uma, ao vivo. No mural mostra o resultado;
 * ao tocar no display abre o detalhe, onde as opções viram botões para votar (dá para trocar o voto).
 */
export function PollWidget({ style = "q-paper", title, options, badgeId, frame }: { style?: string; title?: string; options?: string[]; badgeId?: string; frame?: string | null }) {
  const tx = useTranslations("components.widgets.PollWidget");
  const inDetail = useInDetail();
  const sk = SKINS[baseStyle(style)] ?? SKINS.paper;
  const opts = (options && options.length >= 2 ? options : ["Sim", "Não"]).slice(0, 4);
  const question = (title ?? "").trim() || "Sua pergunta aqui?";
  // sem id (prévia na loja e no formulário): resultado de exemplo
  const demo = !badgeId;
  const { state, vote, logged } = usePoll(badgeId, !demo, opts.length);
  const counts = demo ? opts.map((_, i) => [14, 6, 3, 2][i] ?? 1) : (state?.counts ?? opts.map(() => 0));
  const total = demo ? counts.reduce((a, b) => a + b, 0) : (state?.total ?? 0);
  const mine = demo ? null : (state?.mine ?? null);
  const [err, setErr] = useState(false);
  const [askLogin, setAskLogin] = useState(false); // tentou votar sem conta: mostra o caminho para entrar ou criar a conta

  async function pick(i: number) {
    setErr(false);
    if (!logged) return setAskLogin(true);
    if (!(await vote(i))) setErr(true);
  }

  return (
    <WidgetFrame frame={frame} label={tx("enquete")} shape="square">
      <div className="absolute inset-0 flex flex-col px-[0.9em] pt-[0.8em] pb-[0.75em]" style={{ background: sk.bg, color: sk.ink }}>
        <p className="text-[0.62em] font-extrabold tracking-[0.18em] uppercase" style={{ color: sk.tag }}>
          {tx("enquete")}</p>
        <p className="mt-[0.15em] line-clamp-3 text-[1.08em] leading-[1.15] font-extrabold [overflow-wrap:anywhere]" title={question}>
          {question}
        </p>
        <div className="mt-[0.5em] grid min-h-0 flex-1 gap-[0.35em]" style={{ gridTemplateRows: `repeat(${opts.length}, minmax(0, 1fr))` }}>
          {opts.map((label, i) => {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            const chosen = mine === i;
            const inner = (
              <>
                <span aria-hidden className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: sk.fill }} />
                <span className="relative flex w-full items-center gap-[0.4em]">
                  {chosen && (
                    <svg viewBox="0 0 24 24" className="size-[1em] shrink-0" fill="none" stroke={sk.mine} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-label={tx("seuVoto")}>
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                  <span className="line-clamp-2 min-w-0 flex-1 text-left text-[0.88em] leading-[1.1] font-bold [overflow-wrap:anywhere]">{label}</span>
                  <span className="shrink-0 text-[0.92em] font-extrabold tabular-nums">{pct}%</span>
                </span>
              </>
            );
            const cls = "relative flex min-h-0 items-center overflow-hidden rounded-[0.55em] px-[0.6em]";
            const st = { background: sk.row, boxShadow: chosen ? `inset 0 0 0 0.12em ${sk.mine}` : undefined } as const;
            return inDetail && !demo ? (
              <button key={i} type="button" onClick={() => void pick(i)} aria-pressed={chosen} className={`${cls} w-full cursor-pointer transition active:scale-[0.99]`} style={st}>
                {inner}
              </button>
            ) : (
              <div key={i} className={cls} style={st}>
                {inner}
              </div>
            );
          })}
        </div>
        {askLogin && (
          <div role="alertdialog" aria-label={tx("entreParaVotar")} className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[0.6em] rounded-[1.1em] px-[1em] text-center" style={{ background: "rgba(10,10,15,.88)", color: "#fff" }}>
            <p className="text-[1.05em] leading-tight font-extrabold">{tx("paraVotarVocePrecisaDe")}</p>
            <p className="text-[0.78em] leading-snug opacity-85">{tx("eRapidoEGratuitoDepois")}</p>
            <div className="mt-[0.2em] flex w-full gap-[0.5em]">
              <a href={loginUrl(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/", false)} className="flex-1 rounded-[0.6em] bg-[#d9a21b] py-[0.55em] text-[0.9em] font-extrabold text-[#2a1c12]">
                {tx("entrar")}</a>
              <a href={loginUrl(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/", true)} className="flex-1 rounded-[0.6em] bg-white/15 py-[0.55em] text-[0.9em] font-extrabold text-white">
                {tx("criarConta")}</a>
            </div>
            <button type="button" onClick={() => setAskLogin(false)} className="cursor-pointer text-[0.78em] font-semibold underline opacity-80">
              {tx("agoraNao")}</button>
          </div>
        )}
        <p className="mt-[0.45em] flex items-center justify-between text-[0.66em] font-semibold" style={{ color: sk.sub }} aria-live="polite">
          <span>
            {total} {total === 1 ? "voto" : "votos"}
          </span>
          <span>{err ? tx("m_naoFoiPossivelVotarAgora") : demo ? "" : inDetail ? (!logged ? tx("m_entreParaVotar") : mine !== null ? tx("m_toqueParaTrocarOVoto") : tx("m_toqueNumaOpcao")) : mine !== null ? tx("m_voceJaVotou") : tx("m_toqueParaVotar")}</span>
        </p>
      </div>
    </WidgetFrame>
  );
}
