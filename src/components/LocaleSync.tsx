"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { getBrowserSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/auth";

/** Guarda no perfil o idioma que a pessoa usa no site, para os e-mails e avisos saírem na língua dela (só quem tem conta; nada de rastreamento). */
export function LocaleSync() {
  const locale = useLocale();
  const { session } = useSession();
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    const key = `pinz:locale-synced:${uid}`;
    try {
      if (localStorage.getItem(key) === locale) return;
    } catch {}
    void getBrowserSupabase()
      .rpc("set_my_locale", { p_locale: locale })
      .then(({ error }) => {
        if (error) return;
        try {
          localStorage.setItem(key, locale);
        } catch {}
      });
  }, [uid, locale]);
  return null;
}
