"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PlayerColor, PostItColor } from "@/lib/types";
import type { HandId, PinColor, TapeColor } from "@/lib/style";
import { PLAYER_COLOR_IDS, PLAYER_PALETTE } from "../messages/playerPalette";
import { Field, inputClass } from "../ui";
import { FontPicker, PinColorPicker, TapeColorPicker } from "./StylePickers";
import type { DraftChange, DraftMessage } from "./types";
import { embedFor } from "@/lib/embed";
import { fetchMusicMeta, type MusicMeta } from "@/lib/music";
import { getBrowserSupabase } from "@/lib/supabase";
import { canCompressVideo, compressVideo, downscalePhoto, MAX_VIDEO_SEC, needsCompression, probeVideo } from "@/lib/media";

/** Nos players (vídeo, música e voz) a mensagem é só uma frase curta: no máximo 2 linhas no papelzinho. */
const PLAYER_NOTE_MAX = 32;

const area = `${inputClass} min-h-[7rem] resize-y`;

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs ${value.length >= max ? "text-[#a23b2a]" : "text-[#8a7b69]"}`}>
      {value.length}/{max}
    </span>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-sm text-[#a23b2a]">
      {children}
    </p>
  );
}

// ---------- Post-it ----------
const POSTIT_COLORS: { id: PostItColor; label: string; bg: string }[] = [
  { id: "yellow", label: "Amarelo", bg: "#fbe36a" },
  { id: "pink", label: "Rosa", bg: "#f7a8c0" },
  { id: "green", label: "Verde", bg: "#b9e08a" },
  { id: "blue", label: "Azul", bg: "#a9d8f0" },
  { id: "orange", label: "Laranja", bg: "#fbbd78" },
];

export function PostItForm({ onChange }: { onChange: DraftChange }) {
  const [color, setColor] = useState<PostItColor>("yellow");
  const [text, setText] = useState("");
  const [font, setFont] = useState<HandId>("caveat");
  const [pin, setPin] = useState<PinColor | null>(null); // null = a tachinha padrão da cor do post-it
  const defaultPin: PinColor = color === "orange" || color === "blue" ? "blue" : "red";
  useEffect(() => onChange({ type: "postit", color, text: text.trim() || "Seu recado aparece aqui", font, ...(pin ? { pin } : {}) }, { empty: !text.trim() }), [color, text, font, pin, onChange]);
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Cor do post-it</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Cor do post-it">
          {POSTIT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={color === c.id}
              aria-label={c.label}
              onClick={() => setColor(c.id)}
              className={`size-9 cursor-pointer rounded-md border-2 shadow-sm transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${color === c.id ? "scale-110 border-[#2f2218]" : "border-transparent"}`}
              style={{ background: c.bg }}
            />
          ))}
        </div>
      </fieldset>
      <PinColorPicker value={pin ?? defaultPin} onChange={setPin} />
      <FontPicker value={font} onChange={setFont} />
      <Field label="Seu recado" hint={<Counter value={text} max={90} />}>
        {(id) => <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} maxLength={90} rows={3} placeholder="Escreva um recado curtinho…" className={area} />}
      </Field>
    </div>
  );
}

// ---------- Texto (papel) ----------
export function TextForm({ onChange }: { onChange: DraftChange }) {
  const [variant, setVariant] = useState<"letter" | "notebook">("letter");
  const [text, setText] = useState("");
  const [font, setFont] = useState<HandId>("caveat");
  const [tape, setTape] = useState<TapeColor>("yellow");
  useEffect(() => onChange({ type: "text", variant, text: text.trim() || "Sua mensagem aparece aqui.", font, tape }, { empty: !text.trim() }), [variant, text, font, tape, onChange]);
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Tipo de papel" className="inline-flex rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {([["letter", "Papel liso"], ["notebook", "Folha de caderno"]] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={variant === v}
            onClick={() => setVariant(v)}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${variant === v ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <TapeColorPicker value={tape} onChange={setTape} />
      <FontPicker value={font} onChange={setFont} />
      <Field label="Sua mensagem" hint={<Counter value={text} max={320} />}>
        {(id) => <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} maxLength={320} rows={6} placeholder="Escreva com calma, é uma folha inteira…" className={area} />}
      </Field>
    </div>
  );
}

// ---------- Lista ----------
export function ListForm({ onChange }: { onChange: DraftChange }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState(["", "", ""]);
  const [font, setFont] = useState<HandId>("caveat");
  const [tape, setTape] = useState<TapeColor>("yellow");
  const max = 3;
  useEffect(() => {
    const filled = items.map((t) => t.trim()).filter(Boolean);
    onChange(
      {
        type: "list",
        title: title.trim() || "Sua lista",
        items: (filled.length ? filled : ["Primeiro item", "Segundo item"]).map((text) => ({ text, done: false })),
        font,
        tape,
      },
      { empty: !(title.trim() && filled.length) },
    );
  }, [title, items, font, tape, onChange]);
  return (
    <div className="space-y-4">
      <TapeColorPicker value={tape} onChange={setTape} />
      <FontPicker value={font} onChange={setFont} />
      <Field label="Título da lista">
        {(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={32} placeholder="Ex: Pra gente fazer:" className={inputClass} />}
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Itens (até {max})</legend>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <input
                value={it}
                onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                maxLength={40}
                aria-label={`Item ${i + 1}`}
                placeholder={`Item ${i + 1}`}
                className={inputClass}
              />
              {items.length > 1 && (
                <button type="button" aria-label={`Remover item ${i + 1}`} onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))} className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl text-[#6b5440] hover:bg-[#efe4cf]">
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        {items.length < max && (
          <button type="button" onClick={() => setItems((arr) => [...arr, ""])} className="mt-2 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
            + Adicionar item
          </button>
        )}
      </fieldset>
    </div>
  );
}

/** Cor do aparelho (vídeo e música). */
function PlayerColorPicker({ value, onChange }: { value: PlayerColor; onChange: (c: PlayerColor) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">Cor do player</legend>
      <div className="flex gap-2" role="radiogroup" aria-label="Cor do player">
        {PLAYER_COLOR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            aria-label={PLAYER_PALETTE[id].label}
            title={PLAYER_PALETTE[id].label}
            onClick={() => onChange(id)}
            className={`size-9 cursor-pointer rounded-full border-2 shadow-[inset_0_0.15rem_0.2rem_rgba(255,255,255,.45),0_0.1rem_0.25rem_rgba(0,0,0,.3)] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${value === id ? "scale-110 border-[#2f2218]" : "border-transparent"}`}
            style={{ background: PLAYER_PALETTE[id].swatch }}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ---------- Foto ----------
const MAX_PHOTO_MB = 8;

export function PhotoForm({ onChange }: { onChange: DraftChange }) {
  const [src, setSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [font, setFont] = useState<HandId>("caveat");
  const [tape, setTape] = useState<TapeColor>("yellow");
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<string | null>(null);

  async function pick(original: File | undefined) {
    if (!original) return;
    if (!original.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    setError(null);
    const file = await downscalePhoto(original); // foto da câmera: reduz sozinha, sem o usuário precisar saber o tamanho
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return setError(`Esta foto ficou grande demais (${(file.size / 1048576).toFixed(0)} MB). Tente outra.`);
    if (prev.current) URL.revokeObjectURL(prev.current);
    const url = URL.createObjectURL(file);
    prev.current = url;
    setSrc(url);
  }
  useEffect(() => onChange({ type: "photo", caption: caption.trim(), ...(src ? { src } : { scene: "hills" as const }), font, tape }, { empty: !src }), [src, caption, font, tape, onChange]);

  return (
    <div className="space-y-4">
      <Field label="Foto">
        {(id) => <input id={id} type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#1f232b] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white" />}
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <TapeColorPicker value={tape} onChange={setTape} />
      <Field label="Legenda (opcional)" hint={<Counter value={caption} max={48} />}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={48} placeholder="Ex: Churrasco de 2019" className={inputClass} />}
      </Field>
      {/* a letra só importa se houver legenda: o seletor aparece depois de digitar */}
      {caption.trim() && <FontPicker value={font} onChange={setFont} />}
    </div>
  );
}

// ---------- Música (PLUS) ----------
export function MusicForm({ onChange }: { onChange: DraftChange }) {
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [color, setColor] = useState<PlayerColor>("black");

  // link, cor do aparelho e mensagem opcional; o nome, o artista e a duração vêm sozinhos do Spotify/YouTube
  const linkOk = /^https?:\/\/\S+$/i.test(link.trim());
  const [meta, setMeta] = useState<MusicMeta | null>(null);
  const [looking, setLooking] = useState(false);
  useEffect(() => {
    setMeta(null);
    if (!linkOk || !embedFor(link.trim())) return setLooking(false);
    let cancelled = false;
    setLooking(true);
    const t = setTimeout(async () => {
      const m = await fetchMusicMeta(link.trim());
      if (cancelled) return;
      setMeta(m);
      setLooking(false);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [link, linkOk]);
  useEffect(
    // sempre manda um rascunho (com a cor escolhida) para a prévia acompanhar; "empty" = ainda falta o link
    () =>
      onChange(
        { type: "music", title: meta?.title ?? "", artist: meta?.artist ?? "", caption: caption.trim(), ...(meta?.duration ? { duration: meta.duration } : {}), ...(linkOk ? { link: link.trim() } : {}), playerColor: color },
        { empty: !linkOk },
      ),
    [caption, link, linkOk, color, meta, onChange],
  );
  return (
    <div className="space-y-4">
      <Field label="Link da música" error={link.trim() && !linkOk ? "Use um link que comece com http:// ou https://" : null} hint={
          looking ? "Buscando o nome e a duração…" : meta ? `Encontrada: ${meta.title}${meta.artist ? ` · ${meta.artist}` : ""}${meta.duration ? ` · ${meta.duration}` : ""}` : "Spotify e YouTube tocam aqui mesmo no mural (com nome e duração); outros links abrem em outra aba."
        }>
        {(id) => <input id={id} value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" maxLength={300} placeholder="https://" className={inputClass} />}
      </Field>
      <PlayerColorPicker value={color} onChange={setColor} />
      <Field label="Mensagem (opcional)" hint={<><Counter value={caption} max={PLAYER_NOTE_MAX} /> · Sem mensagem, aparece só o aparelho.</>}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={PLAYER_NOTE_MAX} placeholder="Ex: Essa música me lembra a gente!" className={inputClass} />}
      </Field>
    </div>
  );
}

// ---------- Vídeo (PLUS) ----------
const MAX_VIDEO_MB = 40; // depois de otimizado (o armazenamento aceita até 50 MB)

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoForm({ onChange }: { onChange: DraftChange }) {
  const [mode, setMode] = useState<"file" | "youtube">("file");
  const [link, setLink] = useState("");
  const ytOk = embedFor(link)?.provider === "youtube";
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | undefined>();
  const [color, setColor] = useState<PlayerColor>("black");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null); // 0..1 enquanto o vídeo é otimizado
  const [note, setNote] = useState<string | null>(null);
  const prev = useRef<string | null>(null);

  async function pick(original: File | undefined) {
    if (!original) return;
    if (!original.type.startsWith("video/")) return setError("Escolha um arquivo de vídeo.");
    setError(null);
    setNote(null);
    setSrc(null);
    let file = original;
    let secs: number | undefined;
    try {
      const info = await probeVideo(original);
      secs = Number.isFinite(info.duration) ? info.duration : undefined;
      if (secs && secs > MAX_VIDEO_SEC) return setError(`O vídeo pode ter até ${MAX_VIDEO_SEC} segundos (este tem ${formatDuration(secs)}). Corte um trecho e tente de novo.`);
      if (needsCompression(original, info)) {
        if (canCompressVideo()) {
          // vídeos de celular são enormes: reduz aqui mesmo (resolução menor, qualidade boa) antes de enviar
          setProgress(0);
          file = await compressVideo(original, setProgress);
          setProgress(null);
          if (file !== original) setNote(`Vídeo otimizado: de ${mb(original.size)} para ${mb(file.size)}.`);
        } else if (original.size > MAX_VIDEO_MB * 1024 * 1024) {
          return setError(`Este vídeo tem ${mb(original.size)} e seu navegador não consegue reduzi-lo. Use o Chrome, ou grave um vídeo mais curto (até ${MAX_VIDEO_MB} MB).`);
        }
      }
    } catch {
      setProgress(null);
      if (original.size > MAX_VIDEO_MB * 1024 * 1024) return setError("Não foi possível reduzir este vídeo. Tente um mais curto ou em outra resolução.");
    }
    setProgress(null);
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return setError(`Mesmo reduzido, o vídeo ficou com ${mb(file.size)} (o limite é ${MAX_VIDEO_MB} MB). Tente um vídeo mais curto.`);
    if (prev.current) URL.revokeObjectURL(prev.current);
    const url = URL.createObjectURL(file);
    prev.current = url;
    setDuration(secs ? formatDuration(secs) : undefined);
    setSrc(url);
  }
  useEffect(
    () =>
      mode === "youtube"
        ? onChange({ type: "video", caption: caption.trim(), ...(ytOk ? { link: link.trim() } : {}), playerColor: color }, { empty: !ytOk })
        : onChange({ type: "video", caption: caption.trim(), ...(src ? { src, duration } : {}), playerColor: color }, { empty: !src }),
    [mode, link, ytOk, src, caption, duration, color, onChange],
  );

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Origem do vídeo" className="inline-flex rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
        {([["file", "Enviar arquivo"], ["youtube", "Link do YouTube"]] as const).map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${mode === v ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === "youtube" ? (
        <Field label="Link do vídeo no YouTube" error={link.trim() && !ytOk ? "Use um link do YouTube, como https://youtu.be/… ou https://www.youtube.com/watch?v=…" : null} hint="O vídeo toca aqui mesmo, no player do mural.">
          {(id) => <input id={id} value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" maxLength={200} placeholder="https://www.youtube.com/watch?v=…" className={inputClass} />}
        </Field>
      ) : (
        <Field label="Vídeo" hint={`Até ${MAX_VIDEO_SEC} segundos. Vídeos grandes são otimizados aqui mesmo, antes de enviar.`}>
          {(id) => <input id={id} type="file" accept="video/*" onChange={(e) => pick(e.target.files?.[0])} className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#1f232b] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white" />}
        </Field>
      )}
      {progress !== null && (
        <div role="status" aria-live="polite" className="rounded-xl border border-[#d9c9ad] bg-white/70 p-3 text-sm">
          <p className="font-semibold">Otimizando o vídeo… {Math.round(progress * 100)}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e1d3ba]">
            <div className="h-full rounded-full bg-[#d98a2b] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-[#6b5440]">Fique nesta tela: leva mais ou menos o tempo do vídeo.</p>
        </div>
      )}
      {note && <p role="status" className="text-sm text-[#2f6a3c]">{note}</p>}
      {error && <ErrorText>{error}</ErrorText>}
      <PlayerColorPicker value={color} onChange={setColor} />
      <Field label="Mensagem curta no papelzinho (opcional)" hint={<><Counter value={caption} max={PLAYER_NOTE_MAX} /> · Sem mensagem, aparece só o player.</>}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={PLAYER_NOTE_MAX} placeholder="Ex: Um lugar que me fez bem" className={inputClass} />}
      </Field>
    </div>
  );
}

// ---------- Voz (PLUS) ----------
const MAX_VOICE_SEC = 60;
const MAX_AUDIO_MB = 10;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Mensagem de voz: grava pelo microfone (até 60 s) ou escolhe um arquivo de áudio.
 *
 */
export function VoiceForm({ onChange }: { onChange: DraftChange }) {
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | undefined>();
  const [caption, setCaption] = useState("");
  const [color, setColor] = useState<PlayerColor>("cream");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const prevUrl = useRef<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const seconds = useRef(0);

  const canRecord = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  function replaceAudio(url: string, dur?: string) {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    prevUrl.current = url;
    setSrc(url);
    setDuration(dur);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function start() {
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
        if (blob.size > 0) replaceAudio(URL.createObjectURL(blob), mmss(Math.max(seconds.current, 1)));
      };
      recorder.current = mr;
      seconds.current = 0;
      setElapsed(0);
      mr.start();
      setRecording(true);
      timer.current = setInterval(() => {
        seconds.current += 1;
        setElapsed(seconds.current);
        if (seconds.current >= MAX_VOICE_SEC) stop();
      }, 1000);
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(denied ? "Permita o uso do microfone para gravar." : "Não foi possível usar o microfone. Você pode escolher um arquivo de áudio.");
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("audio/")) return setError("Escolha um arquivo de áudio.");
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) return setError(`O áudio pode ter até ${MAX_AUDIO_MB} MB.`);
    setError(null);
    const url = URL.createObjectURL(file);
    replaceAudio(url);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => setDuration(Number.isFinite(probe.duration) ? mmss(probe.duration) : undefined);
    probe.src = url;
  }

  useEffect(() => onChange({ type: "voice", caption: caption.trim(), ...(src ? { src, duration } : {}), playerColor: color }, { empty: !src }), [src, caption, duration, color, onChange]);

  // ao fechar: solta o microfone e a URL do áudio
  useEffect(
    () => () => {
      clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-semibold">Sua voz</p>
        {recording ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#e0a8a0] bg-[#fdecea] px-4 py-3">
            <span aria-hidden className="size-3 animate-pulse rounded-full bg-[#d6281d]" />
            <span role="timer" className="font-mono text-sm font-semibold">
              {mmss(elapsed)} / {mmss(MAX_VOICE_SEC)}
            </span>
            <button type="button" onClick={stop} className="ml-auto cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c313b]">
              Parar
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {canRecord && (
              <button type="button" onClick={start} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f232b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c313b]">
                <span aria-hidden className="size-2.5 rounded-full bg-[#ff5a4d]" />
                {src ? "Gravar de novo" : "Gravar"}
              </button>
            )}
            <label className="cursor-pointer rounded-xl border border-[#d9c9ad] px-4 py-2.5 text-sm font-semibold text-[#4a3826] hover:bg-[#efe4cf] focus-within:outline-2 focus-within:outline-[#d98a2b]">
              {canRecord ? "ou escolher um arquivo" : "Escolher um arquivo de áudio"}
              <input type="file" accept="audio/*" onChange={(e) => pickFile(e.target.files?.[0])} className="sr-only" />
            </label>
          </div>
        )}
        <p className="mt-1.5 text-sm text-[#6b5440]">Até {MAX_VOICE_SEC} segundos.</p>
        {error && <ErrorText>{error}</ErrorText>}
      </div>

      <PlayerColorPicker value={color} onChange={setColor} />

      <Field label="Mensagem curta no papelzinho (opcional)" hint={<><Counter value={caption} max={PLAYER_NOTE_MAX} /> · Sem mensagem, aparece só o aparelho.</>}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={PLAYER_NOTE_MAX} placeholder="Ex: Sua voz sempre me faz sorrir!" className={inputClass} />}
      </Field>
    </div>
  );
}

// ---------- Local / Maps (PLUS) ----------
type PlaceHit = { name: string; address: string; lat: number; lon: number };

/** Busca de lugares pelo nome (Google Places, pelo nosso servidor: só para quem está logado). Só roda quando a pessoa pede. */
async function searchPlaces(q: string): Promise<PlaceHit[]> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not_authenticated");
  const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("search failed");
  const body = (await res.json()) as { places?: PlaceHit[] };
  return (body.places ?? []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

/** Escolhe um lugar buscando pelo nome; o resultado vira um mini aparelho de mapa. */
export function PlaceForm({ onChange }: { onChange: DraftChange }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [place, setPlace] = useState<PlaceHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [color, setColor] = useState<PlayerColor>("silver");

  async function search() {
    const q = query.trim();
    if (q.length < 3) return setError("Digite pelo menos 3 letras do nome do lugar.");
    setError(null);
    setSearching(true);
    try {
      setHits(await searchPlaces(q));
      setSearched(true);
    } catch {
      setError("Não foi possível buscar agora. Tente de novo em instantes.");
    } finally {
      setSearching(false);
    }
  }

  useEffect(
    () =>
      onChange(
        place
          ? { type: "place", name: place.name, address: place.address, lat: place.lat, lon: place.lon, caption: caption.trim(), playerColor: color }
          : ({ type: "place", name: "Nome do lugar", address: "", lat: 0, lon: 0, caption: caption.trim(), playerColor: color, blank: true } as unknown as DraftMessage),
        { empty: !place },
      ),
    [place, caption, color, onChange],
  );

  return (
    <div className="space-y-4">
      {place ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e1d3ba] bg-white/60 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{place.name}</p>
            {place.address && <p className="truncate text-sm text-[#6b5440]">{place.address}</p>}
          </div>
          <button type="button" onClick={() => setPlace(null)} className="shrink-0 cursor-pointer text-sm font-semibold text-[#6b5440] underline">
            Trocar
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor="place-q" className="mb-1.5 block text-sm font-semibold">
            Qual lugar?
          </label>
          <div className="flex gap-2">
            <input
              id="place-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void search();
                }
              }}
              placeholder="Ex: Cristo Redentor, Rio de Janeiro"
              className={inputClass}
              maxLength={100}
              autoComplete="off"
            />
            <button type="button" onClick={() => void search()} disabled={searching} className="shrink-0 cursor-pointer rounded-xl bg-[#1f232b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c313b] disabled:opacity-60">
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          {searched && hits.length === 0 && !error && <p className="mt-2 text-sm text-[#6b5440]">Nenhum lugar encontrado. Tente incluir a cidade.</p>}
          {hits.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5" aria-label="Resultados">
              {hits.map((h, i) => (
                <li key={`${h.lat},${h.lon},${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlace(h);
                      setHits([]);
                    }}
                    className="w-full cursor-pointer rounded-xl border border-[#e1d3ba] bg-white/60 px-3.5 py-2.5 text-left transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-[#d98a2b]"
                  >
                    <span className="block truncate text-sm font-semibold">{h.name}</span>
                    <span className="block truncate text-xs text-[#6b5440]">{h.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <PlayerColorPicker value={color} onChange={setColor} />

      <Field label="Mensagem curta no papelzinho (opcional)" hint={<Counter value={caption} max={PLAYER_NOTE_MAX} />}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={PLAYER_NOTE_MAX} placeholder="Ex: Um lugar que mais amo!" className={inputClass} />}
      </Field>
    </div>
  );
}
