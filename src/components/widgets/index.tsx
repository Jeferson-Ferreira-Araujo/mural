"use client";

import { CalendarWidget, type CalDate } from "./CalendarWidget";
import { ClockWidget } from "./ClockWidget";
import { CookieWidget } from "./CookieWidget";
import { DateWidget } from "./DateWidget";
import { TextWidget } from "./TextWidget";
import { WeatherWidget } from "./WeatherWidget";
import { promessaDoDia, usePromessaDoDia } from "@/lib/promessas";

/** Dados de um widget da loja (guardados no banco; o texto do dia vem do servidor). */
export type DisplayData = { product: string; style?: string; frame?: string; tz?: string; city?: string; lat?: number; lon?: number; text?: string; ref?: string | null; /** calendário: datas importantes marcadas */ dates?: CalDate[] };

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
  calendar: [
    { id: "paper", name: "Parede", hint: "Calendário de papel." },
    { id: "modern", name: "Moderno", hint: "Escuro e limpo." },
  ],
  date: [
    { id: "page", name: "Folha", hint: "Folha de calendário com a data de hoje." },
    { id: "night", name: "Noite", hint: "Escuro e limpo." },
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
];
/** Displays desligados por enquanto: somem da loja, da escolha ao colocar e do mural (nada é apagado; ligar de novo é tirar da lista). O banco também recusa novos (`pin_cookie`). */
export const DISABLED_DISPLAYS: ReadonlySet<string> = new Set(["cookie"]);
export const isDisplayOn = (product: string) => !DISABLED_DISPLAYS.has(product);
export const splitDisplayId = (id: string) => {
  const [product, style = ""] = id.split(":");
  return { product, style };
};
/** "Relógio · Súnset" */
export const displayName = (id: string) => {
  const { product, style } = splitDisplayId(id);
  const cat = DISPLAY_CATS.find((x) => x.id === product);
  const st = stylesOf(product).find((x) => x.id === style);
  return `${cat?.single ?? product}${st ? ` · ${st.name}` : ""}`;
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
export function DisplayCard({ data }: { data: DisplayData }) {
  switch (data.product) {
    case "bible":
      return <BibleCard data={data} />;
    case "motivation":
      return <TextWidget style={data.style} text={data.text} reference={data.ref} frame={data.frame} label="Frase do dia" />;
    case "clock":
      return <ClockWidget style={data.style} tz="local" frame={data.frame} />;
    case "calendar":
      return <CalendarWidget style={data.style} dates={data.dates} frame={data.frame} />;
    case "date":
      return <DateWidget style={data.style} frame={data.frame} />;
    case "cookie":
      return <CookieWidget style={data.style} frame={data.frame} />;
    default:
      return <WeatherWidget style={data.style} city={data.city} lat={data.lat} lon={data.lon} frame={data.frame} />;
  }
}

export { WIDGET_W } from "./core";
