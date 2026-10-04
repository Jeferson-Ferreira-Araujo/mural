"use client";

import { useEffect, useRef } from "react";
import { INK_BOX, INK_ORDER, LOGO_RATIO, TACK } from "@/lib/pinzLogo";

const SEEN_KEY = "pinz:intro";

/** Já tocou nesta aba? (a animação aparece uma vez por visita, não a cada página) */
export function introSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Não vai tocar (já viu, ou já está logado): libera o logo e o formulário. */
export const introSkip = () => {
  delete document.documentElement.dataset.intro;
};

const done = () => {
  delete document.documentElement.dataset.intro;
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {}
};

/** Varredura com borda suave (a tinta "vai sendo escrita"): anima a posição da máscara. */
function maskStyle(axis: "x" | "y"): React.CSSProperties {
  const grad = axis === "x" ? "linear-gradient(90deg, #000 0%, #000 44%, transparent 56%, transparent 100%)" : "linear-gradient(180deg, #000 0%, #000 44%, transparent 56%, transparent 100%)";
  const size = axis === "x" ? "300% 100%" : "100% 300%";
  const pos = axis === "x" ? "100% 0%" : "0% 100%";
  return { maskImage: grad, WebkitMaskImage: grad, maskSize: size, WebkitMaskSize: size, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: pos, WebkitMaskPosition: pos } as React.CSSProperties;
}

/**
 * Abertura do site (só movimento, sem mãos): o bloco amarelo aparece no meio da tela, "pinz" é escrito letra por letra,
 * a tachinha cai e prende, o bloco sobe até o lugar do logo e o formulário aparece.
 * Tudo com a Web Animations API; qualquer falha pula direto para o fim.
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
    const el = note.current;
    const r = target.getBoundingClientRect();
    Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const big = Math.min(vw * 0.78, 520) / r.width;
    const dx = vw / 2 - (r.left + r.width / 2);
    const dy = vh / 2 - (r.top + r.height / 2);
    const center = `translate(${dx}px, ${dy}px) scale(${big})`;

    let cancelled = false;
    const anims: Animation[] = [];
    const add = <T extends Animation>(a: T) => (anims.push(a), a);
    const wait = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms));

    const run = async () => {
      try {
        // espera as imagens (papel + letras) para a escrita não "piscar"
        const imgs = [...el.querySelectorAll("img")];
        await Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => undefined))), wait(1500)]);
        if (cancelled) return;

        // 1) o bloco entra no meio da tela
        el.style.transform = center;
        add(back.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: "forwards" }));
        const appear = add(
          el.animate(
            [
              { opacity: 0, transform: `translate(${dx}px, ${dy + 18}px) scale(${big * 0.92}) rotate(-4deg)` },
              { opacity: 1, transform: `${center} rotate(0deg)` },
            ],
            { duration: 300, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" },
          ),
        );

        // 2) "pinz" é escrito: uma letra por vez, bem rápido
        let at = 220;
        const writes: Promise<unknown>[] = [];
        for (const g of INK_ORDER) {
          const layer = el.querySelector<HTMLElement>(`[data-ink="${g.k}"]`);
          if (layer) {
            const from = g.axis === "x" ? "100% 0%" : "0% 100%";
            const to = g.axis === "x" ? "0% 0%" : "0% 0%";
            const a = add(layer.animate([{ maskPosition: from, webkitMaskPosition: from }, { maskPosition: to, webkitMaskPosition: to }] as Keyframe[], { duration: g.ms, delay: at, easing: "linear", fill: "both" }));
            writes.push(a.finished);
          }
          at += g.ms * 0.85;
        }
        await appear.finished;
        await Promise.all(writes);
        if (cancelled) return;

        // 3) a tachinha cai e prende; o papel cede um instante
        const DROP = 300;
        const drop = add(
          tack.current!.animate(
            [
              { opacity: 0, transform: "translateY(-230%) scale(1.55) rotate(8deg)", offset: 0 },
              { opacity: 1, transform: "translateY(-150%) scale(1.4) rotate(5deg)", offset: 0.15 },
              { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)", offset: 0.72, easing: "ease-in" },
              { opacity: 1, transform: "translateY(5%) scale(0.88) rotate(0deg)", offset: 0.86 },
              { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)", offset: 1 },
            ],
            { duration: DROP, easing: "cubic-bezier(.45,0,.75,.6)", fill: "forwards" },
          ),
        );
        add(
          el.animate(
            [
              { transform: `${center} rotate(0deg)` },
              { transform: `${center} rotate(0deg)`, offset: 0.7 },
              { transform: `${center} scale(0.984) rotate(-.7deg)`, offset: 0.84 },
              { transform: `${center} rotate(0deg)` },
            ],
            { duration: DROP, fill: "forwards" },
          ),
        );
        await drop.finished;
        if (cancelled) return;
        await wait(140);
        if (cancelled) return;

        // 4) sobe até o lugar do logo, e o formulário aparece
        const rect = target.getBoundingClientRect();
        const toX = rect.left - r.left;
        const toY = rect.top - r.top;
        const fly = add(el.animate([{ transform: center }, { transform: `translate(${toX}px, ${toY}px) scale(${rect.width / r.width})` }], { duration: 480, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }));
        add(back.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, fill: "forwards" }));
        await fly.finished;
      } catch {
        /* pula para o fim */
      } finally {
        if (!cancelled) {
          done(); // mostra o logo real e faz o formulário aparecer
          const fade = root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
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
      <div ref={note} className="absolute origin-center will-change-transform [filter:drop-shadow(0_0.6rem_1.2rem_rgba(0,0,0,.45))]" style={{ opacity: 0, aspectRatio: LOGO_RATIO }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/pinz/papel.webp" alt="" draggable={false} className="block size-full select-none" />
        {INK_ORDER.map((g) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={g.k}
            data-ink={g.k}
            src={`/img/pinz/tinta-${g.k}.webp`}
            alt=""
            draggable={false}
            className="absolute block select-none"
            style={{ left: `${INK_BOX[g.k].left}%`, top: `${INK_BOX[g.k].top}%`, width: `${INK_BOX[g.k].width}%`, height: `${INK_BOX[g.k].height}%`, ...maskStyle(g.axis) }}
          />
        ))}
        <span ref={tack} className="absolute block opacity-0" style={{ ...TACK }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/tachinha.webp" alt="" draggable={false} className="block w-full select-none [filter:drop-shadow(0_0.25rem_0.3rem_rgba(0,0,0,.45))]" style={{ transform: "scaleX(-1)" }} />
        </span>
      </div>
    </div>
  );
}
