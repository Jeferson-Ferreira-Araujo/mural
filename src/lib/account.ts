import type { PlanId } from "./plans";

/**
 * Conta do proprietário (plano e créditos).
 * ETAPA ATUAL: valores fixos de demonstração. Quando houver banco/pagamentos, esta é a única
 * função a trocar: ler o plano e o saldo de créditos do usuário logado.
 */
export type Account = { plan: PlanId; credits: number };

export function getAccount(): Account {
  return { plan: "free", credits: 0 };
}
