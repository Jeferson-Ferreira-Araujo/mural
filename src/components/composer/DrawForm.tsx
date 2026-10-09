"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TAPE_COLORS, tapeOf, type TapeColor } from "@/lib/style";
import { Tape } from "../messages/fasteners";
import type { DraftChange } from "./types";

// ---------- Desenho (PINZ+) ----------
const DRAW_W = 800;
const DRAW_H = 600;
const DRAW_COLORS = ["#1f232b", "#e0443a", "#f08a24", "#f2c230", "#3f9b4a", "#2b6fd6", "#8a4fd6", "#e66fa5", "#8a5a34"];
const DRAW_SIZES = [
  { id: 5, label: "Fino" },
  { id: 12, label: "Médio" },
  { id: 26, label: "Grosso" },
] as const;
const PAPERS = [
  { id: "#ffffff", label: "Branco" },
  { id: "#fbf1d6", label: "Creme" },
  { id: "#d9b98a", label: "Kraft" },
  { id: "#23302b", label: "Lousa" },
] as const;

type Stroke = { color: string; size: number; erase: boolean; pts: [number, number][] };
type Panel = "color" | "size" | "paper" | "tape" | null;

function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, paper: string) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = s.erase ? paper : s.color;
  ctx.fillStyle = s.erase ? paper : s.color;
  ctx.lineWidth = s.size;
  if (s.pts.length === 1) {
    ctx.beginPath();
    ctx.arc(s.pts[0][0], s.pts[0][1], s.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(s.pts[0][0], s.pts[0][1]);
  for (let i = 1; i < s.pts.length; i++) {
    const [px, py] = s.pts[i - 1];
    const [x, y] = s.pts[i];
    ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
  }
  const last = s.pts[s.pts.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

const chip = (on: boolean) =>
  `flex cursor-pointer items-center gap-2 rounded-lg border-2 px-2.5 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-[#2f2218] bg-white" : "border-[#e1d3ba] bg-white/60 hover:bg-white"}`;

const ic = "size-4 shrink-0";
const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" className={ic} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
/** Ícones do que cada opção faz. */
const ICONS = {
  color: svg(<><path d="m14.5 4.5 5 5L9 20H4v-5L14.5 4.5Z" /><path d="m12 7 5 5" /></>),
  size: svg(<><path d="M4 6h16" strokeWidth="1.5" /><path d="M4 12h16" strokeWidth="3" /><path d="M4 19h16" strokeWidth="5" /></>),
  paper: svg(<><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4" /></>),
  tape: svg(<><path d="M3 9h18v6H3z" /><path d="M7 9v6M17 9v6" strokeDasharray="1 2" /></>),
  eraser: svg(<><path d="m7 21-4-4a2 2 0 0 1 0-3l10-10a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3L12 21H7Z" /><path d="m8 10 6 6M12 21h9" /></>),
  undo: svg(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
  clear: svg(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>),
};

/** Botão que mostra a opção aplicada e abre a lista para trocar. */
function OptionButton({ label, open, onClick, children }: { label: string; open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} aria-label={label} title={label} className={chip(open)}>
      {children}
      <svg viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

/** Desenho na hora: traço livre com cor, espessura, borracha, desfazer, papel e fita. Vira uma imagem PNG no envio. Sem texto. */
export function DrawForm({ onChange }: { onChange: DraftChange }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const prev = useRef<string | null>(null);
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [size, setSize] = useState<number>(12);
  const [erase, setErase] = useState(false);
  const [paper, setPaper] = useState<string>(PAPERS[0].id);
  const [count, setCount] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [tape, setTape] = useState<TapeColor>("yellow");
  const [panel, setPanel] = useState<Panel>(null);

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
    for (const s of strokes.current) paintStroke(ctx, s, paper);
  }, [paper]);

  // guarda o desenho como imagem (para o envio)
  const snapshot = useCallback(() => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      if (prev.current) URL.revokeObjectURL(prev.current);
      const url = URL.createObjectURL(blob);
      prev.current = url;
      setSrc(url);
    }, "image/png");
  }, []);

  useEffect(() => {
    redraw();
    snapshot();
  }, [redraw, snapshot]);

  useEffect(
    () => () => {
      if (prev.current) URL.revokeObjectURL(prev.current);
    },
    [],
  );

  useEffect(() => onChange({ type: "draw", caption: "", ...(src ? { src } : {}), tape }, { empty: count === 0 || !src }), [src, tape, count, onChange]);

  function point(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * DRAW_W, ((e.clientY - r.top) / r.height) * DRAW_H];
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setPanel(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    const s: Stroke = { color, size, erase, pts: [point(e)] };
    current.current = s;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintStroke(ctx, s, paper);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = current.current;
    if (!s) return;
    s.pts.push(point(e));
    redraw();
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintStroke(ctx, s, paper);
  }
  function up() {
    const s = current.current;
    if (!s) return;
    current.current = null;
    strokes.current.push(s);
    setCount(strokes.current.length);
    redraw();
    snapshot();
  }
  function undo() {
    strokes.current.pop();
    setCount(strokes.current.length);
    redraw();
    snapshot();
  }
  function clear() {
    strokes.current = [];
    setCount(0);
    redraw();
    snapshot();
  }

  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const sizeNow = DRAW_SIZES.find((s) => s.id === size) ?? DRAW_SIZES[1];
  const dot = (px: number, bg: string) => <span className="block rounded-full border border-black/20" style={{ width: px, height: px, background: bg }} />;
  const pick = (p: Exclude<Panel, null>, fn: () => void) => () => {
    fn();
    setPanel(null);
    void p;
  };

  return (
    <div className="space-y-3">
      <div className="relative pt-3 text-[14px]">
        <Tape className="pointer-events-none -top-[0.1em] left-1/2 -translate-x-1/2" rotate={2} tone={tapeOf(tape).tone} />
        <canvas
          ref={canvasRef}
          width={DRAW_W}
          height={DRAW_H}
          aria-label="Área de desenho"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="block aspect-[4/3] w-full cursor-crosshair touch-none rounded-xl border border-[#d9c9ad] shadow-sm"
        />
      </div>

      {/* uma linha só: cada botão mostra o que está aplicado e abre as opções logo abaixo */}
      <div className="flex flex-wrap gap-2">
        <OptionButton label="Cor do traço" open={panel === "color"} onClick={() => toggle("color")}>
          {ICONS.color}
          {dot(16, erase ? "#ffffff" : color)}
          <span className="hidden sm:inline">Cor</span>
        </OptionButton>
        <OptionButton label="Espessura do traço" open={panel === "size"} onClick={() => toggle("size")}>
          {ICONS.size}
          <span className="hidden sm:inline">{sizeNow.label}</span>
        </OptionButton>
        <OptionButton label="Cor do papel" open={panel === "paper"} onClick={() => toggle("paper")}>
          {ICONS.paper}
          {dot(16, paper)}
          <span className="hidden sm:inline">Papel</span>
        </OptionButton>
        <OptionButton label="Cor da fita" open={panel === "tape"} onClick={() => toggle("tape")}>
          {ICONS.tape}
          {dot(16, tapeOf(tape).swatch)}
          <span className="hidden sm:inline">Fita</span>
        </OptionButton>
      </div>

      {panel && (
        <div className="rounded-xl border border-[#e1d3ba] bg-white/70 p-2.5" role="radiogroup" aria-label="Opções">
          <div className="flex flex-wrap gap-2">
            {panel === "color" &&
              DRAW_COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={!erase && color === c} aria-label={`Cor ${c}`} onClick={pick("color", () => { setColor(c); setErase(false); })} className={`size-9 cursor-pointer rounded-full border-2 shadow-[0_0.1rem_0.25rem_rgba(0,0,0,.3)] ${!erase && color === c ? "border-[#2f2218]" : "border-transparent"}`} style={{ background: c }} />
              ))}
            {panel === "size" &&
              DRAW_SIZES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={size === s.id} onClick={pick("size", () => setSize(s.id))} className={chip(size === s.id)}>
                  {dot(Math.max(6, s.id / 1.6), "#2f2218")}
                  {s.label}
                </button>
              ))}
            {panel === "paper" &&
              PAPERS.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={paper === p.id} onClick={pick("paper", () => setPaper(p.id))} className={chip(paper === p.id)}>
                  {dot(18, p.id)}
                  {p.label}
                </button>
              ))}
            {panel === "tape" &&
              TAPE_COLORS.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={tape === t.id} aria-label={t.label} title={t.label} onClick={pick("tape", () => setTape(t.id))} className={`size-9 cursor-pointer rounded-full border-2 shadow-[0_0.1rem_0.25rem_rgba(0,0,0,.3)] ${tape === t.id ? "border-[#2f2218]" : "border-transparent"}`} style={{ background: t.swatch }} />
              ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setErase((v) => !v)} aria-pressed={erase} className={chip(erase)}>
          {ICONS.eraser}
          Borracha
        </button>
        <button type="button" onClick={undo} disabled={count === 0} className={chip(false)}>
          {ICONS.undo}
          Desfazer
        </button>
        <button type="button" onClick={clear} disabled={count === 0} className={chip(false)}>
          {ICONS.clear}
          Limpar
        </button>
      </div>
    </div>
  );
}
