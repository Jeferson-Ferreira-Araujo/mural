"use client";

import { useEffect, useRef, useState } from "react";
import { getOwnAvatar, processAvatar, removeAvatar, uploadAvatar } from "@/lib/avatar";
import { claimReward, getRewards } from "@/lib/rewards";
import { getBrowserSupabase } from "@/lib/supabase";
import { Avatar } from "./Avatar";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";

/**
 * Foto de perfil do dono (aparece no mural e na busca). Quem acabou de criar o mural é convidado a enviar a primeira.
 * A foto é recortada em quadrado e reduzida no próprio navegador antes de ir para o servidor.
 */
export function AvatarUploader({ nickname, plus = false }: { nickname: string; plus?: boolean }) {
  const tl = useLit();
  const tx = useTranslations("components.AvatarUploader");
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [reward, setReward] = useState<number | null>(null); // créditos que a foto ainda vai dar (some depois de ganhos)

  useEffect(() => {
    void getOwnAvatar(getBrowserSupabase()).then((a) => {
      setUrl(a.url);
      setReady(true);
    });
    void getRewards().then((l) => {
      const t = l?.find((x) => x.id === "avatar");
      if (t && !t.done) setReward(t.credits);
    });
  }, []);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const blob = await processAvatar(file);
      setUrl(await uploadAvatar(getBrowserSupabase(), blob));
      setMsg({ ok: true, text: tx("m_fotoSalvaElaJaAparece") });
      const won = await claimReward("avatar");
      if (won) {
        setMsg({ ok: true, text: tx("m_fotoSalvaVoceGanhouCreditos", { v0: won.credits }) });
        setReward(null);
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : tx("m_naoFoiPossivelEnviarA") });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    try {
      await removeAvatar(getBrowserSupabase());
      setUrl(null);
      setMsg({ ok: true, text: tl("Foto removida.") });
    } catch {
      setMsg({ ok: false, text: tx("m_naoFoiPossivelRemoverAgora") });
    } finally {
      setBusy(false);
    }
  }

  const btn = "cursor-pointer rounded-lg border border-[#d9c9ad] px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition-colors hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";

  return (
    <section aria-label={tx("suaFoto")} className={`mt-5 flex items-center gap-4 rounded-2xl border p-4 ${!ready || url ? "border-[#e1d3ba] bg-white/60" : "border-[#e0b04a] bg-[#fff6dd]"}`}>
      <Avatar src={url} name={nickname} plus={plus} className="size-[4.5rem]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{url ? tx("m_suaFoto") : tx("m_adicioneUmaFoto")}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy || !ready} onClick={() => input.current?.click()}>
            {busy ? "Enviando…" : url ? tl("Alterar foto") : tl("Escolher foto")}
          </button>
          {url && (
            <button type="button" className={btn} disabled={busy} onClick={remove}>
              {tx("remover")}</button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} aria-label={tx("escolherFotoDePerfil")} />
        {reward !== null && !msg && <p className="mt-1.5 text-sm font-semibold text-[#8a6a1c]">{tx("x_ganheCreditosAoEnviarA", { v0: reward })}</p>}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`mt-1.5 text-sm ${msg.ok ? "text-[#2f6b3a]" : "text-[#a23b2a]"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
