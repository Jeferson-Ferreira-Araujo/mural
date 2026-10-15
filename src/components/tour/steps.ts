export type TourStep = {
  id: string;
  /** seletor do elemento a destacar (data-tour). Sem seletor, o cartão fica no meio da tela. */
  sel?: string;
  title: string;
  text: string;
  /** lista curta de itens (vira etiquetas) */
  chips?: string[];
  /**
   * Passo interativo: a pessoa faz a ação de verdade no elemento destacado e o tour segue sozinho.
   * "click" = toca no elemento; "input" = digita no campo.
   */
  act?: "click" | "input";
  /** passo com escolha: o tour NÃO segue sozinho; depois de fazer a tarefa a pessoa toca em Próximo quando terminar de escolher */
  manual?: boolean;
  /** passo manual cujo Próximo já vale desde o começo (já existe uma opção escolhida por padrão, como a cor amarela) */
  readyAtStart?: boolean;
  /** a ação abre/fecha uma janela (Loja, envio do pin…): o tour espera a pessoa fechá-la para continuar */
  pause?: boolean;
  /** o elemento aparece depois (dentro de uma janela que o passo anterior abre): o tour espera ele surgir em vez de pular o passo */
  flow?: boolean;
  /** dica curta ao lado do ícone de mão, em passos interativos */
  hint?: string;
};

/**
 * Tour de quem acabou de entrar: guia a pessoa a colar o primeiro pin (um post-it) no próprio mural, passo a passo, com ela fazendo cada toque.
 * Depois explica que o mesmo vale para o mural dos outros e mostra a Loja.
 */
export const TOUR_STEPS: TourStep[] = [
  { id: "intro", title: "Vamos colocar o seu primeiro pin", text: "Eu vou te mostrar onde tocar. Em poucos passos o seu primeiro recado estará no mural." },
  { id: "add", sel: '[data-tour="add"]', act: "click", title: "Toque no botão +", text: "É por aqui que se coloca um pin no mural.", hint: "Toque no botão +" },
  { id: "fmt", sel: '[data-tour="fmt-postit"]', act: "click", flow: true, title: "Escolha o Post-it", text: "Aqui ficam os tipos de pin. Vamos começar pelo mais simples: um post-it.", hint: "Toque em Post-it" },
  { id: "text", sel: '[data-tour="postit-text"]', act: "input", manual: true, flow: true, title: "Escreva o seu recado", text: "Digite uma frase curtinha. Ela aparece na prévia ao lado. Quando terminar, toque em Próximo.", hint: "Digite o recado" },
  { id: "color", sel: '[data-tour="postit-color"]', act: "click", manual: true, readyAtStart: true, flow: true, title: "Escolha a cor", text: "Toque na cor do post-it que você mais gostar. Pode testar várias; quando decidir, toque em Próximo.", hint: "Toque numa cor" },
  { id: "send", sel: '[data-tour="compose-send"]', act: "click", pause: true, flow: true, title: "Cole no mural", text: "Toque em Colar no mural para aplicar o seu pin.", hint: "Toque em Colar no mural" },
  { id: "done", title: "Pronto, o seu primeiro pin!", text: "Você pode fazer o mesmo no mural de outras pessoas: abra o mural de um amigo, toque no + e deixe um recado. Ele aparece quando o dono aprovar." },
  { id: "store", sel: '[data-tour="store"]', act: "click", pause: true, title: "Conheça a Loja", text: "Na Loja você compra, com créditos, bottons para enfeitar, displays (relógio, clima, contador…) e fundos para o mural. Toque para dar uma olhada e feche a janela para terminar.", hint: "Toque em Loja" },
];
