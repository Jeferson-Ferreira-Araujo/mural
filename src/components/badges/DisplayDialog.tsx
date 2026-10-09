"use client";

import { useEffect, useState } from "react";
import { searchPlaces, type PlaceHit } from "@/lib/places";
import type { FrameColor } from "@/lib/style";
import { CLOCK_ZONES } from "../widgets/core";
import { DisplayCard, defaultStyle, stylesOf, type DisplayData } from "../widgets";
import { Modal } from "../account/Modal";
import { FrameColorPicker } from "../composer/StylePickers";
import { Field, inputClass, primaryButton } from "../ui";

const NAME: Record<string, string> = { bible: "Versículo do dia", motivation: "Frase motivacional", clock: "Relógio", weather: "Clima" };
const SAMPLE: Record<string, Partial<DisplayData>> = {
  bible: { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  motivation: { text: "Disciplina de hoje é o resultado de amanhã." },
  clock: {},
  weather: {},
};

/**
 * Antes de soltar o pin da loja no mural (ou ao editá-lo): escolher o estilo, a cor do contorno e, no relógio, o horário; no clima, a cidade.
 * `onSubmit` recebe os dados prontos para o servidor.
 */
export function DisplayDialog({ open, product, initial, editing, busy, error, onClose, onSubmit }: { open: boolean; product: string; initial?: DisplayData; editing: boolean; busy: boolean; error: string | null; onClose: () => void; onSubmit: (data: DisplayData) => void }) {
  const [style, setStyle] = useState("");
  const [frame, setFrame] = useState<FrameColor>("gold");
  const [tz, setTz] = useState("America/Sao_Paulo");
  const [city, setCity] = useState<PlaceHit | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStyle(initial?.style ?? defaultStyle(product));
    setFrame((initial?.frame as FrameColor) ?? "gold");
    setTz(initial?.tz ?? "America/Sao_Paulo");
    setCity(initial?.city && typeof initial.lat === "number" && typeof initial.lon === "number" ? { name: initial.city, address: "", lat: initial.lat, lon: initial.lon } : null);
    setQuery("");
    setHits([]);
    setSearched(false);
    setErr(null);
  }, [open, initial, product]);

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
    ...(product === "weather" ? { city: city?.name ?? "São Paulo", lat: city?.lat ?? 0, lon: city?.lon ?? 0 } : {}),
  };
  const data: DisplayData = { ...base, style: style || defaultStyle(product) };
  const ready = product !== "weather" || !!city;
  const title = NAME[product] ?? "Pin da loja";
  const styles = stylesOf(product);

  return (
    <Modal open={open} onClose={onClose} title={title} label={title}>
      <div className="space-y-4">
        <div className="flex justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/60 px-2 py-5">
          <div className="text-[min(11px,2.2vw)]">
            <DisplayCard data={data} />
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Estilo</legend>
          <div role="radiogroup" aria-label="Estilo" className="grid grid-cols-2 gap-2">
            {styles.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={style === s.id}
                onClick={() => setStyle(s.id)}
                className={`cursor-pointer rounded-xl border-2 p-1.5 text-left transition ${style === s.id ? "border-[#d9a21b] bg-[#fff6dd] ring-2 ring-[#d9a21b]/40" : "border-[#e1d3ba] bg-white/70 hover:bg-[#fff6dd]"}`}
              >
                <div className="pointer-events-none overflow-hidden rounded-lg text-[4.4px] sm:text-[5.2px]">
                  <DisplayCard data={{ ...base, style: s.id }} />
                </div>
                <span className="mt-1 block text-xs font-bold">
                  {i + 1}. {s.name}
                </span>
                <span className="block text-[11px] text-[#6b5440]">{s.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <FrameColorPicker value={frame} onChange={setFrame} />

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
