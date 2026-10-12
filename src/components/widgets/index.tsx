"use client";

import { CalendarWidget, type CalDate } from "./CalendarWidget";
import { ClockWidget } from "./ClockWidget";
import { BookWidget } from "./BookWidget";
import { CookieWidget } from "./CookieWidget";
import { CountdownWidget } from "./CountdownWidget";
import { DateWidget } from "./DateWidget";
import { DaysWidget } from "./DaysWidget";
import { TextWidget } from "./TextWidget";
import { WeatherWidget } from "./WeatherWidget";
import { SHARED_SKIN_INFO } from "./skins";
import { SongWidget } from "./SongWidget";
import { Top3Widget } from "./Top3Widget";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { promessaDoDia, usePromessaDoDia } from "@/lib/promessas";

/** Dados de um widget da loja (guardados no banco; o texto do dia vem do servidor). */
export type DisplayData = { product: string; style?: string; frame?: string; tz?: string; city?: string; lat?: number; lon?: number; text?: string; ref?: string | null; /** contador regressivo: nome, data e hora */ title?: string; target?: string; time?: string; /** contador de dias: desde quando */ since?: string; /** leitura de livro */ cover?: string; pages?: number; read?: number; view?: string; /** top 3 */ items?: string[]; /** música favorita */ track?: string; artist?: string; /** calendário: datas importantes marcadas */ dates?: CalDate[] };

/** Os estilos de cada pin da loja (o primeiro é o padrão). */
export const WIDGET_STYLES: Record<string, { id: string; name: string; hint: string }[]> = {
  text: [
    { id: "classic", name: "Clássico", hint: "Visual clean e elegante." },
    { id: "night", name: "Noturno", hint: "Estilo moderno e inspirador." },
    { id: "floral", name: "Floral", hint: "Leve e positivo." },
    { id: "natural", name: "Natural", hint: "Aconchegante e especial." },
  ],
  clock: [
    { id: "sunset", name: "Súnset", hint: "Paisagem dinâmica." },
    { id: "flip", name: "Flip Clock", hint: "Estilo retrô moderno." },
    { id: "minimal", name: "Minimal", hint: "Clean e sofisticado." },
    { id: "analog", name: "Analógico", hint: "Clássico e elegante." },
    { id: "pixel", name: "Pixel", hint: "Divertido e nostálgico." },
  ],
  // os de números e imagens têm cinco estilos, cada um em formato retangular (o id) e quadrado ("q-" + id)
  calendar: [
    { id: "paper", name: "Parede", hint: "Calendário de papel." },
    { id: "modern", name: "Moderno", hint: "Escuro e limpo." },
    { id: "mint", ...SHARED_SKIN_INFO.mint },
    { id: "rose", ...SHARED_SKIN_INFO.rose },
    { id: "mono", ...SHARED_SKIN_INFO.mono },
  ],
  date: [
    { id: "page", name: "Folha", hint: "Folha de calendário com a data de hoje." },
    { id: "night", name: "Noite", hint: "Escuro e limpo." },
    { id: "mint", ...SHARED_SKIN_INFO.mint },
    { id: "rose", ...SHARED_SKIN_INFO.rose },
    { id: "mono", ...SHARED_SKIN_INFO.mono },
  ],
  countdown: [
    { id: "neon", name: "Neon", hint: "Escuro, com números luminosos." },
    { id: "light", name: "Claro", hint: "Leve e de papel." },
    { id: "dusk", ...SHARED_SKIN_INFO.dusk },
    { id: "mint", ...SHARED_SKIN_INFO.mint },
    { id: "mono", ...SHARED_SKIN_INFO.mono },
  ],
  daycount: [
    { id: "warm", name: "Quente", hint: "Claro e caloroso." },
    { id: "dusk", ...SHARED_SKIN_INFO.dusk },
    { id: "mint", ...SHARED_SKIN_INFO.mint },
    { id: "night", ...SHARED_SKIN_INFO.night },
    { id: "mono", ...SHARED_SKIN_INFO.mono },
  ],
  book: [
    { id: "paper", name: "Clássico", hint: "Papel claro." },
    { id: "night", name: "Noite", hint: "Escuro e limpo." },
    { id: "wood", name: "Estante", hint: "Madeira e dourado." },
  ],
  top3: [
    { id: "podium", name: "Pódio", hint: "Papel claro, medalhas." },
    { id: "night", name: "Noite", hint: "Escuro e limpo." },
    { id: "neon", name: "Neon", hint: "Roxo e rosa luminosos." },
  ],
  song: [
    { id: "vinyl", name: "Vinil", hint: "Escuro, com o disco." },
    { id: "classic", name: "Clássico", hint: "Papel claro." },
    { id: "neon", name: "Neon", hint: "Roxo e rosa luminosos." },
  ],
  cookie: [
    { id: "classic", name: "Clássico", hint: "Biscoito dourado." },
    { id: "red", name: "Vermelho", hint: "Vinho e dourado." },
  ],
  weather: [
    { id: "sky", name: "Sky", hint: "Visual leve e colorido." },
    { id: "nature", name: "Nature", hint: "Paisagem dinâmica." },
    { id: "pixel", name: "Pixel Weather", hint: "Estilo retrô e divertido." },
    { id: "rain", name: "Chuva", hint: "Visual imersivo." },
    { id: "night", name: "Night", hint: "Estilo noturno automático." },
  ],
};
export const stylesOf = (product: string) => WIDGET_STYLES[product === "bible" || product === "motivation" ? "text" : product] ?? [];
/** Categorias de display na loja (cada estilo de cada categoria é vendido separadamente). O id do produto é "categoria:estilo". */
export const DISPLAY_CATS: { id: string; label: string; single: string }[] = [
  { id: "clock", label: "Relógios", single: "Relógio" },
  { id: "weather", label: "Clima", single: "Clima" },
  { id: "motivation", label: "Frases", single: "Frase" },
  { id: "bible", label: "Versículos", single: "Versículo" },
  { id: "calendar", label: "Calendários", single: "Calendário" },
  { id: "cookie", label: "Biscoito da sorte", single: "Biscoito" },
  { id: "date", label: "Calendário do dia", single: "Calendário do dia" },
  { id: "countdown", label: "Contador regressivo", single: "Contador regressivo" },
  { id: "daycount", label: "Contador de dias", single: "Contador de dias" },
  { id: "book", label: "Leitura de livro", single: "Leitura" },
  { id: "top3", label: "Top 3", single: "Top 3" },
  { id: "song", label: "Música favorita", single: "Música favorita" },
];
/** Displays desligados por enquanto: somem da loja, da escolha ao colocar e do mural (nada é apagado; ligar de novo é tirar da lista). O banco também recusa novos (`pin_cookie`). */
export const DISABLED_DISPLAYS: ReadonlySet<string> = new Set(["cookie"]);
export const isDisplayOn = (product: string) => !DISABLED_DISPLAYS.has(product);
export const splitDisplayId = (id: string) => {
  const [product, style = ""] = id.split(":");
  return { product, style };
};
/** "Relógio · Súnset" (o quadrado leva "(quadrado)") */
export const displayName = (id: string) => {
  const { product, style } = splitDisplayId(id);
  const cat = DISPLAY_CATS.find((x) => x.id === product);
  const st = stylesOf(product).find((x) => x.id === baseStyle(style));
  return `${cat?.single ?? product}${st ? ` · ${st.name}` : ""}${shapeOfStyle(style) === "square" ? " (quadrado)" : ""}`;
};
export const defaultStyle = (product: string) => stylesOf(product)[0]?.id ?? "";

