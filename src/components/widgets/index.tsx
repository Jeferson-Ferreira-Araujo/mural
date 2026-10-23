"use client";

import { CalendarWidget, type CalDate } from "./CalendarWidget";
import { ClockWidget } from "./ClockWidget";
import { BookWidget } from "./BookWidget";
import { HabitWidget } from "./HabitWidget";
import { MoodWidget } from "./MoodWidget";
import { CookieWidget } from "./CookieWidget";
import { CountdownWidget } from "./CountdownWidget";
import { DateWidget } from "./DateWidget";
import { DaysWidget } from "./DaysWidget";
import { TextWidget } from "./TextWidget";
import { WeatherWidget } from "./WeatherWidget";
import { PollWidget } from "./PollWidget";
import { SHARED_SKIN_INFO } from "./skins";
import { Top3Widget } from "./Top3Widget";
import { baseStyle, shapeOfStyle } from "@/lib/displayShape";
import { promessaDoDia, usePromessaDoDia } from "@/lib/promessas";
import { useTranslations } from "next-intl";
import { fraseDoDia, useFraseDoDia } from "@/lib/frasesDia";

/** Dados de um widget da loja (guardados no banco; o texto do dia vem do servidor). */
export type DisplayData = { product: string; style?: string; frame?: string; tz?: string; city?: string; lat?: number; lon?: number; text?: string; ref?: string | null; /** contador regressivo: nome, data e hora */ title?: string; target?: string; time?: string; /** contador de dias: desde quando */ since?: string; /** leitura de livro */ cover?: string; pages?: number; read?: number; view?: string; /** top 3 */ items?: string[]; /** enquete */ options?: string[]; /** hábito e humor */ emoji?: string; days?: string[]; note?: string; day?: string; id?: string; /** calendário: datas importantes marcadas */ dates?: CalDate[] };

