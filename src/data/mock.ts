import type { Message } from "@/lib/types";

/**
 * Dados MOCKADOS — apenas para avaliar o frontend (Etapa 1).
 * `pos` é a posição da mensagem no mural (desktop), em % da área de cortiça.
 */
export const messages: Message[] = [
  {
    id: "m1",
    type: "postit",
    color: "yellow",
    text: "Nunca vou esquecer a vez que a gente matou aula pra ir no rio!",
    pos: { x: 29, y: 4, rot: -4, z: 3 },
  },
  {
    id: "m2",
    type: "text",
    text: "Jef,\n\nlembrei de você hoje ouvindo aquela música do fundão da sala. Tempo bom, hein? Obrigado por sempre ter sido o cara que defendia todo mundo.\n\nUm abraço enorme!",
    pos: { x: 47, y: 2, rot: 2, z: 2 },
  },
  {
    id: "m3",
    type: "photo",
    caption: "Churrasco de 2019",
    pos: { x: 72, y: 5, rot: 5, z: 4 },
  },
  {
    id: "m4",
    type: "postit",
    color: "pink",
    text: "Você era o único que sabia o refrão inteiro. Todo. Mundo. Ria.",
    pos: { x: 3, y: 34, rot: 3, z: 5 },
  },
  {
    id: "m5",
    type: "video",
    caption: "Olha isso aqui 😂",
    duration: "0:24",
    pos: { x: 21, y: 32, rot: -2, z: 4 },
  },
  {
    id: "m6",
    type: "postit",
    color: "green",
    text: "Valeu por tudo, parceiro. Conta comigo sempre!",
    pos: { x: 43, y: 46, rot: -6, z: 6 },
  },
  {
    id: "m7",
    type: "music",
    title: "Trem-Bala",
    artist: "Ana Vilela",
    pos: { x: 62, y: 37, rot: 4, z: 5 },
  },
  {
    id: "m8",
    type: "audio",
    caption: "Recado de voz",
    duration: "0:38",
    pos: { x: 4, y: 66, rot: -3, z: 3 },
  },
  {
    id: "m9",
    type: "text",
    text: "Lista do que eu quero rever:\n• o campinho\n• o pastel da cantina\n• você, claro",
    compact: true,
    pos: { x: 27, y: 66, rot: 3, z: 2 },
  },
  {
    id: "m10",
    type: "postit",
    color: "orange",
    text: "Saudade da sua risada!",
    pos: { x: 50, y: 68, rot: -3, z: 4 },
  },
];

export const boardInfo = {
  owner: "Jeferson",
  tagline: "Mensagens de pessoas que me conhecem.",
  question: "Qual era meu apelido na escola?",
  // Etapa 1: validação apenas simulada no frontend. Qualquer resposta desbloqueia.
};
