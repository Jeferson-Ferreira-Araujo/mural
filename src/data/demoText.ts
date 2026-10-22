import type { BoardItem, Message } from "@/lib/types";
import { LOCALES, isLocale, type Locale } from "@/i18n/config";
import { PACKS, type Over, type SampleText } from "./demoPacks";

/** Textos do mural de exemplo (e das amostras de displays) em cada idioma. O português é o que está em `mock.ts` / `StoreModal.tsx`; aqui ficam as outras línguas. */
export type DemoLocale = Locale;
/** O idioma do mural de exemplo para um idioma do site: todos os idiomas do site têm texto próprio (pt, en e es aqui; os outros em demo/<idioma>.json). */
export const demoLocaleOf = (l: string): DemoLocale => (isLocale(l) ? l : "en");

const EN: Record<string, Over> = {
  m1: { text: "You've always been one of the most amazing people I've ever met. ❤️" },
  m2: { text: "Thank you for always believing in me, even when I didn't. You make a difference! ☺" },
  m3: { title: "Always:", items: ["Good company", "Endless talks", "Crazy ideas", "Support in hard times", "Someone who's there"] },
  m4: { caption: "Partner for life! 🐾" },
  m5: { text: "♡ You have a huge heart and it makes the world lighter. Never change!" },
  m7: { caption: "That day was unforgettable!" },
  m8: { text: "I remember so many great hangouts… what a privilege to have lived that with you." },
  m9: { text: "You inspire me to be a better version of myself. Thanks for always being around! ♡" },
  m10: { caption: "Here's to many more moments like this!" },
  m11: { title: "Things to do together:", items: ["Sunday barbecue", "See the school crew again", "That trip", "Play ball again"] },
  m12: { text: "Thanks for everything, buddy. Count on me always!" },
  m13: { caption: "Your voice always makes me smile! ♡" },
  m14: { name: "Christ the Redeemer", caption: "One of the places I love the most!" },
  cap1: { text: "If you're reading this, the time has passed. Thank you for everything, from the heart. Keeping this message was a good idea." },
  x1: { text: "Your hug is the best place in the world. Come back soon! 🤗" },
  x2: { text: "So much time has passed and I still remember our laughter. I miss you, you know?" },
  x3: { caption: "That sunset was worth the trip 🌅" },
  x4: { text: "If you need someone, I'm here. Always." },
  x5: { title: "Thanks for:", items: ["Every piece of advice", "The rides", "The breakfast"] },
  x6: { text: "Noted here: you're the funniest person I know. Never lose that." },
  x7: { text: "Happy birthday! You deserve all the best 🎂" },
  x9: { text: "Missing our unhurried afternoons." },
  x10: { caption: "Listen to the end, there's a surprise!" },
  x11: { caption: "Look how young we were!" },
  x12: { name: "Sugarloaf Mountain", caption: "Shall we go back one day?" },
  x13: { text: "You make any Monday better. 💙" },
};

const ES: Record<string, Over> = {
  m1: { text: "Siempre fuiste una de las personas más increíbles que conocí. ❤️" },
  m2: { text: "Gracias por creer siempre en mí, incluso cuando yo no creía. ¡Haces la diferencia! ☺" },
  m3: { title: "Siempre:", items: ["Buena compañía", "Conversaciones sin fin", "Ideas locas", "Apoyo en los momentos difíciles", "Alguien presente"] },
  m4: { caption: "¡Compañero de siempre! 🐾" },
  m5: { text: "♡ Tienes un corazón enorme y eso hace el mundo más ligero. ¡Nunca cambies!" },
  m7: { caption: "¡Ese día fue inolvidable!" },
  m8: { text: "Recuerdo tantas buenas charlas… qué privilegio haberlo vivido contigo." },
  m9: { text: "Me inspiras a ser una mejor versión de mí. ¡Gracias por estar siempre cerca! ♡" },
  m10: { caption: "¡Que vengan más momentos así!" },
  m11: { title: "Para hacer juntos:", items: ["Asado del domingo", "Ver de nuevo a los de la escuela", "Aquel viaje", "Jugar a la pelota otra vez"] },
  m12: { text: "Gracias por todo, compañero. ¡Cuenta conmigo siempre!" },
  m13: { caption: "¡Tu voz siempre me hace sonreír! ♡" },
  m14: { name: "Cristo Redentor", caption: "¡Uno de los lugares que más amo!" },
  cap1: { text: "Si estás leyendo esto, ya pasó el tiempo. Gracias por todo, de corazón. Fue buena idea guardar este mensaje." },
  x1: { text: "Tu abrazo es el mejor lugar del mundo. ¡Vuelve pronto! 🤗" },
  x2: { text: "Pasó tanto tiempo y todavía recuerdo nuestra risa. ¡Cómo te extraño!" },
  x3: { caption: "Ese atardecer valió el viaje 🌅" },
  x4: { text: "Si necesitas a alguien, aquí estoy. Siempre." },
  x5: { title: "Gracias por:", items: ["Cada consejo", "Los aventones", "El desayuno"] },
  x6: { text: "Anoté aquí: eres la persona más graciosa que conozco. Nunca lo pierdas." },
  x7: { text: "¡Feliz cumpleaños! Te mereces lo mejor 🎂" },
  x9: { text: "Extraño nuestras tardes sin prisa." },
  x10: { caption: "¡Escucha hasta el final, hay sorpresa!" },
  x11: { caption: "¡Mira qué jóvenes éramos!" },
  x12: { name: "Pan de Azúcar", caption: "¿Volvemos allí algún día?" },
  x13: { text: "Haces que cualquier lunes sea mejor. 💙" },
};

