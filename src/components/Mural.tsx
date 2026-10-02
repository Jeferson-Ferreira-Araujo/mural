"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkGrantClient,
  getVisitorId,
  loadGrant,
  saveGrant,
  tryUnlock,
  type MuralStats,
  type UnlockResult,
} from "@/lib/mural";
import { getBrowserSupabase } from "@/lib/supabase";
import type { Message } from "@/lib/types";
import { DesktopBoard } from "./DesktopBoard";
import { MobileCarousel } from "./MobileCarousel";
import { Toast } from "./Toast";

type Props = {
  owner: string;
  prefix?: "do" | "da" | "de";
  tagline: string;
  question: string;
  stats: MuralStats;
  messages: Message[];
  /** Mural real (com slug) ou demonstração (dados fictícios, desbloqueio simulado). */
  slug?: string;
};

/**
 * Desktop (lg+): mural físico completo. Mobile/tablet: carrossel, uma mensagem por vez.
 * Os dois são renderizados e alternados por CSS (sem flash de layout no carregamento).
 */
export function Mural({ slug, prefix = "do", ...info }: Props) {
  const demo = !slug;
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
    if (!slug) return;
    const sb = getBrowserSupabase();
    sb.rpc("record_visit", { p_slug: slug, p_visitor_id: getVisitorId() }).then(() => undefined);
    const token = loadGrant(slug);
    if (token) void checkGrantClient(sb, slug, token).then((ok) => ok && setUnlocked(true));
  }, [slug]);

  const submitAnswer = useCallback(
    async (answer: string): Promise<UnlockResult> => {
      if (!slug) {
        setUnlocked(true); // demonstração: qualquer resposta desbloqueia
        return { ok: true };
      }
      const res = await tryUnlock(getBrowserSupabase(), slug, answer, getVisitorId());
      if (res.ok) {
        if (res.token) saveGrant(slug, res.token);
        setUnlocked(true);
      }
      return res;
    },
    [slug],
  );

  const shared = { ...info, prefix, unlocked, onSubmitAnswer: submitAnswer, onNotify: notify, demo };

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
