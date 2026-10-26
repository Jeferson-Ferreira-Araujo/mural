"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { analyticsAllowed, CONSENT_EVENT } from "@/lib/consent";

const PING_MS = 15_000; // "online agora": um sinal a cada 15 s (o painel considera online quem mandou sinal nos últimos 40 s)

/** Avisa que a página saiu (aba fechada ou em segundo plano) para o "online agora" cair na hora. fetch com keepalive sobrevive ao fechamento da aba. */
function leave(fn: "anon_leave" | "site_leave", arg: Record<string, string>) {
  try {
    void fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", keepalive: true, headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "Content-Type": "application/json" }, body: JSON.stringify(arg) }).catch(() => undefined);
  } catch {}
}

/** Id da visita: sorteado no navegador, vale só enquanto a aba está aberta (nada de cookie e nada que identifique a pessoa). */
function sessionId(): { id: string; fresh: boolean } {
  try {
    const old = sessionStorage.getItem("pinz:sid");
    if (old) return { id: old, fresh: false };
    const id = crypto.randomUUID();
    sessionStorage.setItem("pinz:sid", id);
    return { id, fresh: true };
  } catch {
    return { id: crypto.randomUUID(), fresh: true };
  }
}

const deviceOf = () => (/Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ? "mobile" : /iPad|Tablet/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth >= 768 && window.innerWidth < 1100) ? "tablet" : "desktop");

/** Marca um uso de ferramenta (abrir a loja, o compositor…). Silencioso: se falhar, ninguém percebe. */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  try {
    if (!analyticsAllowed()) return;
    void getBrowserSupabase().rpc("track_event", { p_name: name, p_session: sessionId().id, p_path: location.pathname, p_props: props ?? {} }).then(() => undefined);
  } catch {}
}

/**
 * Métricas do próprio site (sem Google e sem cookies): páginas vistas, início de sessão e "online agora".
 * Não guarda IP nem identifica ninguém além da conta já logada; respeita o "Não rastrear" do navegador, ignora robôs e o painel de administração.
 */
export function SiteTracker() {
  const path = usePathname();
  const [ok, setOk] = useState(false); // a pessoa aceitou as métricas?
  useEffect(() => {
    const sync = () => setOk(analyticsAllowed());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!ok || !path || path.startsWith("/admin")) return;
    if (/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
    const sb = getBrowserSupabase();
    const { id, fresh } = sessionId();
    const send = (name: string, props: Record<string, unknown>) => void sb.rpc("track_event", { p_name: name, p_session: id, p_path: path, p_props: props }).then(() => undefined);
    if (fresh) {
      let ref = "";
      try {
        const u = document.referrer ? new URL(document.referrer) : null;
        if (u && u.host !== location.host) ref = u.host.replace(/^www\./, "");
      } catch {}
      const utm = new URLSearchParams(location.search).get("utm_source");
      send("session_start", { device: deviceOf(), lang: document.documentElement.lang || navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ref: utm || ref });
    }
    send("page_view", {});
    send("ping", { device: deviceOf() });
  }, [path, ok]);

  // sem aceite: só a contagem anônima e agregada ("quantas pessoas online" e "quantas páginas vistas"). Nada é guardado no aparelho (o id vive só na memória desta página),
  // não vai conta, IP, dispositivo, idioma nem endereço; respeita o "Não rastrear" do navegador, ignora robôs e o painel de administração.
  const anonId = useRef<string>("");
  useEffect(() => {
    if (ok || !path || path.startsWith("/admin")) return;
    if (navigator.doNotTrack === "1" || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
    if (!anonId.current) anonId.current = crypto.randomUUID();
    const sb = getBrowserSupabase();
    void sb.rpc("anon_ping", { p_id: anonId.current, p_view: true }).then(() => undefined);
    const ping = () => void sb.rpc("anon_ping", { p_id: anonId.current, p_view: false }).then(() => undefined);
    const t = window.setInterval(() => document.visibilityState === "visible" && ping(), PING_MS);
    const vis = () => (document.visibilityState === "visible" ? ping() : leave("anon_leave", { p_id: anonId.current }));
    const bye = () => leave("anon_leave", { p_id: anonId.current });
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", bye);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", bye);
    };
  }, [path, ok]);

  // entrou na conta: um "login" por visita
  useEffect(() => {
    if (!ok) return;
    const sb = getBrowserSupabase();
    const { data } = sb.auth.onAuthStateChange((ev, s) => {
      if (ev !== "SIGNED_IN" || !s) return;
      try {
        if (sessionStorage.getItem("pinz:login-tracked")) return;
        sessionStorage.setItem("pinz:login-tracked", "1");
      } catch {}
      trackEvent("login");
    });
    return () => data.subscription.unsubscribe();
  }, [ok]);

  // "online agora": avisa a cada 15 s, só com a aba à vista
  useEffect(() => {
    if (!ok || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
    const sb = getBrowserSupabase();
    const ping = () => {
      if (document.visibilityState !== "visible" || location.pathname.startsWith("/admin")) return;
      void sb.rpc("track_event", { p_name: "ping", p_session: sessionId().id, p_path: location.pathname, p_props: { device: deviceOf() } }).then(() => undefined);
    };
    const t = window.setInterval(ping, PING_MS);
    const vis = () => (document.visibilityState === "visible" ? ping() : leave("site_leave", { p_session: sessionId().id }));
    const bye = () => leave("site_leave", { p_session: sessionId().id });
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", bye);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", bye);
    };
  }, [ok]);

  return null;
}
