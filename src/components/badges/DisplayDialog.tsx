"use client";

import { useEffect, useRef, useState } from "react";
import { InappropriateCover, uploadBookCover } from "@/lib/bookCover";
import { isSpotifyTrackLink, SearchUnavailable, searchSongs, songFromLink, type SongHit } from "@/lib/songSearch";
import { getBrowserSupabase } from "@/lib/supabase";
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
  countdown: {},
  daycount: {},
  book: {},
  top3: {},
  song: {},
};

const isoPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Antes de soltar o pin da loja no mural (ou ao editá-lo): escolher o estilo, a cor do contorno e, no relógio, o horário; no clima, a cidade.
 * `onSubmit` recebe os dados prontos para o servidor.
 */
export function DisplayDialog({ open, product, style, initial, editing, busy, error, onClose, onSubmit }: { open: boolean; product: string; /** estilo comprado (fixo) */ style: string; initial?: DisplayData; editing: boolean; busy: boolean; error: string | null; onClose: () => void; onSubmit: (data: DisplayData) => void }) {
  const [frame, setFrame] = useState<FrameColor>("gold");
  const [tz, setTz] = useState("local");
  const [dates, setDates] = useState<CalDate[]>([]); // calendário: datas importantes
  // leitura de livro: capa (já enviada ou foto nova escolhida), nome, páginas e jeito de mostrar
  // música favorita: busca por nome (ou link do Spotify) e a faixa escolhida
  const [spQuery, setSpQuery] = useState("");
  const [spHits, setSpHits] = useState<SongHit[]>([]);
  const [spSearching, setSpSearching] = useState(false);
  const [spNote, setSpNote] = useState<string | null>(null);
  const [spChosen, setSpChosen] = useState<SongHit | null>(null);
  const [t3Title, setT3Title] = useState(""); // top 3: tema e três itens
  const [t3Items, setT3Items] = useState<string[]>(["", "", ""]);
  const [bkTitle, setBkTitle] = useState("");
  const [bkPages, setBkPages] = useState("");
  const [bkRead, setBkRead] = useState("");
  const [bkView, setBkView] = useState<"count" | "bar" | "both">("both");
  const [bkCover, setBkCover] = useState<string | null>(null);
  const [bkFile, setBkFile] = useState<File | null>(null);
  const [bkPreview, setBkPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bkInput = useRef<HTMLInputElement>(null);
  const [dcTitle, setDcTitle] = useState(""); // contador de dias: nome e data de início
  const [dcSince, setDcSince] = useState("");
  const [cdTitle, setCdTitle] = useState(""); // contador regressivo: nome, data e hora
  const [cdDate, setCdDate] = useState("");
  const [cdTime, setCdTime] = useState("");
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
    setSpQuery("");
    setSpHits([]);
    setSpNote(null);
    setSpChosen(initial?.track ? { track: initial.track, title: initial.title ?? "", artist: initial.artist ?? "", cover: initial.cover ?? null } : null);
    setT3Title(initial?.title ?? "");
    setT3Items([0, 1, 2].map((i) => initial?.items?.[i] ?? ""));
    setBkTitle(initial?.title ?? "");
    setBkPages(initial?.pages ? String(initial.pages) : "");
    setBkRead(initial?.read !== undefined ? String(initial.read) : "");
    setBkView(initial?.view === "count" || initial?.view === "bar" ? initial.view : "both");
    setBkCover(initial?.cover ?? null);
    setBkFile(null);
    setUploading(false);
    setDcTitle(initial?.title ?? "");
    setDcSince(initial?.since ?? "");
    setCdTitle(initial?.title ?? "");
    setCdDate(initial?.target ?? "");
    setCdTime(initial?.time && initial.time !== "00:00" ? initial.time : "");
    setCity(initial?.city && typeof initial.lat === "number" && typeof initial.lon === "number" ? { name: initial.city, address: "", lat: initial.lat, lon: initial.lon } : null);
    setQuery("");
    setHits([]);
    setSearched(false);
    setErr(null);
  }, [open, initial, product, style]);

  useEffect(() => {
    if (!bkFile) return setBkPreview(null);
    const u = URL.createObjectURL(bkFile);
    setBkPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [bkFile]);
  function pickCover(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Escolha um arquivo de imagem.");
    setErr(null);
    setBkFile(f);
  }

  async function searchSong() {
    const q = spQuery.trim();
    if (q.length < 2) return setSpNote("Digite o nome da música.");
    setSpNote(null);
    setSpSearching(true);
    try {
      if (isSpotifyTrackLink(q)) {
        const one = await songFromLink(q);
        if (one) setSpChosen(one);
        else setSpNote("Não encontramos essa música. Confira o link.");
        setSpHits([]);
      } else {
        const hits = await searchSongs(q);
        setSpHits(hits);
        if (hits.length === 0) setSpNote("Nada encontrado. Tente o nome com o artista.");
      }
    } catch (e) {
      setSpNote(e instanceof SearchUnavailable ? "A busca por nome ainda não está ativa. No Spotify, toque em Compartilhar > Copiar link da música e cole o link aqui." : "Não foi possível buscar agora. Tente de novo em instantes.");
    } finally {
      setSpSearching(false);
    }
  }

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
    // na prévia, enquanto não preencheu, aparece um exemplo (30 dias adiante)
    ...(product === "countdown" ? { title: cdTitle.trim() || "Seu evento", target: /^\d{4}-\d{2}-\d{2}$/.test(cdDate) ? cdDate : isoPlus(30), time: cdTime || "00:00" } : {}),
    ...(product === "book"
      ? { title: bkTitle.trim(), pages: Number(bkPages) > 0 ? Math.round(Number(bkPages)) : 320, read: bkPages && bkRead !== "" ? Math.round(Number(bkRead)) : bkPages ? 0 : 120, view: bkView, ...(bkPreview || bkCover ? { cover: bkPreview ?? bkCover ?? undefined } : {}) }
      : {}),
    ...(product === "top3" ? { title: t3Title.trim() || "Comidas favoritas", items: t3Items.map((x, i) => x.trim() || ["Lasanha", "Pizza", "Sorvete"][i]) } : {}),
    ...(product === "song" ? { title: spChosen?.title || "Garota de Ipanema", artist: spChosen?.artist ?? (spChosen ? "" : "Tom Jobim"), ...(spChosen ? { track: spChosen.track } : {}), ...(spChosen?.cover ? { cover: spChosen.cover } : {}) } : {}),
    ...(product === "daycount" ? { title: dcTitle.trim() || "Juntos há", since: /^\d{4}-\d{2}-\d{2}$/.test(dcSince) ? dcSince : isoPlus(-100) } : {}),
    ...(product === "weather" ? { city: city?.name ?? "São Paulo", lat: city?.lat ?? 0, lon: city?.lon ?? 0 } : {}),
  };
  const data: DisplayData = { ...base, style };
  const ready = product === "weather" ? !!city : product === "countdown" ? cdTitle.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(cdDate) : product === "daycount" ? dcTitle.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dcSince) : product === "song" ? !!spChosen : product === "top3" ? t3Title.trim().length > 0 && t3Items.every((x) => x.trim().length > 0) : product === "book" ? Number(bkPages) >= 1 && Number(bkPages) <= 10000 && bkRead !== "" && Number(bkRead) >= 0 && Number(bkRead) <= Number(bkPages) : true;
  // leitura de livro: a foto nova sobe e passa pela verificação antes de salvar
  async function submit() {
    if (product !== "book") return onSubmit(data);
    setErr(null);
    const { cover: _c, ...rest } = data;
    void _c;
    if (!bkFile) return onSubmit({ ...rest, ...(bkCover ? { cover: bkCover } : {}) });
    setUploading(true);
    try {
      const up = await uploadBookCover(getBrowserSupabase(), bkFile);
      onSubmit({ ...rest, cover: up.url, approval: up.approval } as DisplayData);
    } catch (e) {
      setErr(e instanceof InappropriateCover ? "Essa imagem não pôde ser usada. Escolha outra foto de capa." : e instanceof Error ? e.message : "Não foi possível enviar a capa agora.");
    } finally {
      setUploading(false);
    }
  }
  const title = displayName(product + ":" + style);

  return (
    <Modal open={open} onClose={onClose} title={title} label={title}>
      <div className="space-y-4">
        <div className="flex justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/60 px-2 py-5">
          <div className="text-[min(11px,2.2vw)]">
            <DisplayCard data={data} preview />
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

        {product === "countdown" && (
          <div className="space-y-3">
            <Field label="Nome do evento">
              {(id) => <input id={id} value={cdTitle} onChange={(e) => setCdTitle(e.target.value)} maxLength={30} placeholder="Ex: Viagem, Formatura, Natal" className={inputClass} autoComplete="off" />}
            </Field>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Field label="Data">{(id) => <input id={id} type="date" value={cdDate} onChange={(e) => setCdDate(e.target.value)} className={inputClass} />}</Field>
              </div>
              <div className="w-32 shrink-0">
                <Field label="Hora (opcional)">{(id) => <input id={id} type="time" value={cdTime} onChange={(e) => setCdTime(e.target.value)} className={inputClass} />}</Field>
              </div>
            </div>
          </div>
        )}

        {product === "book" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="grid h-28 w-[4.7rem] shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-[#c9b48a] bg-white/60">
                {bkPreview || bkCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bkPreview ?? bkCover ?? ""} alt="Capa escolhida" className="size-full object-cover" />
                ) : (
                  <span className="px-1 text-center text-[11px] leading-tight text-[#6b5440]">Sem capa</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <input ref={bkInput} type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} aria-label="Escolher a foto da capa" />
                <button type="button" onClick={() => bkInput.current?.click()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9c9ad] bg-white px-3 py-2 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
                  {bkPreview || bkCover ? "Trocar a capa" : "Escolher a foto da capa"}
                </button>
                {(bkPreview || bkCover) && (
                  <button type="button" onClick={() => { setBkFile(null); setBkCover(null); }} className="ml-2 cursor-pointer text-sm font-semibold text-[#a23b2a] underline">
                    Tirar
                  </button>
                )}
              </div>
            </div>
            <Field label="Nome do livro (opcional)">
              {(id) => <input id={id} value={bkTitle} onChange={(e) => setBkTitle(e.target.value)} maxLength={40} placeholder="Ex: O Pequeno Príncipe" className={inputClass} autoComplete="off" />}
            </Field>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Field label="Páginas lidas">{(id) => <input id={id} type="number" inputMode="numeric" min={0} max={10000} value={bkRead} onChange={(e) => setBkRead(e.target.value)} className={inputClass} />}</Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Total de páginas">{(id) => <input id={id} type="number" inputMode="numeric" min={1} max={10000} value={bkPages} onChange={(e) => setBkPages(e.target.value)} className={inputClass} />}</Field>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Como mostrar o progresso</p>
              <div role="radiogroup" aria-label="Como mostrar o progresso" className="grid grid-cols-3 gap-1 rounded-xl border border-[#e1d3ba] bg-white/60 p-0.5">
                {(
                  [
                    ["count", "Páginas"],
                    ["bar", "Barra"],
                    ["both", "Os dois"],
                  ] as const
                ).map(([v, label]) => (
                  <button key={v} type="button" role="radio" aria-checked={bkView === v} onClick={() => setBkView(v)} className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${bkView === v ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {product === "song" && (
          <div className="space-y-3">
            {spChosen ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#e1d3ba] bg-white/60 px-3 py-2.5">
                {spChosen.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spChosen.cover} alt="" referrerPolicy="no-referrer" className="size-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#e4d3ae] text-xl">♪</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{spChosen.title}</p>
                  {spChosen.artist && <p className="truncate text-sm text-[#6b5440]">{spChosen.artist}</p>}
                </div>
                <button type="button" onClick={() => { setSpChosen(null); setSpHits([]); }} className="shrink-0 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="song-q" className="mb-1.5 block text-sm font-semibold">
                  Nome da música (ou link do Spotify)
                </label>
                <div className="flex gap-2">
                  <input
                    id="song-q"
                    value={spQuery}
                    onChange={(e) => setSpQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchSong();
                      }
                    }}
                    placeholder="Ex: Garota de Ipanema"
                    className={inputClass}
                    maxLength={300}
                    autoComplete="off"
                  />
                  <button type="button" onClick={() => void searchSong()} disabled={spSearching} className="shrink-0 cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c313b] disabled:opacity-60">
                    {spSearching ? "Buscando…" : "Buscar"}
                  </button>
                </div>
                {spNote && <p className="mt-2 text-sm text-[#6b5440]">{spNote}</p>}
                {spHits.length > 0 && (
                  <ul className="mt-2 max-h-60 space-y-1.5 overflow-y-auto">
                    {spHits.map((h) => (
                      <li key={h.track}>
                        <button type="button" onClick={() => { setSpChosen(h); setSpNote(null); }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#e1d3ba] bg-white/70 p-2 text-left hover:bg-white">
                          {h.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={h.cover} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-11 shrink-0 rounded-md object-cover" />
                          ) : (
                            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#e4d3ae]">♪</span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{h.title}</span>
                            {h.artist && <span className="block truncate text-xs text-[#6b5440]">{h.artist}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1.5 text-[11px] text-[#8a7b69]">Quem abrir o mural toca a música pelo player do Spotify.</p>
              </div>
            )}
          </div>
        )}

        {product === "top3" && (
          <div className="space-y-3">
            <Field label="Tema do seu top 3">
              {(id) => <input id={id} value={t3Title} onChange={(e) => setT3Title(e.target.value)} maxLength={30} placeholder="Ex: Minhas comidas favoritas" className={inputClass} autoComplete="off" />}
            </Field>
            {([0, 1, 2] as const).map((i) => (
              <Field key={i} label={`${i + 1}º lugar`}>
                {(id) => (
                  <input id={id} value={t3Items[i]} onChange={(e) => setT3Items((l) => l.map((x, j) => (j === i ? e.target.value : x)))} maxLength={30} placeholder={["Ex: Lasanha", "Ex: Pizza", "Ex: Sorvete"][i]} className={inputClass} autoComplete="off" />
                )}
              </Field>
            ))}
          </div>
        )}

        {product === "daycount" && (
          <div className="space-y-3">
            <Field label="Nome (o que está contando)">
              {(id) => <input id={id} value={dcTitle} onChange={(e) => setDcTitle(e.target.value)} maxLength={30} placeholder="Ex: Juntos há, Sem fumar, Casa nova" className={inputClass} autoComplete="off" />}
            </Field>
            <Field label="Desde quando?">{(id) => <input id={id} type="date" value={dcSince} onChange={(e) => setDcSince(e.target.value)} className={inputClass} />}</Field>
          </div>
        )}

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
        {product === "weather" && <p className="text-sm text-[#6b5440]">Quem vê o mural vê o tempo do lugar onde está (se permitir a localização). Sem permissão, vale esta cidade.</p>}

        {(err || error) && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {err ?? error}
          </p>
        )}
        <button type="button" disabled={busy || uploading || !ready} onClick={() => void submit()} className={primaryButton}>
          {uploading ? "Enviando a capa…" : busy ? "Salvando…" : editing ? "Salvar" : "Escolher o lugar"}
        </button>
      </div>
    </Modal>
  );
}
