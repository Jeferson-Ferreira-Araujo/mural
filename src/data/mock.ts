import { BOARD_CAPACITY, canUseCapsule, formatsFor, type PlanId } from "@/lib/plans";
import { isHidden, isMessage, isSealed, type BoardItem, type HiddenItem, type Message } from "@/lib/types";
import { localizeDemo, type DemoLocale } from "./demoText";

/**
 * Dados MOCKADOS — apenas para demonstração do frontend (sem banco, sem envio real).
 * A ordem do pool é a ordem dos espaços no mural: os 5 primeiros só usam formatos FREE,
 * então um PINZ FREE (15 espaços) e um PINZ+ (28 espaços) ficam coerentes.
 */

/** Pins em segredo dos murais de exemplo: só o tipo e o estilo (o conteúdo nunca existe), como o servidor entrega a quem visita. */
const SECRETS: HiddenItem[] = [
  { id: "s1", hidden: true, type: "postit", color: "pink", pin: "red" },
  { id: "s2", hidden: true, type: "photo", media: true, ratio: 1.25, tape: "yellow" },
  { id: "s3", hidden: true, type: "text", variant: "notebook", tape: "yellow" },
];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Conteúdo guardado "no servidor" de uma cápsula de exemplo (nunca vai para o quadro antes da hora). */
const SEED_VAULT: Record<string, Message> = {
  cap1: {
    id: "cap1",
    type: "text",
    variant: "letter",
    fromCapsule: true,
    text: "Se você está lendo isso, já passou o tempo. Obrigado por tudo, de coração. Foi uma ideia boa guardar esse recado.",
  },
};

export function buildPool(nowMs: number, locale: DemoLocale = "pt"): { items: BoardItem[]; vault: Record<string, Message> } {
  const items: BoardItem[] = [
    { id: "m1", type: "postit", color: "yellow", text: "Você sempre foi uma das pessoas mais incríveis que conheci. ❤️" },
    {
      id: "m2",
      type: "text",
      variant: "letter",
      text: "Obrigado por sempre acreditar em mim, mesmo quando eu não acreditava. Você faz diferença! ☺",
    },
    {
      id: "m3",
      type: "list",
      title: "Sempre:",
      items: [
        { text: "Boa companhia", done: true },
        { text: "Conversas sem fim", done: true },
        { text: "Ideias malucas", done: true },
        { text: "Apoio nos momentos difíceis", done: true },
        { text: "Alguém presente", done: true },
      ],
    },
    { id: "m4", type: "photo", scene: "hills", caption: "Parceiro de sempre! 🐾" },
    { id: "m5", type: "postit", color: "pink", text: "♡ Você tem um coração gigante e isso faz o mundo ser mais leve. Nunca mude!" },
    // --- a partir daqui, formatos PINZ+ ---
    { id: "m7", type: "video", caption: "Esse dia foi inesquecível!", duration: "0:24" },
    // --- de volta aos formatos FREE ---
    { id: "m8", type: "text", variant: "notebook", text: "Lembro de tantas resenhas boas… que privilégio ter vivido isso com você." },
    { id: "m9", type: "postit", color: "blue", text: "Você me inspira a ser uma versão melhor de mim. Valeu por sempre estar por perto! ♡" },
    { id: "m10", type: "photo", scene: "group", caption: "Que venham mais momentos assim!" },
    {
      id: "m11",
      type: "list",
      title: "Pra gente fazer:",
      items: [
        { text: "Churrasco de domingo", done: false },
        { text: "Rever o pessoal da escola", done: false },
        { text: "Aquela viagem", done: false },
        { text: "Jogar bola de novo", done: false },
      ],
    },
    { id: "m12", type: "postit", color: "green", text: "Valeu por tudo, parceiro. Conta comigo sempre!" },
    { id: "m13", type: "voice", caption: "Sua voz sempre me faz sorrir! ♡", duration: "0:27" },
    { id: "m14", type: "place", name: "Cristo Redentor", address: "Rio de Janeiro - RJ", lat: -22.951916, lon: -43.210487, caption: "Um dos lugares que mais amo!" },
    ...SECRETS,
  ];
  return { items: items.map((i) => localizeDemo(i, locale)), vault: Object.fromEntries(Object.entries(SEED_VAULT).map(([k, v]) => [k, localizeDemo(v, locale)])) };
}