/** Versículos: a promessa do dia vem da biblioteca local (a mesma para todos, troca à meia-noite de São Paulo, sem rede). */
function BibleCard({ data }: { data: DisplayData }) {
  const p = usePromessaDoDia();
  return <TextWidget style={data.style} text={p.promessa} reference={p.referencia} frame={data.frame} label="Versículo do dia" />;
}

/** Para compartilhar/ler fora do cartão: o versículo do dia no lugar do que o servidor guardou. */
export const withLiveText = (data: DisplayData): DisplayData => {
  if (data.product !== "bible") return data;
  const p = promessaDoDia();
  return { ...data, text: p.promessa, ref: p.referencia };
};

/** O widget certo para cada produto da loja (versículo, frase, relógio, clima), no estilo escolhido. */
export function DisplayCard({ data, preview = false }: { data: DisplayData; /** prévia (loja, formulário, escolha): o clima usa só a cidade escolhida, sem pedir a localização de quem vê */ preview?: boolean }) {
  switch (data.product) {
    case "bible":
      return <BibleCard data={data} />;
    case "motivation":
      return <TextWidget style={data.style} text={data.text} reference={data.ref} frame={data.frame} label="Frase do dia" />;
    case "clock":
      return <ClockWidget style={data.style} tz="local" frame={data.frame} />;
    case "calendar":
      return <CalendarWidget style={data.style} dates={data.dates} frame={data.frame} />;
    case "song":
      return <SongWidget style={data.style} track={data.track} title={data.title} artist={data.artist} cover={data.cover} frame={data.frame} />;
    case "top3":
      return <Top3Widget style={data.style} title={data.title} items={data.items} frame={data.frame} />;
    case "book":
      return <BookWidget style={data.style} title={data.title} cover={data.cover} pages={data.pages} read={data.read} view={data.view} frame={data.frame} />;
    case "daycount":
      return <DaysWidget style={data.style} title={data.title} since={data.since} frame={data.frame} />;
    case "countdown":
      return <CountdownWidget style={data.style} title={data.title} target={data.target} time={data.time} frame={data.frame} />;
    case "date":
      return <DateWidget style={data.style} frame={data.frame} />;
    case "cookie":
      return <CookieWidget style={data.style} frame={data.frame} />;
    default:
      return <WeatherWidget style={data.style} city={data.city} lat={data.lat} lon={data.lon} frame={data.frame} preview={preview} />;
  }
}

export { WIDGET_W } from "./core";
