"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useLit } from "@/i18n/literal";
import { fetchNotice, noticeText, type SiteNotice as Notice } from "@/lib/notice";
import { getBrowserSupabase } from "@/lib/supabase";
import { RichBody } from "@/lib/richText";
import { Modal } from "./account/Modal";

/** Aviso do administrador na tela inicial: aparece uma vez para cada pessoa (até ela fechar) e some quando o admin o desativa ou apaga. */
export function SiteNotice() {
  const tl = useLit();
  const locale = useLocale();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const sb = getBrowserSupabase();
    // só para quem está logada (a tela inicial dela); quem ainda vê a tela de entrada não recebe o aviso
    const load = () =>
      void fetchNotice(sb).then((n) => {
        if (!alive || !n) return;
        // uma vez só por conta: já fica registrado ao aparecer (mesmo que a pessoa nem feche), e vale em qualquer aparelho
        void sb.rpc("mark_site_notice_seen", { p_id: n.id });
        setNotice(n);
        setOpen(true);
      });
    void sb.auth.getSession().then(({ data }) => alive && data.session && load());
    const { data: sub } = sb.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_IN") load();
      if (ev === "SIGNED_OUT") setOpen(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // outra janela que abre depois do aviso ficaria na frente dele: fecha e reabre o aviso para ele voltar ao topo
  const reopening = useRef(false);
  useEffect(() => {
    if (!open) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const obs = new MutationObserver((list) => {
      // o próprio aviso se reconhece pelo título (é o nome da janela)
      const mine = notice ? noticeText(notice.texts, locale).t : "";
      const other = list.some((m) => m.target instanceof HTMLDialogElement && m.target.open && m.oldValue === null && m.target.getAttribute("aria-label") !== mine);
      if (!other || reopening.current) return;
      reopening.current = true;
      setOpen(false);
      timer = setTimeout(() => {
        setOpen(true);
        reopening.current = false;
      }, 60);
    });
    obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"], attributeOldValue: true });
    return () => {
      obs.disconnect();
      clearTimeout(timer);
    };
  }, [open, notice, locale]);

  if (!notice) return null;
  const x = noticeText(notice.texts, locale);
  const close = () => {
    if (reopening.current) return;
    setOpen(false);
  };
  const external = !!notice.link && !notice.link.startsWith("/");

  return (
    <Modal open={open} onClose={close} title={x.t} wide>
      {notice.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={notice.image} alt="" className="mx-auto mb-3 max-h-48 w-auto max-w-full object-contain" />
      )}
      <RichBody text={x.b} />
      <div className="mt-4 flex gap-2">
        {notice.link ? (
          <>
            <button type="button" onClick={close} className="flex-1 cursor-pointer rounded-xl border border-[#d9c9ad] bg-white/70 px-4 py-3 text-sm font-semibold text-[#4a3826] transition hover:bg-white">
              {tl("Entendi")}
            </button>
            <a href={notice.link} onClick={close} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex-1 cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-center text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22]">
              {x.c || tl("Saiba mais")}
            </a>
          </>
        ) : (
          <button type="button" onClick={close} className="flex-1 cursor-pointer rounded-xl bg-[#d9a21b] px-4 py-3 text-sm font-bold text-[#2a1c12] transition hover:bg-[#e6ae22]">
            {tl("Entendi")}
          </button>
        )}
      </div>
    </Modal>
  );
}
