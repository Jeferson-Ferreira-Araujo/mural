"use client";

import { useEffect, useRef } from "react";

const SEEN_KEY = "pinz:intro";

/** Já tocou nesta aba? (a animação aparece uma vez por visita, não a cada página) */
export function introSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

const done = () => {
  delete document.documentElement.dataset.intro;
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {}
};

/**
 * Abertura do site (só movimento, sem mãos): o bloco "pinz" aparece no meio da tela, a tachinha cai e é pressionada,
 * o bloco sobe até o lugar do logo e o formulário aparece. Tudo com a Web Animations API; qualquer falha pula direto para o fim.
 * Enquanto toca, `data-intro="play"` no <html> esconde o logo e o formulário reais (ver globals.css).
 */
export function IntroAnimation() {
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const tack = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = [...document.querySelectorAll<HTMLImageElement>(".brand-real img")].find((i) => i.offsetParent && i.getBoundingClientRect().width > 20);
    if (reduced || !target || !root.current || !back.current || !note.current || !tack.current) {
      done();
      root.current?.remove();
      return;
    }
    document.documentElement.dataset.intro = "play";
    const r = target.getBoundingClientRect();
    const el = note.current;
    Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

    // posição de partida: bem maior e no meio da tela
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const big = Math.min(vw * 0.72, 460) / r.width;
    const dx = vw / 2 - (r.left + r.width / 2);
    const dy = vh / 2 - (r.top + r.height / 2);
    const center = `translate(${dx}px, ${dy}px) scale(${big})`;
    const ease = "cubic-bezier(.22,1,.36,1)";

    let cancelled = false;
    const anims: Animation[] = [];
    const run = async () => {
      try {
        el.style.transform = center;
        // 1) o bloco aparece no meio (um pouquinho torto, assentando)
        anims.push(back.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: "forwards" }));
        const appear = el.animate(
          [
            { opacity: 0, transform: `translate(${dx}px, ${dy + 24}px) scale(${big * 0.9}) rotate(-5deg)` },
            { opacity: 1, transform: `${center} rotate(0deg)` },
          ],
          { duration: 600, easing: ease, fill: "forwards" },
        );
        anims.push(appear);
        await appear.finished;
        if (cancelled) return;

        // 2) a tachinha cai de cima, bate no papel e é pressionada
        const t = tack.current!;
        const drop = t.animate(
          [
            { opacity: 0, transform: "translateY(-260%) scale(1.5) rotate(10deg)", offset: 0 },
            { opacity: 1, transform: "translateY(-120%) scale(1.35) rotate(6deg)", offset: 0.25 },
            { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)", offset: 0.7, easing: "ease-in" },
            { opacity: 1, transform: "translateY(4%) scale(0.9) rotate(0deg)", offset: 0.82 },
            { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)", offset: 1 },
          ],
          { duration: 760, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" },
        );
        anims.push(drop);
        // o papel "cede" um instante quando a tachinha pressiona
        anims.push(
          el.animate(
            [
              { transform: `${center} rotate(0deg)` },
              { transform: `${center} rotate(0deg)`, offset: 0.68 },
              { transform: `${center} scale(0.985) rotate(-.6deg)`, offset: 0.8 },
              { transform: `${center} rotate(0deg)` },
            ],
            { duration: 760, fill: "forwards" },
          ),
        );
        await drop.finished;
        if (cancelled) return;
        await new Promise((ok) => setTimeout(ok, 450));
        if (cancelled) return;

        // 3) sobe até o lugar do logo, e o formulário aparece
        const rect = target.getBoundingClientRect(); // (pode ter mudado de lugar nesse meio tempo)
        const toX = rect.left - r.left;
        const toY = rect.top - r.top;
        const fly = el.animate([{ transform: center }, { transform: `translate(${toX}px, ${toY}px) scale(${rect.width / r.width})` }], { duration: 850, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
        anims.push(fly, back.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 850, fill: "forwards" }));
        await fly.finished;
      } catch {
        /* pula para o fim */
      } finally {
        if (!cancelled) {
          done(); // mostra o logo real e faz o formulário aparecer
          const fade = root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
          await fade?.finished.catch(() => undefined);
          root.current?.remove();
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      anims.forEach((a) => a.cancel());
      done();
    };
  }, []);

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[200]">
      <div ref={back} className="absolute inset-0 bg-[#1a0f06]/70 opacity-0 backdrop-blur-[2px]" />
      <div ref={note} className="absolute origin-center opacity-0 will-change-transform [filter:drop-shadow(0_0.6rem_1.2rem_rgba(0,0,0,.45))]" style={{ opacity: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/pinz-logo-sempino.webp" alt="" draggable={false} className="block size-full select-none" />
        <span ref={tack} className="absolute block opacity-0" style={{ left: "37.7%", top: "2.5%", width: "26%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/tachinha.webp" alt="" draggable={false} className="block w-full select-none [filter:drop-shadow(0_0.25rem_0.3rem_rgba(0,0,0,.45))]" style={{ transform: "scaleX(-1)" }} />
        </span>
      </div>
    </div>
  );
}
