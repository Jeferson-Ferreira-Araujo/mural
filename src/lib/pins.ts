import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnerPin } from "@/components/board/PinsManager";
import type { SendPayload } from "@/components/composer/types";
import type { MuralRef } from "./mural";
import type { BoardItem } from "./types";

/** Lê o quadro do mural (precisa do token de desbloqueio). Cápsula fechada chega sem conteúdo. null = sem acesso. */
export async function fetchBoard(sb: SupabaseClient, ref: MuralRef, token: string | null): Promise<BoardItem[] | null> {
  const { data, error } = await sb.rpc("get_board", { p_nick: ref.nick, p_slug: ref.slug, p_token: token });
  if (error || !Array.isArray(data)) return null;
  return data as BoardItem[];
}

export type SendFailure = "cooldown" | "pending_exists" | "not_authenticated" | "blocked" | "too_many_pending" | "plan_limit" | "slot_taken" | "rate_limited" | "not_unlocked" | "format_not_allowed" | "upload_failed" | "error";
export type SendResult = { ok: true } | { ok: false; reason: SendFailure };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-m4a": "m4a", "audio/aac": "aac",
};

/** Sobe o arquivo (foto, vídeo ou voz) para o armazenamento e devolve o endereço público. O caminho começa com o token de desbloqueio. */
async function uploadMedia(sb: SupabaseClient, token: string, blobUrl: string): Promise<string> {
  const blob = await (await fetch(blobUrl)).blob();
  const type = blob.type.split(";")[0].trim().toLowerCase();
  const ext = EXT[type];
  if (!ext) throw new Error("tipo de arquivo não aceito");
  const path = `${token}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("pin-media").upload(path, blob, { contentType: type, cacheControl: "31536000" });
  if (error) throw error;
  return sb.storage.from("pin-media").getPublicUrl(path).data.publicUrl;
}

/** Cola um pin no espaço escolhido. O servidor valida tudo de novo (token, plano, limite, espaço livre, formatos). */
export async function sendPin(sb: SupabaseClient, ref: MuralRef, token: string, payload: SendPayload): Promise<SendResult> {
  const { type, ...content } = payload.message as Record<string, unknown> & { type: string };
  try {
    if (typeof content.src === "string" && content.src.startsWith("blob:")) content.src = await uploadMedia(sb, token, content.src);
  } catch {
    return { ok: false, reason: "upload_failed" };
  }
  const { error } = await sb.rpc("send_message", {
    p_nick: ref.nick,
    p_slug: ref.slug,
    p_token: token,
    p_slot: payload.slot,
    p_type: type,
    p_content: content,
    p_opens_at: payload.capsuleAt ?? null,
    p_signed: payload.signed === true,
  });
  if (!error) return { ok: true };
  const m = error.message;
  const known: SendFailure[] = ["cooldown", "pending_exists", "not_authenticated", "blocked", "too_many_pending", "plan_limit", "slot_taken", "rate_limited", "not_unlocked", "format_not_allowed"];
  const hit = known.find((k) => m.includes(k)) ?? (m.includes("capsule_not_allowed") ? "format_not_allowed" : "error");
  return { ok: false, reason: hit };
}

/** Texto para o visitante, por motivo de falha. */
export const SEND_ERROR_TEXT: Record<SendFailure, string> = {
  cooldown: "Você já deixou um PIN neste mural há pouco. Dá para deixar outro depois de 1 hora.",
  pending_exists: "O último PIN que você deixou neste mural ainda está aguardando a aprovação do dono.",
  not_authenticated: "Entre na sua conta para assinar o pin.",
  blocked: "Não foi possível enviar um pin para este mural.",
  plan_limit: "Este mural chegou ao limite de pins do plano.",
  too_many_pending: "Você já tem pins aguardando aprovação neste mural. Espere o dono aprovar para enviar mais.",
  slot_taken: "Alguém acabou de colar um pin nesse espaço. Escolha outro.",
  rate_limited: "Você colou muitos pins agora há pouco. Tente de novo daqui a pouco.",
  not_unlocked: "Responda a pergunta de novo para continuar.",
  format_not_allowed: "Esse formato não está liberado neste mural.",
  upload_failed: "Não foi possível enviar o arquivo. Tente de novo.",
  error: "Não foi possível colar o pin agora. Tente de novo.",
};

// ---------- dono do mural ----------

/** Todos os pins do mural (pendentes e aprovados), com conteúdo. Só o dono consegue. */
export async function listOwnerPins(sb: SupabaseClient, muralId: string): Promise<OwnerPin[] | null> {
  const { data, error } = await sb.rpc("list_owner_pins", { p_mural_id: muralId });
  if (error || !Array.isArray(data)) return null;
  return data as OwnerPin[];
}

/** Aprova (opcionalmente já em blur, no PLUS) ou recusa/remove (apaga e libera o espaço). */
export async function moderatePin(sb: SupabaseClient, id: string, approve: boolean, hidden = false): Promise<boolean> {
  const { error } = await sb.rpc("moderate_pin", { p_id: id, p_approve: approve, p_hidden: hidden });
  return !error;
}

/** PLUS: deixa um pin visível ou em blur para quem visita. */
export async function setPinHidden(sb: SupabaseClient, id: string, hidden: boolean): Promise<boolean> {
  const { error } = await sb.rpc("set_pin_hidden", { p_id: id, p_hidden: hidden });
  return !error;
}

/** Relata um pin como abuso/assédio: guarda a prova, remove do mural e (opcional) bloqueia quem enviou. */
export async function reportPin(sb: SupabaseClient, id: string, reason: string, details: string, block: boolean): Promise<boolean> {
  const { error } = await sb.rpc("report_pin", { p_id: id, p_reason: reason, p_details: details || null, p_block: block });
  return !error;
}

// ---------- 1 pin por hora, por visitante e por mural ----------

export type SendStatus = { can: boolean; reason?: "pending" | "cooldown" | "not_unlocked" | "not_found"; retryAfter?: number };

export async function getSendStatus(sb: SupabaseClient, ref: MuralRef, token: string | null): Promise<SendStatus | null> {
  const { data, error } = await sb.rpc("get_send_status", { p_nick: ref.nick, p_slug: ref.slug, p_token: token });
  return error || !data ? null : (data as SendStatus);
}

const wait = (secs: number) => {
  const min = Math.max(1, Math.ceil(secs / 60));
  return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`;
};

/** Texto para quem tentou deixar um novo pin antes da hora (ou com o anterior ainda em aprovação). null = pode enviar. */
export function sendBlockedText(s: SendStatus | null): string | null {
  if (!s || s.can) return null;
  if (s.reason === "pending") {
    return `O último PIN que você deixou neste mural ainda está aguardando a aprovação do dono. Você poderá deixar um novo depois que ele for aprovado, desde que já tenha passado 1 hora do envio anterior.${s.retryAfter ? ` Ainda faltam cerca de ${wait(s.retryAfter)} do envio anterior para completar 1 hora.` : ""}`;
  }
  if (s.reason === "cooldown") return `Você já deixou um PIN neste mural há pouco. Dá para deixar outro daqui a ${wait(s.retryAfter ?? 3600)} (1 hora entre um PIN e outro).`;
  return null;
}
