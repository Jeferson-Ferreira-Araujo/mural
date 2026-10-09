"use client";

import { useEffect, useState } from "react";
import type { MessageType } from "./types";
import { getBrowserSupabase } from "./supabase";

/** Formatos de pin que o administrador pode ligar/desligar (painel /admin → Recursos). Desligar só esconde da escolha de NOVOS pins: os já criados continuam. */
export const TOGGLEABLE_FORMATS: { key: string; type: MessageType; label: string; hint: string }[] = [
  { key: "pin_draw", type: "draw", label: "Desenho", hint: "Quadrinho desenhado na hora" },
  { key: "pin_music", type: "music", label: "Música", hint: "Mini MP3 player (Spotify/YouTube)" },
  { key: "pin_video", type: "video", label: "Vídeo", hint: "Arquivo de vídeo ou link do YouTube" },
  { key: "pin_voice", type: "voice", label: "Voz", hint: "Recado gravado em áudio" },
  { key: "pin_place", type: "place", label: "Local", hint: "Lugar no mapa" },
];

/** Recursos do site (não são formatos de pin). Desligado: some a opção; o que já foi criado continua. */
export const TOGGLEABLE_FEATURES: { key: string; label: string; hint: string }[] = [
  { key: "pin_daily", label: "Versículo e frase do dia", hint: "Pins da loja: um texto novo todo dia, colocado em qualquer lugar do mural" },
  { key: "pin_clock", label: "Relógio", hint: "Pin da loja: a hora passando no mural" },
  { key: "pin_weather", label: "Clima", hint: "Pin da loja: o tempo da cidade escolhida" },
  { key: "reactions", label: "Reações aos pins", hint: "O dono do mural reage com emoji no detalhe do pin (e o autor é avisado no sino)" },
];

export type FeatureFlags = Record<string, boolean>;

let cache: FeatureFlags | null = null;
let inflight: Promise<FeatureFlags> | null = null;
const listeners = new Set<(f: FeatureFlags) => void>();

export async function loadFeatureFlags(force = false): Promise<FeatureFlags> {
  if (cache && !force) return cache;
  inflight ??= (async () => {
    try {
      const { data, error } = await getBrowserSupabase().rpc("get_feature_flags");
      cache = !error && data && typeof data === "object" ? (data as FeatureFlags) : (cache ?? {});
    } catch {
      cache = cache ?? {};
    }
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function setFeatureFlags(next: FeatureFlags) {
  cache = next;
  listeners.forEach((l) => l(next));
}

/** Estado atual dos recursos (busca uma vez por visita; sem resposta, tudo fica como está: ligado). */
export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(cache ?? {});
  useEffect(() => {
    let alive = true;
    void loadFeatureFlags().then((f) => alive && setFlags(f));
    listeners.add(setFlags);
    return () => {
      alive = false;
      listeners.delete(setFlags);
    };
  }, []);
  return flags;
}

/** Tira dos formatos os que o administrador desligou. */
export function enabledFormats(formats: readonly MessageType[], flags: FeatureFlags): MessageType[] {
  const off = new Set(TOGGLEABLE_FORMATS.filter((f) => flags[f.key] === false).map((f) => f.type));
  return formats.filter((f) => !off.has(f));
}
