import type { SupabaseClient } from "@supabase/supabase-js";

/** Evento que abre o tour (do fim das boas-vindas e do item "Tour pelo Pinz" do menu). */
export const TOUR_EVENT = "pinz:start-tour";

/** Evento (só no menu do administrador): reabre as boas-vindas para testar. */
export const ONBOARDING_EVENT = "pinz:start-onboarding";

export type Onboarding = { done: boolean; birth: string | null };

/** Se a conta já passou pelas boas-vindas (foto, data de nascimento e convite para o tour) e a data de nascimento salva. */
export async function getOnboarding(sb: SupabaseClient): Promise<Onboarding | null> {
  const { data, error } = await sb.rpc("get_onboarding");
  if (error || !data) return null;
  const d = data as { done?: boolean; birth?: string | null };
  return { done: d.done === true, birth: d.birth ?? null };
}

/** Salva a data de nascimento (AAAA-MM-DD, opcional) e, com `finish`, marca as boas-vindas como concluídas. Devolve o código do erro, ou null se deu certo. */
export async function saveOnboarding(sb: SupabaseClient, birth: string | null, finish: boolean): Promise<"too_young" | "invalid_birth" | "failed" | null> {
  const { error } = await sb.rpc("save_onboarding", { p_birth: birth, p_finish: finish });
  if (!error) return null;
  if (error.message.includes("too_young")) return "too_young";
  if (error.message.includes("invalid_birth")) return "invalid_birth";
  return "failed";
}
