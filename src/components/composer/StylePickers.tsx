"use client";

import { FRAME_COLORS, HAND_FONTS, PIN_COLORS, TAPE_COLORS, type FrameColor, type HandId, type PinColor, type TapeColor } from "@/lib/style";

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

/** Letra manuscrita do card. */
export function FontPicker({ value, onChange }: { value: HandId; onChange: (f: HandId) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">Letra</legend>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Letra">
        {HAND_FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={value === f.id}
            aria-label={`Letra ${f.label}`}
            onClick={() => onChange(f.id)}
            className={`cursor-pointer rounded-xl border-2 bg-white/70 px-1 py-2.5 text-center transition ${ring} ${value === f.id ? "border-[#2f2218] bg-white shadow-sm" : "border-[#e1d3ba] hover:bg-white"}`}
          >
            <span className="block text-[1.55rem] leading-none text-[#2f2218]" style={{ fontFamily: f.family }}>
              Olá!
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Dots<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { id: T; label: string; swatch: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.id)}
            className={`size-9 cursor-pointer rounded-full border-2 shadow-[inset_0_0.15rem_0.2rem_rgba(255,255,255,.45),0_0.1rem_0.25rem_rgba(0,0,0,.3)] transition-transform ${ring} ${value === o.id ? "scale-110 border-[#2f2218]" : "border-transparent"}`}
            style={{ background: o.swatch }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export const PinColorPicker = ({ value, onChange }: { value: PinColor; onChange: (c: PinColor) => void }) => <Dots label="Cor da tachinha" options={PIN_COLORS} value={value} onChange={onChange} />;
export const TapeColorPicker = ({ value, onChange }: { value: TapeColor; onChange: (c: TapeColor) => void }) => <Dots label="Cor da fita" options={TAPE_COLORS} value={value} onChange={onChange} />;

/** Cor do contorno dos pins da loja (Versículo, Frase, Relógio, Clima). */
export function FrameColorPicker({ value, onChange }: { value: FrameColor; onChange: (c: FrameColor) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">Cor do contorno</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do contorno">
        {FRAME_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value === c.id}
            aria-label={c.label}
            title={c.label}
            onClick={() => onChange(c.id)}
            className={`size-9 cursor-pointer rounded-full border-2 shadow-[inset_0_0.15rem_0.2rem_rgba(255,255,255,.45),0_0.1rem_0.25rem_rgba(0,0,0,.3)] transition-transform ${ring} ${value === c.id ? "scale-110 border-[#2f2218]" : "border-transparent"}`}
            style={{ background: `linear-gradient(145deg, ${c.from}, ${c.to})` }}
          />
        ))}
      </div>
    </fieldset>
  );
}
