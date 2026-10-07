"use client";

import { useEffect, useState } from "react";
import { loadFeatureFlags, setFeatureFlags, TOGGLEABLE_FORMATS, type FeatureFlags } from "@/lib/features";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";

/** Liga/desliga formatos de pin para todo o site. Desligado: some da escolha de novos pins (e o servidor recusa); os já criados continuam aparecendo. */
export function FeaturesPanel({ onToast }: { onToast: (m: string) => void }) {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void loadFeatureFlags(true).then(setFlags);
  }, []);

  async function toggle(key: string, label: string, enabled: boolean) {
    setBusy(key);
    const { data, error } = await getBrowserSupabase().rpc("admin_set_feature", { p_key: key, p_enabled: enabled });
    setBusy(null);
    if (error || !data) return onToast("Não foi possível alterar agora.");
    setFeatureFlags(data as FeatureFlags);
    setFlags(data as FeatureFlags);
    onToast(`${label} ${enabled ? "ligado" : "desligado"}: vale para todo o site.`);
  }

  if (!flags) {
    return (
      <div className="py-8">
        <Spinner />
      </div>
    );
  }
  return (
    <section className="mt-4" aria-label="Recursos">
      <p className="text-sm text-[#6b5440]">Formatos de pin. Ao desligar, a opção some para quem for criar um pin novo; os pins que já existem continuam no mural.</p>
      <ul className="mt-3 divide-y divide-[#e6d8bd] rounded-2xl border border-[#e1d3ba] bg-white/70">
        {TOGGLEABLE_FORMATS.map((f) => {
          const on = flags[f.key] !== false;
          return (
            <li key={f.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{f.label}</p>
                <p className="text-xs text-[#6b5440]">{f.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${f.label}: ${on ? "ligado" : "desligado"}`}
                disabled={busy === f.key}
                onClick={() => void toggle(f.key, f.label, !on)}
                className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60 ${on ? "bg-[#2f8f4e]" : "bg-[#b9ad9b]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
