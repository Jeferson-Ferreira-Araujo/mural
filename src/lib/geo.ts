"use client";

import { useEffect, useState } from "react";

/**
 * Localização de quem está vendo o mural (para o display de Clima mostrar o tempo do lugar onde a pessoa está).
 * O navegador (ou o celular) pergunta a permissão uma única vez. Se a pessoa negar, nunca mais perguntamos (vale a cidade escolhida pelo dono) até ela
 * excluir a conta; se permitir, o navegador lembra e não pergunta de novo. Para mudar de ideia, só nas configurações do navegador ou do celular.
 * A posição fica só neste aparelho (30 minutos) e vai ao servidor apenas arredondada (~1 km) para buscar o tempo.
 */
export type Coords = { lat: number; lon: number };
export type GeoStatus = "idle" | "asking" | "ok" | "denied" | "unavailable";
type State = { status: GeoStatus; coords: Coords | null };

const COORDS_KEY = "pinz:geo";
const DENIED_KEY = "pinz:geo-denied";
const COORDS_TTL = 30 * 60_000;

let state: State = { status: "idle", coords: null };
let started: Promise<void> | null = null;
const subs = new Set<() => void>();
const set = (s: State) => {
  state = s;
  subs.forEach((f) => f());
};

const round = (n: number) => Math.round(n * 100) / 100; // ~1 km

function readJson<T>(store: Storage | undefined, key: string): T | null {
  try {
    const v = store?.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

/** A pessoa excluiu a conta: esquece a escolha de localização deste aparelho (da próxima vez o navegador pergunta de novo). */
export function forgetGeoChoice() {
  try {
    window.localStorage.removeItem(DENIED_KEY);
    window.sessionStorage.removeItem(COORDS_KEY);
  } catch {
    /* sem armazenamento: nada a esquecer */
  }
}

/** Começa (uma vez por página) a descobrir onde a pessoa está: guardado, permissão do navegador ou pergunta. */
function start(): Promise<void> {
  if (started) return started;
  started = (async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return set({ status: "unavailable", coords: null });
    const saved = readJson<{ at: number; lat: number; lon: number }>(window.sessionStorage, COORDS_KEY);
    if (saved && Date.now() - saved.at < COORDS_TTL) return set({ status: "ok", coords: { lat: saved.lat, lon: saved.lon } });
    let perm: PermissionStatus | undefined;
    try {
      perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    } catch {
      /* sem a API de permissões (ex.: Safari antigo): vale só a escolha guardada */
    }
    if (perm?.state === "granted") window.localStorage.removeItem(DENIED_KEY); // liberou depois nas configurações: volta a valer
    else if (perm?.state === "denied") {
      window.localStorage.setItem(DENIED_KEY, String(Date.now()));
      return set({ status: "denied", coords: null });
    } else if (readJson<number>(window.localStorage, DENIED_KEY)) return set({ status: "denied", coords: null }); // já negou uma vez: nunca mais pergunta
    set({ status: "asking", coords: null });
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) };
          try {
            window.sessionStorage.setItem(COORDS_KEY, JSON.stringify({ at: Date.now(), ...c }));
          } catch {
            /* sem armazenamento: só não guarda */
          }
          set({ status: "ok", coords: c });
          resolve();
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            try {
              window.localStorage.setItem(DENIED_KEY, String(Date.now()));
            } catch {
              /* idem */
            }
            set({ status: "denied", coords: null });
          } else set({ status: "unavailable", coords: null });
          resolve();
        },
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 },
      );
    });
  })();
  return started;
}

/** A posição de quem vê (null enquanto não há, se negou ou se o aparelho não sabe). `enabled` false = nem pergunta (prévias na loja e no formulário). */
export function useViewerCoords(enabled: boolean): State {
  const [s, setS] = useState<State>(state);
  useEffect(() => {
    if (!enabled) return;
    const sync = () => setS(state);
    subs.add(sync);
    sync();
    void start();
    return () => void subs.delete(sync);
  }, [enabled]);
  return enabled ? s : { status: "idle", coords: null };
}
