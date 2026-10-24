"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocale } from "next-intl";
import { getBrowserSupabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/auth";
import { SITE_HOST } from "@/lib/mural";
import { useLit } from "@/i18n/literal";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Modo evento (festa, casamento, formatura): QR code do mural, cartaz para imprimir e aprovação automática dos pins dos convidados. */
export function EventTools({ muralId, slug, title }: { muralId: string; slug: string; title: string }) {
  const tl = useLit();
  const locale = useLocale();
  const [nick, setNick] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const sb = getBrowserSupabase();
    void getOwnProfile(sb).then((p) => alive && setNick(p?.nickname ?? null));
    void sb.rpc("get_mural_event_mode", { p_mural_id: muralId }).then(({ data }) => alive && setAuto(data === true));
    return () => {
      alive = false;
    };
  }, [muralId]);

  const url = nick ? `https://${SITE_HOST}/${nick}/${slug}` : null;
  useEffect(() => {
    if (!url) return;
    let alive = true;
    void QRCode.toDataURL(url, { width: 900, margin: 2, errorCorrectionLevel: "M", color: { dark: "#1b110a", light: "#ffffff" } }).then((d) => alive && setQr(d));
    return () => {
      alive = false;
    };
  }, [url]);

  async function toggle() {
    const next = !auto;
    setAuto(next);
    const { error } = await getBrowserSupabase().rpc("set_mural_event_mode", { p_mural_id: muralId, p_on: next });
    if (error) setAuto(!next);
  }

  function download() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `pinz-qr-${slug}.png`;
    a.click();
  }

  function printPoster() {
    if (!qr || !url) return;
    const w = window.open("", "_blank", "width=820,height=1100");
    if (!w) return;
    const dir = locale === "ar" ? "rtl" : "ltr";
    w.document.write(`<!doctype html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page { size: A4; margin: 0 }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1b110a; background: #fff; }
      .p { width: 210mm; height: 297mm; box-sizing: border-box; padding: 22mm 18mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 6mm solid #d9a21b; }
      .brand { font-size: 22pt; font-weight: 800; letter-spacing: .02em; margin-bottom: 8mm }
      h1 { font-size: 34pt; margin: 0 0 4mm; line-height: 1.1 }
      h2 { font-size: 22pt; font-weight: 600; margin: 0 0 10mm }
      img { width: 120mm; height: 120mm; }
      .u { font-size: 14pt; margin-top: 8mm; font-weight: 700; word-break: break-all }
      .s { font-size: 11pt; color: #6b5440; margin-top: 6mm; max-width: 140mm }
    </style></head><body><div class="p"><div class="brand">pinz</div><h1>${esc(title)}</h1><h2>${esc(tl("Escaneie e deixe o seu recado"))}</h2><img src="${qr}" alt="QR code"><div class="u">${esc(url.replace("https://", ""))}</div><div class="s">${esc(tl("Para postar é preciso entrar com uma conta Pinz."))}</div></div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
    w.document.close();
  }

  const btn = "cursor-pointer rounded-lg border border-[#d9c9ad] bg-white px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:opacity-60";
  return (
    <div className="mt-4 rounded-xl border border-[#e1d3ba] bg-white/70 px-4 py-3">
      <p className="text-sm font-semibold">{tl("Modo evento")}</p>
      <p className="text-xs text-[#6b5440]">{tl("Imprima ou baixe o QR code para os convidados abrirem este mural pelo celular. Para postar, eles entram com uma conta Pinz.")}</p>
      <div className="mt-3 flex items-center gap-3">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code" className="size-24 shrink-0 rounded-lg border border-[#e1d3ba] bg-white p-1" />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!qr} onClick={download} className={btn}>
            {tl("Baixar QR code")}
          </button>
          <button type="button" disabled={!qr} onClick={printPoster} className={btn}>
            {tl("Imprimir cartaz")}
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#efe4cf] pt-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{tl("Aprovar os pins automaticamente")}</p>
          <p className="text-xs text-[#6b5440]">{tl("Os pins dos convidados aparecem na hora, sem esperar a sua aprovação. Você continua podendo excluir qualquer pin.")}</p>
        </div>
        <button type="button" role="switch" aria-checked={auto} aria-label={tl("Aprovar os pins automaticamente")} onClick={() => void toggle()} className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${auto ? "bg-[#2f8f4e]" : "bg-[#cdbfa6]"}`}>
          <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${auto ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </div>
  );
}
