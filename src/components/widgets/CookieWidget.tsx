"use client";

import { useId, useState } from "react";
import { WidgetFrame } from "./core";

/** Mensagens do biscoito da sorte (uma é sorteada a cada vez que se quebra um biscoito). */
export const FORTUNES = [
  "Uma boa notícia chega mais perto do que você imagina.",
  "Quem cuida do hoje semeia um amanhã bonito.",
  "O próximo passo é menor do que parece.",
  "Alguém está pensando em você agora mesmo.",
  "Sua paciência vai ser recompensada em breve.",
  "Hoje é um ótimo dia para começar aquilo que você adiou.",
  "Um sorriso seu muda o dia de alguém.",
  "A sorte gosta de quem não desiste.",
  "Uma conversa simples vai abrir uma porta importante.",
  "Você é mais forte do que a última semana te fez acreditar.",
  "Coisas boas levam tempo, e a sua está a caminho.",
  "Escute mais, e você vai ouvir a resposta.",
  "Um velho amigo vai trazer uma lembrança feliz.",
  "O que você plantou com carinho está quase florescendo.",
  "Confie no seu ritmo: ninguém chega antes da hora certa.",
  "Pequenos gestos de hoje viram grandes histórias.",
  "Uma surpresa agradável espera por você antes do fim da semana.",
  "Quem agradece enxerga mais motivos para agradecer.",
  "Coragem não é não ter medo: é seguir com ele ao lado.",
  "Seu esforço está sendo notado, mesmo em silêncio.",
  "A resposta que você procura está na calma, não na pressa.",
  "Abra espaço na agenda para o que faz o coração rir.",
  "Alguém vai te agradecer por algo que você já esqueceu.",
  "O melhor da viagem costuma ser o caminho.",
  "Dê o primeiro passo, o resto se ajeita a caminho.",
  "Hoje, escolha ser gentil: o dia vai retribuir.",
  "Um plano antigo está pronto para sair do papel.",
  "A felicidade mora nos detalhes que você já tem.",
  "Você vai rir muito de algo que hoje parece difícil.",
  "O universo conspira a favor de quem faz a sua parte.",
];

/**
 * Biscoito da sorte: tocar quebra o biscoito em dois e mostra a mensagem; tocar de novo traz outro biscoito.
 * Dois estilos: clássico (fundo claro) e vermelho (fundo vinho com dourado).
 */
export function CookieWidget({ style = "classic", frame }: { style?: string; frame?: string | null }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [msg, setMsg] = useState<string | null>(null); // null = biscoito inteiro
  const red = style === "red";
  const broken = msg !== null;

  const toggle = (e: React.SyntheticEvent) => {
    e.stopPropagation(); // dentro do mural, tocar no biscoito não abre o detalhe nem seleciona o display
    if (broken) setMsg(null);
    else setMsg(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
  };

  // borda irregular da quebra (a mesma nas duas metades)
  const edge = "100,0 104,14 96,28 104,42 96,56 104,70 96,84 100,100";
  const half = (side: "l" | "r") => (
    <clipPath id={`${uid}${side}`}>
      <polygon points={side === "l" ? `0,0 ${edge} 0,100` : `200,0 ${edge} 200,100`} />
    </clipPath>
  );
  const cookie = (
    <g>
      {/* o corpo do biscoito: cúpula redonda com a base apertada no meio */}
      <path d="M 34 74 A 66 50 0 0 1 166 74 C 146 66 122 62 100 72 C 78 62 54 66 34 74 Z" fill={`url(#${uid}g)`} stroke="#9a6420" strokeWidth="1.4" strokeLinejoin="round" />
      {/* a aba dobrada */}
      <path d="M 100 72 C 98 52 118 34 148 38 C 152 56 130 70 100 72 Z" fill="#f3c25f" stroke="#a5702a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 100 72 C 104 56 122 44 146 42" fill="none" stroke="#b9822e" strokeWidth="1" strokeLinecap="round" opacity=".7" />
      <path d="M 46 58 C 56 40 76 32 94 32" fill="none" stroke="#fff3cc" strokeWidth="2.6" strokeLinecap="round" opacity=".75" />
    </g>
  );
  const move = (dx: number, rot: number) => ({
    transform: broken ? `translate(${dx}px, 9px) rotate(${rot}deg)` : "translate(0,0) rotate(0deg)",
    transformOrigin: "100px 66px",
    transition: "transform .55s cubic-bezier(.2,.9,.25,1.2)",
  });

  return (
    <WidgetFrame frame={frame} label="Biscoito da sorte">
      <div
        role="button"
        tabIndex={0}
        aria-label={broken ? "Biscoito da sorte: tocar para pegar outro" : "Biscoito da sorte: tocar para quebrar"}
        onClick={toggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(e)}
        className="pointer-events-auto absolute inset-0 cursor-pointer select-none"
        style={{ background: red ? "linear-gradient(145deg,#7d1620,#430a10)" : "linear-gradient(145deg,#fff7e0,#f3dcae)" }}
      >
        <svg viewBox="-14 -6 228 112" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f6cf7a" />
              <stop offset="1" stopColor="#d99a3c" />
            </linearGradient>
            {half("l")}
            {half("r")}
          </defs>
          {red && <circle cx="100" cy="50" r="46" fill="none" stroke="#e8c15a" strokeWidth=".6" opacity=".5" />}
          {/* tira de papel que aparece quando o biscoito quebra */}
          <rect x="52" y="44" width="96" height="16" rx="1.5" fill="#fffdf6" stroke="#d9cfae" strokeWidth=".5" style={{ opacity: broken ? 1 : 0, transition: "opacity .3s ease .25s" }} />
          {/* inteiro por baixo das metades: some assim que quebra (sem emenda visível enquanto está inteiro) */}
          <g style={{ opacity: broken ? 0 : 1, transition: "opacity .08s" }}>{cookie}</g>
          <g style={move(-17, -13)}>
            <g clipPath={`url(#${uid}l)`}>{cookie}</g>
          </g>
          <g style={move(17, 13)}>
            <g clipPath={`url(#${uid}r)`}>{cookie}</g>
          </g>
        </svg>
        {/* mensagem sobre a tira */}
        <p
          className="pointer-events-none absolute top-[52%] left-1/2 flex w-[9.6em] -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center leading-[1.15] font-medium text-[#3a2a12]"
          style={{ height: "1.9em", fontSize: "0.54em", fontFamily: "var(--font-playfair), Georgia, serif", opacity: broken ? 1 : 0, transition: "opacity .3s ease .3s" }}
        >
          <span className="line-clamp-2">{msg}</span>
        </p>
        <p className="pointer-events-none absolute inset-x-0 bottom-[0.7em] text-center text-[0.7em] font-semibold tracking-wide uppercase" style={{ color: red ? "#f1d68a" : "#7a5a20", opacity: 0.85 }}>
          {broken ? "Toque para outro biscoito" : "Toque para quebrar"}
        </p>
      </div>
    </WidgetFrame>
  );
}