/** Mais exemplos, todos diferentes dos de cima: a página inicial mostra o quadro cheio sem nenhum pin repetido. */
function extraPool(locale: DemoLocale = "pt"): BoardItem[] {
  return [
    { id: "x1", type: "postit", color: "orange", text: "Seu abraço é o melhor lugar do mundo. Volta logo! 🤗" },
    { id: "x2", type: "text", variant: "letter", text: "Passou tanto tempo e eu ainda lembro da nossa risada. Que saudade de você, viu?" },
    { id: "x3", type: "photo", scene: "sunset", caption: "Aquele pôr do sol valeu a viagem 🌅" },
    { id: "x4", type: "postit", color: "yellow", text: "Se precisar de alguém, eu estou aqui. Sempre." },
    { id: "x5", type: "list", title: "Obrigado por:", items: [{ text: "Cada conselho", done: true }, { text: "As caronas", done: true }, { text: "O café da manhã", done: true }] },
    { id: "x6", type: "text", variant: "notebook", text: "Anotei aqui: você é a pessoa mais engraçada que eu conheço. Nunca perca isso." },
    { id: "x7", type: "postit", color: "pink", text: "Parabéns pelo seu dia! Você merece tudo de bom 🎂" },
    { id: "x9", type: "postit", color: "green", text: "Saudade das nossas tardes sem pressa." },
    { id: "x10", type: "voice", caption: "Ouve até o final, tem surpresa!", duration: "0:41" },
    { id: "x11", type: "video", caption: "Olha como a gente era novo!", duration: "0:18" },
    { id: "x12", type: "place", name: "Pão de Açúcar", address: "Rio de Janeiro - RJ", lat: -22.948, lon: -43.1566, caption: "Vamos voltar lá um dia?" },
    { id: "x13", type: "postit", color: "blue", text: "Você faz qualquer segunda-feira ficar melhor. 💙" },
  ].map((i) => localizeDemo(i as BoardItem, locale));
}


/** Os primeiros `count` itens do pool que o plano permite (formatos e cápsula). */
export function itemsFor(plan: PlanId, count: number, nowMs: number, capacity = BOARD_CAPACITY, locale: DemoLocale = "pt"): { items: BoardItem[]; vault: Record<string, Message> } {
  const { items: base, vault } = buildPool(nowMs, locale);
  let items = base;
  if (capacity > base.length) {
    // quadro de teste com mais espaços: repete os cartões de exemplo, em outra ordem, com ids novos
    const extra = base.map((_, i) => base[(i + 7) % base.length]).map((it) => ({ ...it, id: `${it.id}-b` }) as BoardItem);
    for (const it of extra) if (isSealed(it) && vault[it.id.replace(/-b$/, "")]) vault[it.id] = { ...vault[it.id.replace(/-b$/, "")], id: it.id };
    items = [...base, ...extra].slice(0, capacity);
  }
  const allowed = items.filter((i) => (isSealed(i) ? canUseCapsule(plan) : isHidden(i) || (isMessage(i) && formatsFor(plan).includes(i.type))));
  // cada exemplo já nasce no seu espaço, para colar um novo em outro lugar não empurrar os demais
  return { items: allowed.slice(0, count).map((it, i) => ({ ...it, slot: i }) as BoardItem), vault };
}

/** Mural de exemplo aleatório (todos os espaços, em ordem embaralhada) para a página inicial: sem espaços vazios. */
export function randomMural(nowMs: number, locale: DemoLocale = "pt"): BoardItem[] {
  // 28 espaços = os 15 exemplos + 13 extras, todos diferentes (nada de cartão repetido na tela)
  const pool = buildPool(nowMs, locale).items.filter((i) => !isHidden(i));
  const items = [...pool, ...extraPool(locale)].slice(0, BOARD_CAPACITY - SECRETS.length);
  items.push(...SECRETS); // o embaralhamento abaixo espalha os segredos pelo mural
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Troca só os textos dos cartões de exemplo que já estão na tela pelo idioma novo (posição, assinatura e marcações da lista continuam). */
export function relocalize(items: BoardItem[], locale: DemoLocale): BoardItem[] {
  const pool = new Map<string, BoardItem>([...buildPool(0, locale).items, ...extraPool(locale)].map((i) => [i.id, i]));
  return items.map((it) => {
    const src = pool.get(it.id.replace(/-b$/, "")) as Record<string, unknown> | undefined;
    if (!src) return it;
    const r = { ...it } as Record<string, unknown>;
    for (const k of ["text", "caption", "title", "name"]) if (k in src && k in r) r[k] = src[k];
    if (Array.isArray(src.items) && Array.isArray(r.items)) r.items = (r.items as { text: string; done: boolean }[]).map((x, i) => ({ ...x, text: (src.items as { text: string }[])[i]?.text ?? x.text }));
    return r as BoardItem;
  });
}
