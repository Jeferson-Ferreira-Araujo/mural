"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandId, TapeColor } from "@/lib/style";
import { Field, inputClass } from "../ui";
import { FontPicker, TapeColorPicker } from "./StylePickers";
import type { DraftChange } from "./types";

// ---------- Desenho (PLUS) ----------
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

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs ${value.length >= max ? "text-[#a23b2a]" : "text-[#8a7b69]"}`}>
      {value.length}/{max}
    </span>
  );
}

/** Desenho na hora: traço livre com cores, espessuras, borracha, desfazer e cor do papel. Vira uma imagem PNG no envio. */
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
  const [caption, setCaption] = useState("");
  const [font, setFont] = useState<HandId>("caveat");
  const [tape, setTape] = useState<TapeColor>("yellow");

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
    for (const s of strokes.current) paintStroke(ctx, s, paper);
  }, [paper]);

  // guarda o desenho como imagem (para a prévia e para o envio)
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

  useEffect(() => onChange({ type: "draw", caption: caption.trim(), ...(src ? { src } : {}), font, tape }, { empty: count === 0 || !src }), [src, caption, font, tape, count, onChange]);

  function point(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * DRAW_W, ((e.clientY - r.top) / r.height) * DRAW_H];
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
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

  const tool = (on: boolean) => `cursor-pointer rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-[#2f2218] bg-white" : "border-[#e1d3ba] bg-white/60 hover:bg-white"}`;

  return (
    <div className="space-y-4">
      <div>
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
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={undo} disabled={count === 0} className={tool(false)}>
            ↶ Desfazer
          </button>
          <button type="button" onClick={clear} disabled={count === 0} className={tool(false)}>
            Limpar
          </button>
          <button type="button" onClick={() => setErase((v) => !v)} aria-pressed={erase} className={tool(erase)}>
            Borracha
          </button>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Cor do traço</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do traço">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={!erase && color === c}
              aria-label={`Cor ${c}`}
              onClick={() => {
                setColor(c);
                setErase(false);
              }}
              className={`size-9 cursor-pointer rounded-full border-2 shadow-[0_0.1rem_0.25rem_rgba(0,0,0,.3)] transition-transform ${!erase && color === c ? "scale-110 border-[#2f2218]" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Espessura</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Espessura">
          {DRAW_SIZES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={size === s.id} onClick={() => setSize(s.id)} className={`${tool(size === s.id)} flex items-center gap-2`}>
              <span className="block rounded-full bg-[#2f2218]" style={{ width: Math.max(4, s.id / 2), height: Math.max(4, s.id / 2) }} />
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Papel</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Papel">
          {PAPERS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={paper === p.id}
              onClick={() => setPaper(p.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition ${paper === p.id ? "border-[#2f2218] bg-white" : "border-[#e1d3ba] bg-white/60 hover:bg-white"}`}
            >
              <span className="size-4 rounded-full border border-black/30" style={{ background: p.id }} />
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <TapeColorPicker value={tape} onChange={setTape} />
      <FontPicker value={font} onChange={setFont} />
      <Field label="Legenda (opcional)" hint={<Counter value={caption} max={48} />}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={48} placeholder="Ex: Eu e você, versão palito" className={inputClass} />}
      </Field>
    </div>
  );
}
