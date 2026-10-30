"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useLit } from "@/i18n/literal";
import { canCompressVideo, compressVideo, downscalePhoto, MAX_VIDEO_SEC, needsCompression, probeVideo } from "@/lib/media";
import { SEAL_STYLES, type SealStyle } from "@/lib/types";
import type { HandId } from "@/lib/style";
import { EnvelopeArt, SEAL_LABEL, SEAL_LOOK } from "../messages/SealCard";
import { inputClass } from "../ui";
import { FontPicker } from "./StylePickers";
import type { DraftChange } from "./types";

const TEXT_MAX = 500;
const MAX_PHOTO_MB = 8;
const MAX_VIDEO_MB = 40;
const MAX_AUDIO_MB = 10;
const MAX_VOICE_SEC = 60;
/** A abertura precisa estar pelo menos 10 minutos à frente (o servidor aceita a partir de 1 minuto). */
const MIN_AHEAD_MS = 10 * 60_000;
const MAX_AHEAD_MS = 5 * 365 * 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

function measureRatio(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? Math.round(Math.min(2, Math.max(0.5, img.naturalWidth / img.naturalHeight)) * 1000) / 1000 : null);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const fileBtn = "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9c9ad] bg-white px-3.5 py-2 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf] focus-within:outline-2 focus-within:outline-[#d98a2b]";
const darkBtn = "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f232b] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#2c313b]";