const overridesOf = (l: DemoLocale): Record<string, Over> => (l === "pt" ? {} : l === "en" ? EN : l === "es" ? ES : PACKS[l]?.demo ?? EN);

/** Troca os textos de um cartão de exemplo pelos do idioma (o id pode ter o sufixo "-b" dos cartões repetidos). */
export function localizeDemo<T extends BoardItem | Message>(it: T, locale: DemoLocale): T {
  const o = overridesOf(locale)[it.id.replace(/-b$/, "")];
  if (!o) return it;
  const r = { ...it } as Record<string, unknown>;
  if (o.text !== undefined && "text" in r) r.text = o.text;
  if (o.caption !== undefined && "caption" in r) r.caption = o.caption;
  if (o.title !== undefined && "title" in r) r.title = o.title;
  if (o.name !== undefined && "name" in r) r.name = o.name;
  if (o.items && Array.isArray(r.items)) r.items = (r.items as { text: string; done: boolean }[]).map((x, i) => ({ ...x, text: o.items![i] ?? x.text }));
  return r as T;
}

/** Textos das amostras de displays (mural de exemplo e vitrine da loja). */
const BASE_SAMPLE: Record<"pt" | "en" | "es", SampleText> = {
  pt: { bibleText: "Tudo posso naquele que me fortalece.", bibleRef: "Filipenses 4:13", motivation: "Disciplina de hoje é o resultado de amanhã.", birthday: "Aniversário", trip: "Viagem", poll: "Você gosta de pizza com abacaxi?", yes: "Sim", no: "Não", top3: "Comidas favoritas", food: ["Lasanha", "Pizza", "Sorvete"], book: "O Pequeno Príncipe", together: "Juntos há", counter: "Título do contador" },
  en: { bibleText: "I can do all things through him who strengthens me.", bibleRef: "Philippians 4:13", motivation: "Today's discipline is tomorrow's result.", birthday: "Birthday", trip: "Trip", poll: "Do you like pineapple on pizza?", yes: "Yes", no: "No", top3: "Favorite foods", food: ["Lasagna", "Pizza", "Ice cream"], book: "The Little Prince", together: "Together for", counter: "Counter title" },
  es: { bibleText: "Todo lo puedo en Cristo que me fortalece.", bibleRef: "Filipenses 4:13", motivation: "La disciplina de hoy es el resultado de mañana.", birthday: "Cumpleaños", trip: "Viaje", poll: "¿Te gusta la piña en la pizza?", yes: "Sí", no: "No", top3: "Comidas favoritas", food: ["Lasaña", "Pizza", "Helado"], book: "El Principito", together: "Juntos desde hace", counter: "Título del contador" },
};

export const SAMPLE_TEXT = Object.fromEntries(LOCALES.map((l) => [l, l === "pt" || l === "en" || l === "es" ? BASE_SAMPLE[l] : PACKS[l]?.sample ?? BASE_SAMPLE.en])) as Record<DemoLocale, SampleText>;
