"use client";

import { useLocale } from "next-intl";
import { LOCALE_TAGS, isLocale, type Locale } from "@/i18n/config";

/** Textos soltos dos displays (unidades, nomes padrão, clima, fusos, biscoito da sorte) por idioma. Datas e meses usam Intl com a etiqueta do idioma. */
type Dict = {
  day: string; days: string; hours: string; min: string; sec: string;
  dayToStart: string; daysToStart: string;
  arrived: string;
  weekInitials: string[];
  defQuestion: string;
  ago: (n: number) => string;
  pages: string;
  vote: string; votes: string;
  place: (i: number) => string;
  defEvent: string; defTogether: string; defYes: string; defNo: string; defText: string; defCity: string; defCountdownTitle: string;
  weather: { storm: string; snow: string; sleet: string; rainHeavy: string; rainLight: string; rain: string; fog: string; cloudy: string; partly: string; clearNight: string; clearDay: string; noData: string; loading: string; yourLocation: string };
  zones: Record<string, string>;
  fortunes: string[];
};

const PT: Dict = {
  weekInitials: ["D", "S", "T", "Q", "Q", "S", "S"], defQuestion: "Sua pergunta aqui?",
  day: "dia", days: "dias", hours: "horas", min: "min", sec: "seg", dayToStart: "dia para começar", daysToStart: "dias para começar",
  arrived: "Chegou o dia!", ago: (n) => `há ${n} ${n === 1 ? "dia" : "dias"}`, pages: "páginas", vote: "voto", votes: "votos", place: (i) => `${i}º lugar`,
  defEvent: "Seu evento", defTogether: "Nosso tempo", defYes: "Sim", defNo: "Não", defText: "O texto de hoje aparece aqui.", defCity: "Cidade", defCountdownTitle: "Título do contador",
  weather: { storm: "Trovoadas", snow: "Neve", sleet: "Chuva com neve", rainHeavy: "Chuva forte", rainLight: "Chuva fraca", rain: "Chuva", fog: "Neblina", cloudy: "Nublado", partly: "Parcialmente nublado", clearNight: "Limpo", clearDay: "Ensolarado", noData: "Sem dados agora", loading: "Buscando…", yourLocation: "Sua localização" },
  zones: { local: "Hora do aparelho (automática)", "America/Sao_Paulo": "Brasília", "America/Manaus": "Manaus", "America/Noronha": "Fernando de Noronha", "Europe/Lisbon": "Lisboa", "Europe/London": "Londres", "Europe/Paris": "Paris", "America/New_York": "Nova York", "America/Los_Angeles": "Los Angeles", "Asia/Dubai": "Dubai", "Asia/Tokyo": "Tóquio", "Australia/Sydney": "Sydney" },
  fortunes: [],
};

const EN: Dict = {
  weekInitials: ["S", "M", "T", "W", "T", "F", "S"], defQuestion: "Your question here?",
  day: "day", days: "days", hours: "hours", min: "min", sec: "sec", dayToStart: "day to start", daysToStart: "days to start",
  arrived: "The day is here!", ago: (n) => `${n} ${n === 1 ? "day" : "days"} ago`, pages: "pages", vote: "vote", votes: "votes", place: (i) => `${i}${i === 1 ? "st" : i === 2 ? "nd" : "rd"} place`,
  defEvent: "Your event", defTogether: "Our time", defYes: "Yes", defNo: "No", defText: "Today's text appears here.", defCity: "City", defCountdownTitle: "Counter title",
  weather: { storm: "Thunderstorms", snow: "Snow", sleet: "Sleet", rainHeavy: "Heavy rain", rainLight: "Light rain", rain: "Rain", fog: "Fog", cloudy: "Cloudy", partly: "Partly cloudy", clearNight: "Clear", clearDay: "Sunny", noData: "No data now", loading: "Loading…", yourLocation: "Your location" },
  zones: { local: "Device time (automatic)", "America/Sao_Paulo": "Brasília", "America/Manaus": "Manaus", "America/Noronha": "Fernando de Noronha", "Europe/Lisbon": "Lisbon", "Europe/London": "London", "Europe/Paris": "Paris", "America/New_York": "New York", "America/Los_Angeles": "Los Angeles", "Asia/Dubai": "Dubai", "Asia/Tokyo": "Tokyo", "Australia/Sydney": "Sydney" },
  fortunes: [
    "Good news is closer than you think.",
    "Whoever cares for today plants a beautiful tomorrow.",
    "The next step is smaller than it looks.",
    "Someone is thinking of you right now.",
    "Your patience will be rewarded soon.",
    "Today is a great day to start what you put off.",
    "Your smile changes someone's day.",
    "Luck likes those who don't give up.",
    "A simple conversation will open an important door.",
    "You are stronger than last week made you believe.",
    "Good things take time, and yours is on its way.",
    "Listen more, and you will hear the answer.",
    "An old friend will bring back a happy memory.",
    "What you planted with care is almost blooming.",
    "Trust your pace: nobody arrives before the right time.",
    "Small gestures today become great stories.",
    "A pleasant surprise awaits you before the week ends.",
    "Those who give thanks find more reasons to be thankful.",
    "Courage is not having no fear: it's moving on with it by your side.",
    "Your effort is being noticed, even in silence.",
    "The answer you seek lies in calm, not in haste.",
    "Make room in your schedule for what makes your heart laugh.",
    "Someone will thank you for something you've already forgotten.",
    "The best part of the trip is usually the road.",
    "Take the first step, the rest sorts itself out along the way.",
    "Today, choose to be kind: the day will repay you.",
    "An old plan is ready to leave the paper.",
    "Happiness lives in the details you already have.",
    "You will laugh a lot at something that seems hard today.",
    "The universe conspires in favor of those who do their part.",
  ],
};

