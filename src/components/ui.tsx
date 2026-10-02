"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { BOARD_IMAGE } from "./DesktopBoard";

/** Fundo e cartão centralizado usados nas telas de conta (entrar, criar, painel). */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative grid min-h-dvh grid-cols-[minmax(0,1fr)] place-items-center overflow-x-hidden bg-[#2a1a0e] px-3 py-6 sm:px-4 sm:py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BOARD_IMAGE} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl" />
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_30%,rgba(60,30,8,.2),rgba(14,7,2,.8))]" />
      <div className={`rise relative w-full min-w-0 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <Link href="/" className="font-hand mb-3 block w-fit text-[1.9rem] leading-none text-[#fbf3e2] [text-shadow:0_2px_8px_rgba(0,0,0,.5)] hover:opacity-90">
          Mural
        </Link>
        <main className="paper-grain rounded-[1.4rem] border border-[#e6d8bd] bg-[#fbf6ea] p-5 text-[#2f2218] shadow-[0_1.5rem_4rem_rgba(0,0,0,.5)] sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[#e1d3ba] bg-white/80 px-4 py-3 text-base text-[#2f2218] outline-none placeholder:text-[#8a7b69] focus:border-[#b8873b] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#d98a2b]/50";

export const primaryButton =
  "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1f232b] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#2c313b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

export const ghostButton =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d9c9ad] bg-transparent px-5 py-3 text-base font-semibold text-[#4a3826] transition-colors hover:bg-[#efe4cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-[#a23b2a]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-[#6b5440]">{hint}</p>
      ) : null}
    </div>
  );
}

/** Lista de respostas aceitas (até 5), em "etiquetas". */
export function AnswersEditor({ answers, onChange }: { answers: string[]; onChange: (a: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const max = 5;

  function add() {
    const v = draft.trim();
    if (!v || answers.length >= max) return;
    if (answers.some((a) => a.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...answers, v]);
    setDraft("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={answers.length ? "Outra resposta aceita" : "Ex.: Jef"}
          disabled={answers.length >= max}
          className={inputClass}
          maxLength={60}
          aria-label="Resposta aceita"
        />
        <button type="button" onClick={add} disabled={!draft.trim() || answers.length >= max} className={`${ghostButton} shrink-0 disabled:opacity-50`}>
          Adicionar
        </button>
      </div>
      {answers.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {answers.map((a) => (
            <li key={a} className="flex items-center gap-1.5 rounded-full bg-[#efe4cf] py-1 pr-1.5 pl-3.5 text-sm font-medium">
              {a}
              <button
                type="button"
                aria-label={`Remover ${a}`}
                onClick={() => onChange(answers.filter((x) => x !== a))}
                className="grid size-6 cursor-pointer place-items-center rounded-full text-[#6b5440] hover:bg-[#e0d0b3]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-center text-[#6b5440]">
      {label}
    </p>
  );
}

export type Prefix = "do" | "da" | "de";

/** Escolha de "Mural do / da / de …". */
export function PrefixPicker({ value, onChange }: { value: Prefix; onChange: (p: Prefix) => void }) {
  return (
    <div role="radiogroup" aria-label="Como chamar o mural" className="flex w-full rounded-xl sm:inline-flex sm:w-auto border border-[#e1d3ba] bg-white/60 p-1">
      {(["do", "da", "de"] as const).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors sm:flex-none sm:px-4 sm:py-1.5 focus-visible:outline-2 focus-visible:outline-[#d98a2b] ${
            value === p ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"
          }`}
        >
          Mural {p}
        </button>
      ))}
    </div>
  );
}
