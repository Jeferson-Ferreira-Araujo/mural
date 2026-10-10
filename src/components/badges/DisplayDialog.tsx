"use client";

import { useEffect, useState } from "react";
import { searchPlaces, type PlaceHit } from "@/lib/places";
import type { FrameColor } from "@/lib/style";
import { CLOCK_ZONES } from "../widgets/core";
import { DisplayCard, displayName, type DisplayData } from "../widgets";
import type { CalDate } from "../widgets/CalendarWidget";
import { Modal } from "../account/Modal";
import { Field, inputClass, primaryButton } from "../ui";

const SAMPLE: Record<string, Partial<DisplayData>> = {
  bible: { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  motivation: { text: "Disciplina de hoje é o resultado de amanhã." },
  clock: {},
  weather: {},
  calendar: {},
  cookie: {},
};

/**
 * Antes de soltar o pin da loja no mural (ou ao editá-lo): escolher o estilo, a cor do contorno e, no relógio, o horário; no clima, a cidade.
 * `onSubmit` recebe os dados prontos para o servidor.
 */
export function DisplayDialog({ open, product, style, initial, editing, busy, error, onClose, onSubmit }: { open: boolean; product: string; /** estilo comprado (fixo) */ style: string; initial?: DisplayData; editing: boolean; busy: boolean; error: string | null; onClose: () => void; onSubmit: (data: DisplayData) => void }) {
  const [frame, setFrame] = useState<FrameColor>("gold");
  const [tz, setTz] = useState("local");
  const [dates, setDates] = useState<CalDate[]>([]); // calendário: datas importantes
  const [city, setCity] = useState<PlaceHit | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFrame((initial?.frame as FrameColor) ?? "gold");
    setTz(initial?.tz ?? "local");
    setDates((initial?.dates ?? []).map((d) => ({ ...d })));
    setCity(initial?.city && typeof initial.lat === "number" && typeof initial.lon === "number" ? { name: initial.city, address: "", lat: initial.lat, lon: initial.lon } : null);
    setQuery("");
    setHits([]);
    setSearched(false);
    setErr(null);
  }, [open, initial, product, style]);

  async function search() {
    const q = query.trim();
    if (q.length < 3) return setErr("Digite pelo menos 3 letras do nome da cidade.");
    setErr(null);
    setSearching(true);
    try {
      setHits(await searchPlaces(q));
      setSearched(true);
    } catch {
      setErr("Não foi possível buscar agora. Tente de novo em instantes.");
    } finally {
      setSearching(false);
    }
  }

  const base: DisplayData = {
    product,
    frame,
    ...SAMPLE[product],
    ...(product === "clock" ? { tz } : {}),
    ...(product === "calendar" ? { dates: dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date)) } : {}),
    ...(product === "weather" ? { city: city?.name ?? "São Paulo", lat: city?.lat ?? 0, lon: city?.lon ?? 0 } : {}),
  };
  const data: DisplayData = { ...base, style };
  const ready = product !== "weather" || !!city;
  const title = displayName(product + ":" + style);

  return (
    <Modal open={open} onClose={onClose} title={title} label={title}>
      <div className="space-y-4">
        <div className="flex justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/60 px-2 py-5">
          <div className="text-[min(11px,2.2vw)]">
            <DisplayCard data={data} />
          </div>
        </div>

        {product === "clock" && (
          <Field label="Horário de qual lugar?">
            {(id) => (
              <select id={id} value={tz} onChange={(e) => setTz(e.target.value)} className={inputClass}>
                {CLOCK_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {product === "weather" &&
          (city ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e1d3ba] bg-white/60 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{city.name}</p>
                {city.address && <p className="truncate text-sm text-[#6b5440]">{city.address}</p>}
              </div>
              <button type="button" onClick={() => setCity(null)} className="shrink-0 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
                Trocar
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="display-city" className="mb-1.5 block text-sm font-semibold">
                De qual cidade?
              </label>
              <div className="flex gap-2">
                <input
                  id="display-city"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void search();
                    }
                  }}
                  placeholder="Ex: Goiânia, GO"
                  className={inputClass}
                  maxLength={100}
                  autoComplete="off"
                />
                <button type="button" onClick={() => void search()} disabled={searching} className="shrink-0 cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c313b] disabled:opacity-60">
                  {searching ? "Buscando…" : "Buscar"}
                </button>
              </div>
              {searched && hits.length === 0 && !err && <p className="mt-2 text-sm text-[#6b5440]">Nenhuma cidade encontrada. Tente outro nome.</p>}
              {hits.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {hits.map((h, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => setCity(h)} className="w-full cursor-pointer rounded-xl border border-[#e1d3ba] bg-white/70 px-3 py-2 text-left hover:bg-white">
                        <span className="block truncate text-sm font-semibold">{h.name}</span>
                        {h.address && <span className="block truncate text-xs text-[#6b5440]">{h.address}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

        {product === "calendar" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Datas importantes</p>
            {dates.length === 0 && <p className="text-sm text-[#6b5440]">Nenhuma data ainda. Adicione aniversários, viagens, prazos…</p>}
            <ul className="space-y-2">
              {dates.map((d, i) => (
                <li key={i} className="space-y-1.5 rounded-xl border border-[#e1d3ba] bg-white/60 p-2.5">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={d.date}
                      onChange={(e) => setDates((l) => l.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
                      aria-label={`Data ${i + 1}`}
                      className={`${inputClass} !w-auto min-w-0 shrink-0 !px-2.5 !py-2 !text-sm`}
                    />
                    <input
                      value={d.label}
                      onChange={(e) => setDates((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      maxLength={30}
                      placeholder="Ex: Aniversário da Ana"
                      aria-label={`Nome da data ${i + 1}`}
                      className={`${inputClass} min-w-0 !px-2.5 !py-2 !text-sm`}
                    />
                    <button type="button" aria-label={`Tirar a data ${i + 1}`} onClick={() => setDates((l) => l.filter((_, j) => j !== i))} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[#a23b2a] hover:bg-black/5">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#4a3826]">
                    <input type="checkbox" checked={d.yearly} onChange={(e) => setDates((l) => l.map((x, j) => (j === i ? { ...x, yearly: e.target.checked } : x)))} className="size-4 accent-[#d9a21b]" />
                    Repetir todo ano
                  </label>
                </li>
              ))}
            </ul>
            {dates.length < 12 && (
              <button type="button" onClick={() => setDates((l) => [...l, { date: "", label: "", yearly: true }])} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-[#c9b48a] px-3 py-2 text-sm font-semibold text-[#4a3826] transition hover:bg-white/70">
                + Adicionar data
              </button>
            )}
          </div>
        )}

        {product === "calendar" && <p className="text-sm text-[#6b5440]">Mostra o mês de hoje com as datas marcadas e, ao lado, as próximas. Dá para voltar e editar quando quiser.</p>}
        {product === "cookie" && <p className="text-sm text-[#6b5440]">Quem tocar no biscoito quebra e lê uma mensagem; tocar de novo traz outro biscoito.</p>}

        {(product === "bible" || product === "motivation") && <p className="text-sm text-[#6b5440]">Na prévia vai um exemplo. O texto muda sozinho todo dia, à meia-noite.</p>}
        {product === "clock" && <p className="text-sm text-[#6b5440]">A hora passa sozinha, com a data de hoje.</p>}
        {product === "weather" && <p className="text-sm text-[#6b5440]">O tempo agora na cidade escolhida, sempre atualizado.</p>}

        {(err || error) && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {err ?? error}
          </p>
        )}
        <button type="button" disabled={busy || !ready} onClick={() => onSubmit(data)} className={primaryButton}>
          {busy ? "Salvando…" : editing ? "Salvar" : "Escolher o lugar"}
        </button>
      </div>
    </Modal>
  );
}