/** Os estilos de cada pin da loja (o primeiro é o padrão). */
export const WIDGET_STYLES: Record<string, { id: string; name: string; hint: string }[]> = {
  text: [
    { id: "classic", name: "Clássico", hint: "Visual clean e elegante." },
    { id: "night", name: "Noturno", hint: "Estilo moderno e inspirador." },
    { id: "floral", name: "Floral", hint: "Leve e positivo." },
    { id: "natural", name: "Natural", hint: "Aconchegante e especial." },
  ],
  clock: [
    { id: "sunset", name: "Relógio dinâmico", hint: "O fundo muda com a hora: sol de manhã, entardecer à tarde e noite." },
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
  // hábito e humor: só o fundo muda (branco ou preto); o hábito é só quadrado, o humor também tem o retangular
  habit: [
    { id: "light", name: "Branco", hint: "Fundo branco, limpo." },
    { id: "dark", name: "Preto", hint: "Fundo preto, sóbrio." },
  ],
  mood: [
    { id: "light", name: "Branco", hint: "Fundo branco, limpo." },
    { id: "dark", name: "Preto", hint: "Fundo preto, sóbrio." },
  ],
  top3: [
    { id: "podium", name: "Pódio", hint: "Papel claro, medalhas." },
    { id: "night", name: "Noite", hint: "Escuro e limpo." },
    { id: "neon", name: "Neon", hint: "Roxo e rosa luminosos." },
  ],
  poll: [
    { id: "paper", name: "Papel", hint: "Claro e leve." },
    { id: "night", name: "Noite", hint: "Escuro e limpo." },
    { id: "pop", name: "Colorido", hint: "Rosa, laranja e roxo." },
  ],
  cookie: [
    { id: "classic", name: "Clássico", hint: "Biscoito dourado." },
    { id: "red", name: "Vermelho", hint: "Vinho e dourado." },
  ],
  weather: [
    { id: "nature", name: "Natural", hint: "Paisagem que muda com o tempo." },
    { id: "pixel", name: "Pixel Art", hint: "Estilo retrô e divertido." },
    { id: "tech", name: "Tecnológico", hint: "Painel escuro com brilho neon." },
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
  { id: "poll", label: "Enquete", single: "Enquete" },
  { id: "habit", label: "Meta de hábito", single: "Hábito" },
  { id: "mood", label: "Humor do dia", single: "Humor" },
];
/** Displays desligados por enquanto: somem da loja, da escolha ao colocar e do mural (nada é apagado; ligar de novo é tirar da lista). O banco também recusa novos (`pin_cookie`). */
export const DISABLED_DISPLAYS: ReadonlySet<string> = new Set(["cookie"]);
export const isDisplayOn = (product: string) => !DISABLED_DISPLAYS.has(product);
/**
 * Todo display é vendido em pacote: um preço só libera todos os estilos, e a pessoa escolhe o estilo ao colocar no mural.
 * PARA UM DISPLAY NOVO: (1) acrescente a categoria em DISPLAY_CATS e os estilos em WIDGET_STYLES; (2) no banco, crie as linhas "categoria:estilo" em pin_products
 * e UMA linha "categoria:pack" com o preço do pacote (0 = grátis); (3) escreva o resumo em DISPLAY_SUMMARY e traduza-o (scripts/lit-add.cjs).
 * Sem a linha ":pack" a loja mostra os estilos soltos, como antes.
 */
export const UNBUNDLED_DISPLAYS: ReadonlySet<string> = new Set();
/** Resumo de como cada display funciona (mostrado no pacote da loja). */
export const DISPLAY_SUMMARY: Record<string, string> = {
  bible: "Mostra uma promessa bíblica diferente a cada dia, trocada à meia-noite. Você só escolhe o visual.",
  motivation: "Mostra uma frase motivacional diferente a cada dia, trocada à meia-noite. Você só escolhe o visual.",
  clock: "Mostra a hora do aparelho de quem vê o mural, sempre certa. Você escolhe o visual: dinâmico, flip, minimal, analógico ou pixel.",
  weather: "Mostra a temperatura e o tempo de agora na cidade que você escolher, com atualização automática.",
  calendar: "Mostra o mês atual com o dia de hoje em destaque e as datas importantes que você marcar.",
  date: "Mostra a data de hoje em uma folha de calendário que muda sozinha a cada dia.",
  countdown: "Conta os dias, horas e minutos que faltam para um evento. Você escolhe o nome, a data e a hora.",
  daycount: "Conta há quantos dias algo começou, como um namoro ou um hábito. Você escolhe o nome e a data de início.",
  book: "Mostra a capa do livro que você está lendo e o seu progresso: páginas lidas, barra ou os dois. Você atualiza quando quiser.",
  top3: "Mostra o seu top 3 sobre qualquer tema, como comidas, filmes ou músicas.",
  poll: "Faz uma pergunta com duas respostas. Quem visita o mural vota e todos veem o resultado na hora.",
  habit: "Mostra quantos dias seguidos você cumpriu um hábito, com os últimos 7 dias marcados. Você toca em “Marcar hoje” todo dia para manter a sequência.",
  mood: "Mostra um emoji e uma frase curta com o seu humor. Quando quiser mudar, é só atualizar: ele fica como está até lá.",
};
export const isBundled = (product: string) => !UNBUNDLED_DISPLAYS.has(product);
export const PACK_SUFFIX = ":pack";
export const isPackId = (id: string) => id.endsWith(PACK_SUFFIX);
export const splitDisplayId = (id: string) => {
  const [product, style = ""] = id.split(":");
  return { product, style };
};
/** "Relógio · Relógio dinâmico" (o quadrado leva "(quadrado)") */
export const displayName = (id: string, tl: (s: string) => string = (s) => s) => {
  const { product, style } = splitDisplayId(id);
  const cat = DISPLAY_CATS.find((x) => x.id === product);
  const st = stylesOf(product).find((x) => x.id === baseStyle(style));
  return `${tl(cat?.single ?? product)}${st ? ` · ${tl(st.name)}` : ""}${shapeOfStyle(style) === "square" ? ` (${tl("quadrado")})` : ""}`;
};
export const defaultStyle = (product: string) => stylesOf(product)[0]?.id ?? "";

/** Versículos: a promessa do dia vem da biblioteca local (a mesma para todos, troca à meia-noite de São Paulo, sem rede). */
function BibleCard({ data }: { data: DisplayData }) {
  const tx = useTranslations("components.widgets.index");
  const p = usePromessaDoDia();
  return <TextWidget style={data.style} text={p.promessa} reference={p.referencia} frame={data.frame} label={tx("versiculoDoDia")} />;
}

/** Frases: 365 frases motivacionais por idioma, uma por dia (biblioteca local, troca à meia-noite de São Paulo, sem rede). */
function MotivationCard({ data }: { data: DisplayData }) {
  const tx = useTranslations("components.widgets.index");
  const f = useFraseDoDia();
  return <TextWidget style={data.style} text={f} reference={null} frame={data.frame} label={tx("fraseDoDia")} />;
}

/** Para compartilhar/ler fora do cartão: o versículo do dia no lugar do que o servidor guardou. */
export const withLiveText = (data: DisplayData, locale = "pt"): DisplayData => {
  if (data.product === "motivation") return { ...data, text: fraseDoDia(new Date(), locale), ref: null };
  if (data.product !== "bible") return data;
  const p = promessaDoDia(new Date(), locale);
  return { ...data, text: p.promessa, ref: p.referencia };
};

/** O widget certo para cada produto da loja (versículo, frase, relógio, clima), no estilo escolhido. */
export function DisplayCard({ data, preview = false, badgeId }: { data: DisplayData; /** id do display no mural (a enquete usa para contar os votos; sem ele mostra um exemplo) */ badgeId?: string; /** prévia (loja, formulário, escolha): o clima usa só a cidade escolhida, sem pedir a localização de quem vê */ preview?: boolean }) {
  const tx = useTranslations("components.widgets.index");
  switch (data.product) {
    case "bible":
      return <BibleCard data={data} />;
    case "motivation":
      return <MotivationCard data={data} />;
    case "clock":
      return <ClockWidget style={data.style} tz="local" frame={data.frame} />;
    case "calendar":
      return <CalendarWidget style={data.style} dates={data.dates} frame={data.frame} />;
    case "poll":
      return <PollWidget style={data.style} title={data.title} options={data.options} badgeId={preview ? undefined : (badgeId ?? data.id)} frame={data.frame} />;
    case "top3":
      return <Top3Widget style={data.style} title={data.title} items={data.items} frame={data.frame} />;
    case "book":
      return <BookWidget style={data.style} title={data.title} cover={data.cover} pages={data.pages} read={data.read} view={data.view} frame={data.frame} />;
    case "habit":
      return <HabitWidget style={data.style} title={data.title} note={data.note} days={data.days} badgeId={preview ? undefined : (badgeId ?? data.id)} frame={data.frame} />;
    case "mood":
      return <MoodWidget style={data.style} emoji={data.emoji} note={data.note} frame={data.frame} />;
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
