"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "./supabase";
import { getVisitorId } from "./mural";

/** Resultado de uma enquete: votos de cada opção, total e o voto de quem está vendo (índice da opção, ou null). */
export type PollState = { counts: number[]; total: number; mine: number | null };

/** O token de desbloqueio do mural que a pessoa está vendo (o servidor só deixa ver e votar com ele, ou sendo o dono). Preenchido pelo Explorer. */
export const PollAccess = createContext<{ token: string | null }>({ token: null });

type Raw = { counts?: number[]; total?: number; mine?: number | null } | null;
const norm = (r: Raw, keepMine: number | null): PollState | null => (r && Array.isArray(r.counts) ? { counts: r.counts.map((n) => Number(n) || 0), total: Number(r.total) || 0, mine: r.mine === undefined ? keepMine : r.mine } : null);

/**
 * Enquete ao vivo: busca o resultado, escuta as mudanças em tempo real (cada voto novo chega a todos que estão com a enquete à vista)
 * e confere de novo a cada 15 s por segurança. `vote` troca o voto na hora (a tela muda antes do servidor responder).
 * Um voto por pessoa: logada, vale a conta; sem conta, vale este aparelho.
 */
export function usePoll(badgeId: string | undefined, enabled: boolean, optionCount: number) {
  const { token } = useContext(PollAccess);
  const [state, setState] = useState<PollState | null>(null);
  const mine = useRef<number | null>(null);
  mine.current = state?.mine ?? null;

  const load = useCallback(async () => {
    if (!badgeId) return;
    const { data } = await getBrowserSupabase().rpc("poll_counts", { p_badge: badgeId, p_token: token, p_voter: getVisitorId() });
    const s = norm(data as Raw, mine.current);
    if (s) setState(s);
  }, [badgeId, token]);

  useEffect(() => {
    if (!enabled || !badgeId) return;
    void load();
    const sb = getBrowserSupabase();
    const ch = sb
      .channel(`poll:${badgeId}`)
      .on("broadcast", { event: "counts" }, (msg) => {
        const p = (msg as { payload?: Raw }).payload;
        setState((cur) => norm({ counts: p?.counts, total: p?.total, mine: cur?.mine ?? null }, cur?.mine ?? null));
      })
      .subscribe();
    const t = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearInterval(t);
      void sb.removeChannel(ch);
    };
  }, [enabled, badgeId, load]);

  const vote = useCallback(
    async (option: number) => {
      if (!badgeId || option < 0 || option >= optionCount) return false;
      const before = state;
      // na hora: tira o voto anterior (se havia) e põe o novo
      setState((cur) => {
        const counts = (cur?.counts ?? Array(optionCount).fill(0)).slice();
        if (cur?.mine !== null && cur?.mine !== undefined && counts[cur.mine] > 0) counts[cur.mine]--;
        counts[option]++;
        return { counts, total: counts.reduce((a, b) => a + b, 0), mine: option };
      });
      const { data, error } = await getBrowserSupabase().rpc("vote_poll", { p_badge: badgeId, p_option: option, p_token: token, p_voter: getVisitorId() });
      const s = error ? null : norm(data as Raw, option);
      if (!s) {
        setState(before);
        return false;
      }
      setState(s);
      return true;
    },
    [badgeId, token, optionCount, state],
  );

  return { state, vote };
}
