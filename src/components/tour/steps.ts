export type TourStep = {
  id: string;
  /** seletor do elemento a destacar (data-tour). Sem seletor, o cartão fica no meio da tela. Com seletor que não existe na tela, o passo é pulado. */
  sel?: string;
  title: string;
  text: string;
  /** lista curta de itens (vira etiquetas) */
  chips?: string[];
  /**
   * Passo interativo: a pessoa faz a ação de verdade no elemento destacado e o tour segue sozinho.
   * "click" = toca no elemento; "drag" = arrasta um botton da barra para o mural.
   */
  act?: "click" | "drag";
  /** a ação abre uma janela (Pins e Displays, Loja…): o tour espera a pessoa fechá-la para continuar */
  pause?: boolean;
  /** dica curta ao lado do ícone de mão, em passos interativos */
  hint?: string;
};

/** Passos do tour: textos curtos para caber em telas pequenas. Os interativos pedem para a pessoa fazer a ação no próprio site. */
export const TOUR_STEPS: TourStep[] = [
  { id: "board", sel: '[data-tour="board"]', title: "Este é o seu mural", text: "Um quadro de pins: recados, fotos e displays. As pessoas deixam pins e você decora. Vamos usar o site juntos, passo a passo." },
  { id: "zoom", sel: '[data-tour="zoom"]', act: "click", title: "Chegue mais perto", text: "Toque em Aproximar para ver os pins maiores. No celular também dá para usar a pinça ou tocar duas vezes.", hint: "Toque em Aproximar" },
  { id: "add", sel: '[data-tour="add"]', act: "click", pause: true, title: "Coloque um pin", text: "Toque no botão destacado para abrir os pins e displays. Veja as opções e, quando terminar, feche a janela para continuar.", hint: "Toque no botão +" },
  { id: "badges", sel: '[data-tour="badges"]', act: "drag", title: "Enfeite com bottons", text: "Arraste um botton da barra para o mural. Para tirar, arraste de volta para a barra.", hint: "Arraste um botton para o mural" },
  { id: "store", sel: '[data-tour="store"]', act: "click", pause: true, title: "Visite a Loja", text: "Toque na Loja para ver bottons, displays e fundos. Quando terminar de olhar, feche a janela para continuar.", hint: "Toque em Loja" },
  { id: "displays", title: "Displays", text: "Cartões vivos no mural. Toque num display colocado para ver as opções dele.", chips: ["🕒 Relógio", "⛅ Clima", "📅 Calendário", "⏳ Contador", "📖 Livro", "🥇 Top 3", "📊 Enquete", "🙏 Versículo", "💬 Frase do dia"] },
  { id: "share", sel: '[data-tour="share"]', act: "click", title: "Compartilhe com os amigos", text: "Toque em compartilhar para enviar o link do mural e convidar pessoas a ver e deixar pins. Para rever este tour, use Menu › Tour pelo Pinz.", hint: "Toque em compartilhar" },
];