/** Uma linha de anexo: nome, o que já foi escolhido e o botão de remover. */
function Attach({ label, children, chosen, onRemove }: { label: string; children: ReactNode; chosen: ReactNode; onRemove: () => void }) {
  const tl = useLit();
  return (
    <div className="rounded-xl border border-[#e1d3ba] bg-white/60 px-3 py-2.5">
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      {chosen ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">{chosen}</div>
          <button type="button" onClick={onRemove} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#a23b2a] hover:bg-[#f6e3dd]">
            {tl("Remover")}
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Carta Selada (PINZ+): texto, data e hora de abertura, estilo do envelope e, se quiser, 1 foto, 1 vídeo e 1 áudio.
 * A data é obrigatória: a carta chega fechada ao mural e só abre quando ela chegar (o servidor guarda o conteúdo até lá).
 */
export function SealForm({ onChange }: { onChange: DraftChange }) {
  const tl = useLit();
  const tx = useTranslations("components.composer.forms");
  const [text, setText] = useState("");
  const [style, setStyle] = useState<SealStyle>("classica");
  const [font, setFont] = useState<HandId>("caveat");
  const [date, setDate] = useState(() => dateInput(new Date(Date.now() + 86_400_000)));
  const [time, setTime] = useState("10:00");
  const [photo, setPhoto] = useState<{ url: string; ratio: number | null } | null>(null);
  const [video, setVideo] = useState<{ url: string; dur?: string } | null>(null);
  const [voice, setVoice] = useState<{ url: string; dur?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const urls = useRef<Set<string>>(new Set());
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const seconds = useRef(0);
  const canRecord = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const at = date && time ? new Date(`${date}T${time}`) : null;
  const atMs = at ? at.getTime() : NaN;
  const dateOk = Number.isFinite(atMs) && atMs >= Date.now() + MIN_AHEAD_MS && atMs <= Date.now() + MAX_AHEAD_MS;

  const track = (url: string) => {
    urls.current.add(url);
    return url;
  };
  const drop = (url?: string) => {
    if (url) {
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    }
  };

  async function pickPhoto(original: File | undefined) {
    if (!original) return;
    if (!original.type.startsWith("image/")) return setError(tl("Escolha um arquivo de imagem."));
    setError(null);
    const file = await downscalePhoto(original);
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return setError(tx("m_estaFotoFicouGrandeDemais", { v0: (file.size / 1048576).toFixed(0) }));
    const url = track(URL.createObjectURL(file));
    const ratio = await measureRatio(url);
    drop(photo?.url);
    setPhoto({ url, ratio });
  }

  async function pickVideo(original: File | undefined) {
    if (!original) return;
    if (!original.type.startsWith("video/")) return setError(tx("m_escolhaUmArquivoDeVideo"));
    setError(null);
    let file = original;
    let secs: number | undefined;
    try {
      const info = await probeVideo(original);
      secs = Number.isFinite(info.duration) ? info.duration : undefined;
      if (secs && secs > MAX_VIDEO_SEC) return setError(tx("m_oVideoPodeTerAte", { v0: MAX_VIDEO_SEC, v1: mmss(secs) }));
      if (needsCompression(original, info)) {
        if (canCompressVideo()) {
          setProgress(0);
          file = await compressVideo(original, setProgress);
          setProgress(null);
        } else if (original.size > MAX_VIDEO_MB * 1024 * 1024) {
          return setError(tx("m_esteVideoTemESeu", { v0: mb(original.size), v1: MAX_VIDEO_MB }));
        }
      }
    } catch {
      setProgress(null);
      if (original.size > MAX_VIDEO_MB * 1024 * 1024) return setError(tx("m_naoFoiPossivelReduzirEste"));
    }
    setProgress(null);
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return setError(tx("m_mesmoReduzidoOVideoFicou", { v0: mb(file.size), v1: MAX_VIDEO_MB }));
    drop(video?.url);
    setVideo({ url: track(URL.createObjectURL(file)), dur: secs ? mmss(secs) : undefined });
  }

  function setAudio(url: string, dur?: string) {
    drop(voice?.url);
    setVoice({ url: track(url), dur });
  }
  function pickAudio(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("audio/")) return setError(tx("m_escolhaUmArquivoDeAudio"));
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) return setError(tx("m_oAudioPodeTerAte", { v0: MAX_AUDIO_MB }));
    setError(null);
    const url = URL.createObjectURL(file);
    setAudio(url);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => setVoice((v) => (v && v.url === url ? { ...v, dur: Number.isFinite(probe.duration) ? mmss(probe.duration) : undefined } : v));
    probe.src = url;
  }
  function stopRec() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function startRec() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mr = new MediaRecorder(s);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      mr.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        if (blob.size > 0) setAudio(URL.createObjectURL(blob), mmss(Math.max(seconds.current, 1)));
      };
      recorder.current = mr;
      seconds.current = 0;
      setElapsed(0);
      mr.start();
      setRecording(true);
      timer.current = setInterval(() => {
        seconds.current += 1;
        setElapsed(seconds.current);
        if (seconds.current >= MAX_VOICE_SEC) stopRec();
      }, 1000);
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(denied ? tx("m_permitaOUsoDoMicrofone") : tx("m_naoFoiPossivelUsarO"));
    }
  }

  useEffect(
    () =>
      onChange(
        {
          type: "seal",
          style,
          text: text.trim() || tl("Sua mensagem aparece aqui."),
          font,
          opensAt: dateOk && at ? at.toISOString() : new Date(Date.now() + 86_400_000).toISOString(),
          ...(photo ? { src: photo.url, ...(photo.ratio ? { ratio: photo.ratio } : {}) } : {}),
          ...(video ? { video: video.url, ...(video.dur ? { vdur: video.dur } : {}) } : {}),
          ...(voice ? { voice: voice.url, ...(voice.dur ? { adur: voice.dur } : {}) } : {}),
        },
        { empty: !text.trim() || !dateOk },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, style, font, date, time, photo, video, voice, dateOk, onChange],
  );

  // ao fechar: solta o microfone e os arquivos temporários
  useEffect(() => {
    const all = urls.current;
    return () => {
      clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      all.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const quick = (days: number) => {
    const d = new Date(Date.now() + days * 86_400_000);
    setDate(dateInput(d));
    setTime(timeInput(d));
  };
  const today = dateInput(new Date());

  return (
    <div className="space-y-4">
      <div>
        <textarea aria-label={tl("Escreva sua mensagem...")} value={text} onChange={(e) => setText(e.target.value)} maxLength={TEXT_MAX} rows={6} placeholder={tl("Escreva sua mensagem...")} className={`${inputClass} min-h-[8rem] resize-y`} />
        <div className={`mt-1 text-right text-xs ${text.length >= TEXT_MAX ? "text-[#a23b2a]" : "text-[#8a7b69]"}`}>
          {text.length}/{TEXT_MAX}
        </div>
      </div>

      <FontPicker value={font} onChange={setFont} />

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{tl("Estilo do envelope")}</legend>
        <div role="radiogroup" aria-label={tl("Estilo do envelope")} className="grid grid-cols-3 gap-2">
          {SEAL_STYLES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)} className={`cursor-pointer rounded-xl border-2 bg-white/60 p-1.5 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${style === s ? "border-[#2f2218]" : "border-transparent hover:bg-white"}`}>
              <EnvelopeArt look={SEAL_LOOK[s]} className="mx-auto block w-full" />
              <span className="mt-1 block text-xs font-semibold">{tl(SEAL_LABEL[s])}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{tl("Abrir em")}</legend>
        <div className="grid grid-cols-[1fr_8.5rem] gap-2">
          <input type="date" aria-label={tl("Data")} value={date} min={today} onChange={(e) => setDate(e.target.value)} aria-invalid={!dateOk} className={inputClass} />
          <input type="time" aria-label={tl("Hora")} value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={!dateOk} className={inputClass} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {([[tl("Em 1 dia"), 1], [tl("Em 1 semana"), 7], [tl("Em 1 mês"), 30]] as const).map(([label, d]) => (
            <button key={label} type="button" onClick={() => quick(d)} className="cursor-pointer rounded-lg border border-[#d9c9ad] bg-white/70 px-3 py-1 text-xs font-semibold hover:bg-white">
              {label}
            </button>
          ))}
        </div>
        {!dateOk && (
          <p role="alert" className="mt-1.5 text-sm text-[#a23b2a]">
            {tl("Escolha uma data e uma hora no futuro.")}
          </p>
        )}
        <p className="mt-2 flex gap-2 rounded-xl border border-[#ecd49a] bg-[#fff6dd] px-3 py-2.5 text-sm text-[#6b5440]">
          <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-[#c8921c]" fill="currentColor" aria-hidden>
            <path d="M7 10V8a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
          </svg>
          {tl("A carta ficará fechada até a data selecionada. Depois disso, ela será aberta automaticamente.")}
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-semibold">{tl("Dentro da carta (opcional)")}</legend>
        <Attach label={tl("Foto")} chosen={photo ? <span className="block h-14 w-14 overflow-hidden rounded-lg bg-black/10">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photo.url} alt="" className="size-full object-cover" /></span> : null} onRemove={() => { drop(photo?.url); setPhoto(null); }}>
          <label className={fileBtn}>
            {tl("Adicionar foto")}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </Attach>
        <Attach label={tl("Vídeo")} chosen={video ? <video src={video.url} controls playsInline preload="metadata" className="max-h-24 rounded-lg bg-black" /> : null} onRemove={() => { drop(video?.url); setVideo(null); }}>
          <label className={fileBtn}>
            {tl("Adicionar vídeo")}
            <input type="file" accept="video/*" className="sr-only" onChange={(e) => { void pickVideo(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <p className="mt-1 text-xs text-[#6b5440]">{tx("m_ateSegundosVideosGrandesSao", { v0: MAX_VIDEO_SEC })}</p>
        </Attach>
        <Attach label={tl("Áudio")} chosen={voice ? <audio src={voice.url} controls preload="metadata" className="h-9 w-full" /> : null} onRemove={() => { drop(voice?.url); setVoice(null); }}>
          {recording ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#e0a8a0] bg-[#fdecea] px-3 py-2">
              <span aria-hidden className="size-3 animate-pulse rounded-full bg-[#d6281d]" />
              <span role="timer" className="font-mono text-sm font-semibold">
                {mmss(elapsed)} / {mmss(MAX_VOICE_SEC)}
              </span>
              <button type="button" onClick={stopRec} className={`${darkBtn} ml-auto`}>
                {tx("parar")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {canRecord && (
                <button type="button" onClick={() => void startRec()} className={darkBtn}>
                  <span aria-hidden className="size-2.5 rounded-full bg-[#ff5a4d]" />
                  {tl("Gravar")}
                </button>
              )}
              <label className={fileBtn}>
                {canRecord ? tl("ou escolher um arquivo") : tl("Adicionar áudio")}
                <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { pickAudio(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            </div>
          )}
          <p className="mt-1 text-xs text-[#6b5440]">{tx("x_ateSegundos", { v0: MAX_VOICE_SEC })}</p>
        </Attach>
      </fieldset>

      {progress !== null && (
        <div role="status" aria-live="polite" className="rounded-xl border border-[#d9c9ad] bg-white/70 p-3 text-sm">
          <p className="font-semibold">{tx("x_otimizandoOVideo", { v0: Math.round(progress * 100) })}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e1d3ba]">
            <div className="h-full rounded-full bg-[#d98a2b] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-[#6b5440]">{tx("fiqueNestaTelaLevaMais")}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#a23b2a]">
          {error}
        </p>
      )}
    </div>
  );
}
