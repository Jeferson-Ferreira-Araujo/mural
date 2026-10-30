"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useLit } from "@/i18n/literal";
import { fetchNotice, noticeText, type SiteNotice as Notice } from "@/lib/notice";
import { getBrowserSupabase } from "@/lib/supabase";
import { RichBody } from "@/lib/richText";
import { Modal } from "./account/Modal";

const key = (n: Notice) => `pinz:aviso:${n.id}:${n.rev}`;

/** Aviso do administrador na tela inicial: aparece uma vez para cada pessoa (até ela fechar) e some quando o admin o desativa ou apaga. */
export function SiteNotice() {
  const tl = useLit();
  const locale = useLocale();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchNotice(getBrowserSupabase()).then((n) => {
      if (!alive || !n) return;
      try {
        if (localStorage.getItem(key(n)) === "1") return;
      } catch {}
      setNotice(n);
      setOpen(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!notice) return null;
  const x = noticeText(notice.texts, locale);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(key(notice), "1");
    } catch {}
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
