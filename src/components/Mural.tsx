"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkGrantClient,
  getVisitorId,
  loadGrant,
  saveGrant,
  tryUnlock,
  type MuralRef,
  type MuralStats,
  type UnlockResult,
} from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";
import { DesktopBoard } from "./DesktopBoard";
import { MobileCarousel } from "./MobileCarousel";
import { Toast } from "./Toast";

type Props = {
  title: string;
  question: string;
  stats: MuralStats;
  messages: Message[];
  /** Mural real (nickname + endereço) ou demonstração (dados fictícios, desbloqueio simulado). */
  muralRef?: MuralRef;
};

/**
 * Desktop (lg+): mural físico completo. Mobile/tablet: carrossel, uma mensagem por vez.
 * Os dois são renderizados e alternados por CSS (sem flash de layout no carregamento).
 */
export function Mural({ muralRef, ...info }: Props) {
  const demo = !muralRef;
  const nick = muralRef?.nick;
  const slug = muralRef?.slug;
  const [unlocked, setUnlocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  // mural real: registra a visita e restaura um desbloqueio anterior (validado no servidor)
  useEffect(() => {
    if (!nick || !slug) return;
    const ref = { nick, slug };
    const sb = getBrowserSupabase();
    sb.rpc("record_visit", { p_nick: nick, p_slug: slug, p_visitor_id: getVisitorId() }).then(() => undefined);
    const token = loadGrant(ref);
    if (token) void checkGrantClient(sb, ref, token).then((ok) => ok && setUnlocked(true));
  }, [nick, slug]);

  const submitAnswer = useCallback(
    async (answer: string): Promise<UnlockResult> => {
      if (!nick || !slug) {
        setUnlocked(true); // demonstração: qualquer resposta desbloqueia
        return { ok: true };
      }
      const ref = { nick, slug };
      const res = await tryUnlock(getBrowserSupabase(), ref, answer, getVisitorId());
      if (res.ok) {
        if (res.token) saveGrant(ref, res.token);
        setUnlocked(true);
      }
      return res;
    },
    [nick, slug],
  );

  const shared = { ...info, unlocked, onSubmitAnswer: submitAnswer, onNotify: notify, demo };

  return (
    <>
      <div className="hidden lg:block">
        <DesktopBoard {...shared} />
      </div>
      <div className="lg:hidden">
        <MobileCarousel {...shared} />
      </div>
      <Toast message={toast} />
    </>
  );
}
