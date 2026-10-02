"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PlayerColor, PostItColor } from "@/lib/types";
import { PLAYER_COLOR_IDS, PLAYER_PALETTE } from "../messages/playerPalette";
import { Field, inputClass } from "../ui";
import type { DraftChange } from "./types";

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
  useEffect(() => onChange(text.trim() ? { type: "postit", color, text: text.trim() } : null), [color, text, onChange]);
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
  useEffect(() => onChange(text.trim() ? { type: "text", variant, text: text.trim() } : null), [variant, text, onChange]);
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
  const max = 6;
  useEffect(() => {
    const filled = items.map((t) => t.trim()).filter(Boolean);
    onChange(title.trim() && filled.length ? { type: "list", title: title.trim(), items: filled.map((text) => ({ text, done: false })) } : null);
  }, [title, items, onChange]);
  return (
    <div className="space-y-4">
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

// ---------- Foto ----------
const MAX_PHOTO_MB = 8;

export function PhotoForm({ onChange }: { onChange: DraftChange }) {
  const [src, setSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<string | null>(null);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return setError(`A foto pode ter até ${MAX_PHOTO_MB} MB.`);
    setError(null);
    if (prev.current) URL.revokeObjectURL(prev.current);
    const url = URL.createObjectURL(file);
    prev.current = url;
    setSrc(url);
  }
  useEffect(() => onChange(src ? { type: "photo", caption: caption.trim(), src } : null), [src, caption, onChange]);

  return (
    <div className="space-y-4">
      <Field label="Foto" hint={`Até ${MAX_PHOTO_MB} MB. Nesta etapa a foto fica só neste navegador (ainda não é enviada).`}>
        {(id) => <input id={id} type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#1f232b] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white" />}
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <Field label="Legenda (opcional)" hint={<Counter value={caption} max={48} />}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={48} placeholder="Ex: Churrasco de 2019" className={inputClass} />}
      </Field>
    </div>
  );
}

// ---------- Música (FULL) ----------
export function MusicForm({ onChange }: { onChange: DraftChange }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");

  const linkOk = !link.trim() || /^https?:\/\/\S+$/i.test(link.trim());
  useEffect(
    () => onChange(title.trim() && artist.trim() && linkOk ? { type: "music", title: title.trim(), artist: artist.trim(), caption: caption.trim(), link: link.trim() || undefined } : null),
    [title, artist, caption, link, linkOk, onChange],
  );
  return (
    <div className="space-y-4">
      <Field label="Nome da música">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={48} placeholder="Ex: Aquela Música" className={inputClass} />}</Field>
      <Field label="Artista">{(id) => <input id={id} value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={40} placeholder="Ex: Charlie Brown Jr." className={inputClass} />}</Field>
      <Field label="Dedicatória (opcional)" hint={<Counter value={caption} max={80} />}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={80} placeholder="Ex: Essa música me lembra a gente!" className={inputClass} />}
      </Field>
      <Field label="Link da música (opcional)" error={linkOk ? null : "Use um link que comece com http:// ou https://"} hint="Spotify, YouTube… O play abre esse link.">
        {(id) => <input id={id} value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" maxLength={300} placeholder="https://" className={inputClass} />}
      </Field>
    </div>
  );
}

// ---------- Vídeo (FULL) ----------
const MAX_VIDEO_MB = 50;

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoForm({ onChange }: { onChange: DraftChange }) {
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | undefined>();
  const [color, setColor] = useState<PlayerColor>("black");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const prev = useRef<string | null>(null);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setError("Escolha um arquivo de vídeo.");
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return setError(`O vídeo pode ter até ${MAX_VIDEO_MB} MB.`);
    setError(null);
    if (prev.current) URL.revokeObjectURL(prev.current);
    const url = URL.createObjectURL(file);
    prev.current = url;
    setDuration(undefined);
    setSrc(url);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => setDuration(Number.isFinite(probe.duration) ? formatDuration(probe.duration) : undefined);
    probe.src = url;
  }
  useEffect(() => onChange(src ? { type: "video", caption: caption.trim(), src, duration, playerColor: color } : null), [src, caption, duration, color, onChange]);

  return (
    <div className="space-y-4">
      <Field label="Vídeo" hint={`Até ${MAX_VIDEO_MB} MB. Nesta etapa o vídeo fica só neste navegador (ainda não é enviado).`}>
        {(id) => <input id={id} type="file" accept="video/*" onChange={(e) => pick(e.target.files?.[0])} className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#1f232b] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white" />}
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Cor do player</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Cor do player">
          {PLAYER_COLOR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={color === id}
              aria-label={PLAYER_PALETTE[id].label}
              title={PLAYER_PALETTE[id].label}
              onClick={() => setColor(id)}
              className={`size-9 cursor-pointer rounded-full border-2 shadow-[inset_0_0.15rem_0.2rem_rgba(255,255,255,.45),0_0.1rem_0.25rem_rgba(0,0,0,.3)] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${color === id ? "scale-110 border-[#2f2218]" : "border-transparent"}`}
              style={{ background: PLAYER_PALETTE[id].swatch }}
            />
          ))}
        </div>
      </fieldset>
      <Field label="Mensagem no papelzinho (opcional)" hint={<><Counter value={caption} max={64} /> · Sem mensagem, aparece só o player.</>}>
        {(id) => <input id={id} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={64} placeholder="Ex: Um dos lugares que mais me fez bem" className={inputClass} />}
      </Field>
    </div>
  );
}
