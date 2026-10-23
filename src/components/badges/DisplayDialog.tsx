"use client";

import { useEffect, useRef, useState } from "react";
import { InappropriateCover, uploadBookCover } from "@/lib/bookCover";
import { getBrowserSupabase } from "@/lib/supabase";
import { searchPlaces, type PlaceHit } from "@/lib/places";
import type { FrameColor } from "@/lib/style";
import { CLOCK_ZONES } from "../widgets/core";
import { useWT } from "../widgets/wt";
import { DisplayCard, displayName, type DisplayData } from "../widgets";
import type { CalDate } from "../widgets/CalendarWidget";
import { Modal } from "../account/Modal";
import { StyleCarousel } from "./StyleCarousel";
import { MOODS } from "../widgets/MoodWidget";
import { baseStyle, SHAPE_LABEL, shapeOfStyle, withShape, type Shape } from "@/lib/displayShape";
import { Field, inputClass, primaryButton } from "../ui";
import { useTranslations, useLocale } from "next-intl";
import { SAMPLE_TEXT, demoLocaleOf, type DemoLocale } from "@/data/demoText";
import { useLit } from "@/i18n/literal";

const SAMPLE: Record<string, Partial<DisplayData>> = {
  bible: {},
  motivation: {},
  clock: {},
  weather: {},
  calendar: {},
  cookie: {},
  countdown: {},
  daycount: {},
  book: {},
  top3: {},
  poll: {},
  habit: {},
  mood: {},
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
export function DisplayDialog({ open, product, style, styles, initial, editing, busy, error, onClose, onSubmit }: { open: boolean; product: string; /** estilo comprado (fixo) */ style: string; /** pacote: os estilos que a pessoa pode escolher no carrossel (sem isto, vale só `style`) */ styles?: string[]; initial?: DisplayData; editing: boolean; busy: boolean; error: string | null; onClose: () => void; onSubmit: (data: DisplayData) => void }) {
  const tl = useLit();
  const tx = useTranslations("components.badges.DisplayDialog");
  const dLocale = demoLocaleOf(useLocale());
  const wt = useWT();
  const [frame, setFrame] = useState<FrameColor>("gold");
  const [tz, setTz] = useState("local");
  const [dates, setDates] = useState<CalDate[]>([]); // calendário: datas importantes
  // leitura de livro: capa (já enviada ou foto nova escolhida), nome, páginas e jeito de mostrar
  const [plTitle, setPlTitle] = useState(""); // enquete: pergunta e as duas respostas
  const [plOptions, setPlOptions] = useState<string[]>([wt.defYes, wt.defNo]);
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
  const [hbTitle, setHbTitle] = useState(""); // hábito: nome e emoji
  const [mdEmoji, setMdEmoji] = useState("😄"); // humor: emoji e frase
  const [mdNote, setMdNote] = useState("");
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
  const [pick, setPick] = useState(0); // pacote: estilo à vista no carrossel
  // pacote: os estilos (sem o formato) e os formatos que a pessoa tem
  const bases = styles ? [...new Set(styles.map(baseStyle))] : [];
  const shapes = styles ? (["wide", "square", "tall"] as const).filter((sh) => styles.some((s) => shapeOfStyle(s) === sh)) : [];
  const [shapeSel, setShapeSel] = useState<Shape>("wide");
  const shape = shapes.includes(shapeSel) ? shapeSel : (shapes[0] ?? "wide");
  const styleOf = (i: number) => {
    const b = bases[i];
    const id = withShape(b, shape);
    return styles?.includes(id) ? id : (styles?.find((s) => baseStyle(s) === b) ?? id);
  };
  const choices = styles && (bases.length > 1 || shapes.length > 1) ? bases : null;

  useEffect(() => {
    if (!open) return;
    setPick(Math.max(0, styles ? [...new Set(styles.map(baseStyle))].indexOf(baseStyle(style)) : 0));
    setShapeSel(shapeOfStyle(style));
    setFrame((initial?.frame as FrameColor) ?? "gold");
    setTz(initial?.tz ?? "local");
    setDates((initial?.dates ?? []).map((d) => ({ ...d })));
    setPlTitle(initial?.title ?? "");
    setPlOptions(initial?.options && initial.options.length >= 2 ? initial.options.slice(0, 2) : [wt.defYes, wt.defNo]);
    setT3Title(initial?.title ?? "");
    setT3Items([0, 1, 2].map((i) => initial?.items?.[i] ?? ""));
    setBkTitle(initial?.title ?? "");
    setBkPages(initial?.pages ? String(initial.pages) : "");
    setBkRead(initial?.read !== undefined ? String(initial.read) : "");
    setBkView(initial?.view === "count" || initial?.view === "bar" ? initial.view : "both");
    setBkCover(initial?.cover ?? null);
    setBkFile(null);
    setUploading(false);
    setHbTitle(initial?.title ?? "");
    setMdEmoji(initial?.product === "mood" && initial.emoji ? initial.emoji : "😄");
    setMdNote(initial?.product === "mood" ? (initial.note ?? "") : "");
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
    if (!f.type.startsWith("image/")) return setErr(tl("Escolha um arquivo de imagem."));
    setErr(null);
    setBkFile(f);
  }

  async function search() {
    const q = query.trim();
    if (q.length < 3) return setErr(tx("m_digitePeloMenos3Letras"));
    setErr(null);
    setSearching(true);
    try {
      setHits(await searchPlaces(q));
      setSearched(true);
    } catch {
      setErr(tx("m_naoFoiPossivelBuscarAgora"));
    } finally {
      setSearching(false);
    }
  }

  const base: DisplayData = {
    product,
    frame,
    ...SAMPLE[product],
    ...(product === "bible" ? { text: SAMPLE_TEXT[dLocale].bibleText, ref: SAMPLE_TEXT[dLocale].bibleRef } : product === "motivation" ? { text: SAMPLE_TEXT[dLocale].motivation } : {}),
    ...(product === "clock" ? { tz } : {}),
    ...(product === "calendar" ? { dates: dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date)) } : {}),
    // na prévia, enquanto não preencheu, aparece um exemplo (30 dias adiante)
    ...(product === "countdown" ? { title: cdTitle.trim() || tx("m_seuEvento"), target: /^\d{4}-\d{2}-\d{2}$/.test(cdDate) ? cdDate : isoPlus(30), time: cdTime || "00:00" } : {}),
    ...(product === "book"
      ? { title: bkTitle.trim(), pages: Number(bkPages) > 0 ? Math.round(Number(bkPages)) : 320, read: bkPages && bkRead !== "" ? Math.round(Number(bkRead)) : bkPages ? 0 : 120, view: bkView, ...(bkPreview || bkCover ? { cover: bkPreview ?? bkCover ?? undefined } : {}) }
      : {}),
    ...(product === "top3" ? { title: t3Title.trim() || SAMPLE_TEXT[dLocale].top3, items: t3Items.map((x, i) => x.trim() || SAMPLE_TEXT[dLocale].food[i]) } : {}),
    ...(product === "poll" ? { title: plTitle.trim() || tx("m_voceGostaDePizzaCom"), options: [0, 1].map((i) => (plOptions[i] ?? "").trim() || [wt.defYes, wt.defNo][i]) } : {}),
    ...(product === "daycount" ? { title: dcTitle.trim() || tx("m_juntosHa"), since: /^\d{4}-\d{2}-\d{2}$/.test(dcSince) ? dcSince : isoPlus(-100) } : {}),
    ...(product === "habit" ? { title: hbTitle.trim() || SAMPLE_TEXT[dLocale].habit, days: initial?.product === "habit" ? (initial.days ?? []) : [] } : {}),
    ...(product === "mood" ? { emoji: mdEmoji.trim() || "😄", note: mdNote.trim(), day: isoPlus(0) } : {}),
    ...(product === "weather" ? { city: city?.name ?? "São Paulo", lat: city?.lat ?? 0, lon: city?.lon ?? 0 } : {}),
  };
  const chosen = choices ? styleOf(Math.min(pick, choices.length - 1)) : style;
  const data: DisplayData = { ...base, style: chosen };
  const ready = product === "habit" ? hbTitle.trim().length > 0 : product === "weather" ? !!city : product === "countdown" ? cdTitle.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(cdDate) : product === "daycount" ? dcTitle.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dcSince) : product === "poll" ? plTitle.trim().length > 0 && [0, 1].every((i) => (plOptions[i] ?? "").trim().length > 0) : product === "top3" ? t3Title.trim().length > 0 && t3Items.every((x) => x.trim().length > 0) : product === "book" ? Number(bkPages) >= 1 && Number(bkPages) <= 10000 && bkRead !== "" && Number(bkRead) >= 0 && Number(bkRead) <= Number(bkPages) : true;
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
      setErr(e instanceof InappropriateCover ? tx("m_essaImagemNaoPodeSer") : e instanceof Error ? tl(e.message) : tx("m_naoFoiPossivelEnviarA"));
    } finally {
      setUploading(false);
    }
  }
  const title = displayName(product + ":" + chosen, tl);

  return (
    <Modal open={open} onClose={onClose} title={title} label={title}>
      <div className="space-y-4">
        {choices ? (
          // pacote: desliza entre os estilos e o que estiver à vista é o que vai para o mural
          <div className="overflow-hidden rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/60 px-2 pt-5 pb-3">
            <StyleCarousel
              count={choices.length}
              index={Math.min(pick, choices.length - 1)}
              onIndex={setPick}
              label={tl("Estilos do pacote")}
              names={choices.map((s) => displayName(`${product}:${s}`, tl))}
              slide={(i) => (
                <div className="flex justify-center px-10">
                  <div className="text-[min(11px,2.2vw)]">
                    <DisplayCard data={{ ...base, style: styleOf(i) }} preview />
                  </div>
                </div>
              )}
            />
            {shapes.length > 1 && (
              <div role="radiogroup" aria-label={tl("Formato")} className="mx-auto mt-3 grid max-w-xs grid-cols-2 gap-1 rounded-xl border border-[#e1d3ba] bg-white/60 p-0.5">
                {shapes.map((sh) => (
                  <button key={sh} type="button" role="radio" aria-checked={shape === sh} onClick={() => setShapeSel(sh)} className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${shape === sh ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
                    {SHAPE_LABEL[sh]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9c9ad] bg-[#e9d8b6]/60 px-2 py-5">
            <div className="text-[min(11px,2.2vw)]">
              <DisplayCard data={data} preview />
            </div>
          </div>
        )}

        {product === "clock" && editing && (
          <Field label={tx("horarioDeQualLugar")}>
            {(id) => (
              <select id={id} value={tz} onChange={(e) => setTz(e.target.value)} className={inputClass}>
                {CLOCK_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {wt.zones[z.id] ?? z.label}
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
                {tx("trocar")}</button>
            </div>
          ) : (
            <div>
              <label htmlFor="display-city" className="mb-1.5 block text-sm font-semibold">
                {tx("deQualCidade")}</label>
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
                  placeholder={tx("exGoianiaGo")}
                  className={inputClass}
                  maxLength={100}
                  autoComplete="off"
                />
                <button type="button" onClick={() => void search()} disabled={searching} className="shrink-0 cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c313b] disabled:opacity-60">
                  {searching ? tl("Buscando…") : tl("Buscar")}
                </button>
              </div>
              {searched && hits.length === 0 && !err && <p className="mt-2 text-sm text-[#6b5440]">{tx("nenhumaCidadeEncontradaTenteOutro")}</p>}
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
            <Field label={tx("tituloDoContador")}>
              {(id) => <input id={id} value={cdTitle} onChange={(e) => setCdTitle(e.target.value)} maxLength={30} placeholder={tx("exFormaturaNatalAniversario")} className={inputClass} autoComplete="off" />}
            </Field>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Field label={tx("data")}>{(id) => <input id={id} type="date" value={cdDate} onChange={(e) => setCdDate(e.target.value)} className={inputClass} />}</Field>
              </div>
              <div className="w-32 shrink-0">
                <Field label={tx("horaOpcional")}>{(id) => <input id={id} type="time" value={cdTime} onChange={(e) => setCdTime(e.target.value)} className={inputClass} />}</Field>
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
                  <img src={bkPreview ?? bkCover ?? ""} alt={tx("capaEscolhida")} className="size-full object-cover" />
                ) : (
                  <span className="px-1 text-center text-[11px] leading-tight text-[#6b5440]">{tx("semCapa")}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <input ref={bkInput} type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} aria-label={tx("escolherAFotoDaCapa")} />
                <button type="button" onClick={() => bkInput.current?.click()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9c9ad] bg-white px-3 py-2 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf]">
                  {bkPreview || bkCover ? tl("Trocar a capa") : tl("Escolher a foto da capa")}
                </button>
                {(bkPreview || bkCover) && (
                  <button type="button" onClick={() => { setBkFile(null); setBkCover(null); }} className="ml-2 cursor-pointer text-sm font-semibold text-[#a23b2a] underline">
                    {tx("tirar")}</button>
                )}
              </div>
            </div>
            <Field label={tx("nomeDoLivroOpcional")}>
              {(id) => <input id={id} value={bkTitle} onChange={(e) => setBkTitle(e.target.value)} maxLength={40} placeholder={tx("exOPequenoPrincipe")} className={inputClass} autoComplete="off" />}
            </Field>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Field label={tx("paginasLidas")}>{(id) => <input id={id} type="number" inputMode="numeric" min={0} max={10000} value={bkRead} onChange={(e) => setBkRead(e.target.value)} className={inputClass} />}</Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label={tx("totalDePaginas")}>{(id) => <input id={id} type="number" inputMode="numeric" min={1} max={10000} value={bkPages} onChange={(e) => setBkPages(e.target.value)} className={inputClass} />}</Field>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">{tx("comoMostrarOProgresso")}</p>
              <div role="radiogroup" aria-label={tx("comoMostrarOProgresso")} className="grid grid-cols-3 gap-1 rounded-xl border border-[#e1d3ba] bg-white/60 p-0.5">
                {(
                  [
                    ["count", tl("Páginas")],
                    ["bar", tl("Barra")],
                    ["both", tl("Os dois")],
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

        {product === "poll" && (
          <div className="space-y-3">
            <Field label={tx("perguntaDaEnquete")}>
              {(id) => <input id={id} value={plTitle} onChange={(e) => setPlTitle(e.target.value)} maxLength={90} placeholder={tx("exVoceGostaDePizza")} className={inputClass} autoComplete="off" />}
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-semibold">{tx("asDuasRespostas")}</p>
              {([0, 1] as const).map((i) => (
                <input key={i} value={plOptions[i] ?? ""} onChange={(e) => setPlOptions((l) => [0, 1].map((j) => (j === i ? e.target.value : (l[j] ?? ""))))} maxLength={40} aria-label={`Resposta ${i + 1}`} placeholder={i === 0 ? tl("Ex: Sim") : tx("m_exNao")} className={inputClass} autoComplete="off" />
              ))}
            </div>
            {editing && <p className="text-xs text-[#8a7b69]">{tx("mudarAsRespostasZeraOs")}</p>}
          </div>
        )}

        {product === "top3" && (
          <div className="space-y-3">
            <Field label={tx("temaDoSeuTop3")}>
              {(id) => <input id={id} value={t3Title} onChange={(e) => setT3Title(e.target.value)} maxLength={30} placeholder={tx("exMinhasComidasFavoritas")} className={inputClass} autoComplete="off" />}
            </Field>
            {([0, 1, 2] as const).map((i) => (
              <Field key={i} label={`${i + 1}º lugar`}>
                {(id) => (
                  <input id={id} value={t3Items[i]} onChange={(e) => setT3Items((l) => l.map((x, j) => (j === i ? e.target.value : x)))} maxLength={30} placeholder={[tl("Ex: Lasanha"), tl("Ex: Pizza"), tl("Ex: Sorvete")][i]} className={inputClass} autoComplete="off" />
                )}
              </Field>
            ))}
          </div>
        )}

        {(product === "habit" || product === "mood") && (
          <div className="space-y-3">
            {product === "habit" && (
              <Field label={tl("Nome do hábito")}>
                {(id) => <input id={id} value={hbTitle} onChange={(e) => setHbTitle(e.target.value)} maxLength={30} placeholder={tl("Ex: Treinar")} className={inputClass} autoComplete="off" />}
              </Field>
            )}
            {product === "mood" && (
            <div>
              <p className="mb-1.5 text-sm font-semibold">{tl("Como você está?")}</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tl("Como você está?")}>
                {MOODS.map((e) => {
                  const cur = mdEmoji;
                  return (
                    <button key={e} type="button" role="radio" aria-checked={cur === e} onClick={() => setMdEmoji(e)} className={`grid size-11 cursor-pointer place-items-center rounded-xl border text-2xl transition-colors ${cur === e ? "border-[#1f232b] bg-[#1f232b]/10" : "border-[#e1d3ba] bg-white/60 hover:bg-white"}`}>
                      {e}
                    </button>
                  );
                })}
              </div>
              <input value={mdEmoji} onChange={(e) => setMdEmoji(e.target.value)} maxLength={8} aria-label={tl("Outro emoji")} placeholder={tl("Ou digite outro emoji")} className={`${inputClass} mt-2`} autoComplete="off" />
            </div>
            )}
            {product === "mood" && (
              <Field label={tl("Uma frase curta (opcional)")}>
                {(id) => <input id={id} value={mdNote} onChange={(e) => setMdNote(e.target.value)} maxLength={60} placeholder={tl("Ex: Dia incrível!")} className={inputClass} autoComplete="off" />}
              </Field>
            )}
            {product === "habit" && !editing && <p className="text-xs text-[#8a7b69]">{tl("Depois de colocar no mural, toque em “Marcar hoje” todo dia para manter a sequência.")}</p>}
          </div>
        )}

        {product === "daycount" && (
          <div className="space-y-3">
            <Field label={tx("nomeOQueEstaContando")}>
              {(id) => <input id={id} value={dcTitle} onChange={(e) => setDcTitle(e.target.value)} maxLength={30} placeholder={tx("exJuntosHaSemFumar")} className={inputClass} autoComplete="off" />}
            </Field>
            <Field label={tx("desdeQuando")}>{(id) => <input id={id} type="date" value={dcSince} onChange={(e) => setDcSince(e.target.value)} className={inputClass} />}</Field>
          </div>
        )}

        {product === "calendar" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{tx("datasImportantes")}</p>
            {dates.length === 0 && <p className="text-sm text-[#6b5440]">{tx("nenhumaDataAindaAdicioneAniversarios")}</p>}
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
                      placeholder={tx("exAniversarioDaAna")}
                      aria-label={tx("m_nomeDaData", { v0: i + 1 })}
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
                    {tx("x_repetirTodoAno")}</label>
                </li>
              ))}
            </ul>
            {dates.length < 12 && (
              <button type="button" onClick={() => setDates((l) => [...l, { date: "", label: "", yearly: true }])} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-[#c9b48a] px-3 py-2 text-sm font-semibold text-[#4a3826] transition hover:bg-white/70">
                {tx("adicionarData")}</button>
            )}
          </div>
        )}

        {product === "calendar" && <p className="text-sm text-[#6b5440]">{tx("mostraOMesDeHoje")}</p>}
        {product === "cookie" && <p className="text-sm text-[#6b5440]">{tx("quemTocarNoBiscoitoQuebra")}</p>}

        {(product === "bible" || product === "motivation") && <p className="text-sm text-[#6b5440]">{tx("naPreviaVaiUmExemplo")}</p>}
        {product === "clock" && <p className="text-sm text-[#6b5440]">{tx("aHoraPassaSozinhaCom")}</p>}
        {product === "weather" && <p className="text-sm text-[#6b5440]">{tx("quemVeOMuralVe")}</p>}

        {(err || error) && (
          <p role="alert" className="text-sm text-[#a23b2a]">
            {err ?? error}
          </p>
        )}
        <button type="button" disabled={busy || uploading || !ready} onClick={() => void submit()} className={primaryButton}>
          {uploading ? tl("Enviando a capa…") : busy ? tl("Salvando…") : editing ? tl("Salvar") : tl("Escolher o lugar")}
        </button>
      </div>
    </Modal>
  );
}
