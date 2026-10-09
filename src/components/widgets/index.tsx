"use client";

import { ClockWidget } from "./ClockWidget";
import { TextWidget } from "./TextWidget";
import { WeatherWidget } from "./WeatherWidget";

/** Dados de um widget da loja (guardados no banco; o texto do dia vem do servidor). */
export type DisplayData = { product: string; style?: string; frame?: string; tz?: string; city?: string; lat?: number; lon?: number; text?: string; ref?: string | null };

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
  weather: [
    { id: "sky", name: "Sky", hint: "Visual leve e colorido." },
    { id: "nature", name: "Nature", hint: "Paisagem dinâmica." },
    { id: "pixel", name: "Pixel Weather", hint: "Estilo retrô e divertido." },
    { id: "rain", name: "Chuva", hint: "Visual imersivo." },
    { id: "night", name: "Night", hint: "Estilo noturno automático." },
  ],
};
export const stylesOf = (product: string) => WIDGET_STYLES[product === "bible" || product === "motivation" ? "text" : product] ?? [];
export const defaultStyle = (product: string) => stylesOf(product)[0]?.id ?? "";

/** O widget certo para cada produto da loja (versículo, frase, relógio, clima), no estilo escolhido. */
export function DisplayCard({ data }: { data: DisplayData }) {
  switch (data.product) {
    case "bible":
      return <TextWidget style={data.style} text={data.text} reference={data.ref} frame={data.frame} label="Versículo do dia" />;
    case "motivation":
      return <TextWidget style={data.style} text={data.text} reference={data.ref} frame={data.frame} label="Frase do dia" />;
    case "clock":
      return <ClockWidget style={data.style} tz={data.tz} frame={data.frame} />;
    default:
      return <WeatherWidget style={data.style} city={data.city} lat={data.lat} lon={data.lon} frame={data.frame} />;
  }
}

export { WIDGET_W } from "./core";