const ES: Dict = {
  weekInitials: ["D", "L", "M", "X", "J", "V", "S"], defQuestion: "¿Tu pregunta aquí?",
  day: "día", days: "días", hours: "horas", min: "min", sec: "seg", dayToStart: "día para empezar", daysToStart: "días para empezar",
  arrived: "¡Llegó el día!", ago: (n) => `hace ${n} ${n === 1 ? "día" : "días"}`, pages: "páginas", vote: "voto", votes: "votos", place: (i) => `${i}.º lugar`,
  defEvent: "Tu evento", defTogether: "Nuestro tiempo", defYes: "Sí", defNo: "No", defText: "El texto de hoy aparece aquí.", defCity: "Ciudad", defCountdownTitle: "Título del contador",
  weather: { storm: "Tormentas", snow: "Nieve", sleet: "Aguanieve", rainHeavy: "Lluvia fuerte", rainLight: "Lluvia ligera", rain: "Lluvia", fog: "Niebla", cloudy: "Nublado", partly: "Parcialmente nublado", clearNight: "Despejado", clearDay: "Soleado", noData: "Sin datos ahora", loading: "Buscando…", yourLocation: "Tu ubicación" },
  zones: { local: "Hora del dispositivo (automática)", "America/Sao_Paulo": "Brasilia", "America/Manaus": "Manaos", "America/Noronha": "Fernando de Noronha", "Europe/Lisbon": "Lisboa", "Europe/London": "Londres", "Europe/Paris": "París", "America/New_York": "Nueva York", "America/Los_Angeles": "Los Ángeles", "Asia/Dubai": "Dubái", "Asia/Tokyo": "Tokio", "Australia/Sydney": "Sídney" },
  fortunes: [
    "Una buena noticia está más cerca de lo que imaginas.",
    "Quien cuida el hoy siembra un mañana hermoso.",
    "El próximo paso es más pequeño de lo que parece.",
    "Alguien está pensando en ti ahora mismo.",
    "Tu paciencia será recompensada pronto.",
    "Hoy es un gran día para empezar lo que pospusiste.",
    "Tu sonrisa cambia el día de alguien.",
    "La suerte quiere a quien no se rinde.",
    "Una conversación sencilla abrirá una puerta importante.",
    "Eres más fuerte de lo que la semana pasada te hizo creer.",
    "Las cosas buenas llevan tiempo, y la tuya viene en camino.",
    "Escucha más y oirás la respuesta.",
    "Un viejo amigo traerá un recuerdo feliz.",
    "Lo que plantaste con cariño está casi floreciendo.",
    "Confía en tu ritmo: nadie llega antes de la hora justa.",
    "Los pequeños gestos de hoy se vuelven grandes historias.",
    "Una grata sorpresa te espera antes de que acabe la semana.",
    "Quien agradece encuentra más motivos para agradecer.",
    "El coraje no es no tener miedo: es seguir con él al lado.",
    "Tu esfuerzo está siendo notado, incluso en silencio.",
    "La respuesta que buscas está en la calma, no en la prisa.",
    "Haz espacio en la agenda para lo que hace reír al corazón.",
    "Alguien te agradecerá algo que ya olvidaste.",
    "Lo mejor del viaje suele ser el camino.",
    "Da el primer paso, el resto se acomoda en el camino.",
    "Hoy elige ser amable: el día te lo devolverá.",
    "Un viejo plan está listo para salir del papel.",
    "La felicidad vive en los detalles que ya tienes.",
    "Te reirás mucho de algo que hoy parece difícil.",
    "El universo conspira a favor de quien hace su parte.",
  ],
};

const DICT: Partial<Record<Locale, Dict>> = { pt: PT, en: EN, es: ES };

export function useWT(): Dict & { loc: Locale; tag: string } {
  const l = useLocale();
  const loc: Locale = isLocale(l) ? l : "pt";
  return { ...(DICT[loc] ?? EN), loc, tag: LOCALE_TAGS[loc] };
}

/** Mesma coisa fora de um componente (ex.: a lista de fusos). */
export const wtFor = (loc: Locale) => ({ ...(DICT[loc] ?? EN), loc, tag: LOCALE_TAGS[loc] });
