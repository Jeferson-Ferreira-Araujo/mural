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

/** Mural trancado: como ele está montado (espaços, tipos e estilos, SEM conteúdo), para servir de fundo borrado. */
export async function fetchLockedLayout(sb: SupabaseClient, ref: MuralRef): Promise<BoardItem[]> {
  const { data, error } = await sb.rpc("get_locked_layout", { p_nick: ref.nick, p_slug: ref.slug });
  return error || !Array.isArray(data) ? [] : (data as BoardItem[]);
}

export type SendFailure = "cooldown" | "pending_exists" | "not_authenticated" | "blocked" | "too_many_pending" | "plan_limit" | "slot_taken" | "rate_limited" | "not_unlocked" | "format_not_allowed" | "upload_failed" | "inappropriate" | "error";
export type SendResult = { ok: true } | { ok: false; reason: SendFailure };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-m4a": "m4a", "audio/aac": "aac",
};

/** Sobe o arquivo (foto, vídeo ou voz) para o armazenamento e devolve o endereço público. O caminho começa com o token de desbloqueio. */
async function uploadMedia(sb: SupabaseClient, folder: string, blobUrl: string): Promise<{ url: string; path: string }> {
  const blob = await (await fetch(blobUrl)).blob();
  const type = blob.type.split(";")[0].trim().toLowerCase();
  const ext = EXT[type];
  if (!ext) throw new Error("tipo de arquivo não aceito");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("pin-media").upload(path, blob, { contentType: type, cacheControl: "31536000" });
  if (error) throw error;
  return { url: sb.storage.from("pin-media").getPublicUrl(path).data.publicUrl, path };
}

class InappropriateImage extends Error {}

/** Foto e desenho passam pelo detector de nudez do servidor; só com a aprovação assinada o banco aceita o pin. */
async function verifyImage(sb: SupabaseClient, path: string): Promise<{ exp: number; sig: string }> {
  const { data: s } = await sb.auth.getSession();
  const res = await fetch("/api/pin/verify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` }, body: JSON.stringify({ path }) });
  if (res.status === 422 && ((await res.json().catch(() => null)) as { error?: string } | null)?.error === "nsfw") throw new InappropriateImage();
  if (!res.ok) throw new Error("verificação indisponível");
  return (await res.json()) as { exp: number; sig: string };
}

/** Cola um pin no espaço escolhido. O servidor valida tudo de novo (token, plano, limite, espaço livre, formatos). */
/** `token` = desbloqueio do visitante; o DONO (token null) envia pela própria conta e a mídia vai para a pasta com o id dele (`ownerFolder`). */
export async function sendPin(sb: SupabaseClient, ref: MuralRef, token: string | null, payload: SendPayload, ownerFolder?: string): Promise<SendResult> {
  const { type, ...content } = payload.message as Record<string, unknown> & { type: string };
  try {
    if (typeof content.src === "string" && content.src.startsWith("blob:")) {
      const up = await uploadMedia(sb, token ?? ownerFolder ?? "", content.src);
      content.src = up.url;
      if (type === "photo" || type === "draw" || type === "video") content.approval = await verifyImage(sb, up.path);
    }
  } catch (e) {
    return { ok: false, reason: e instanceof InappropriateImage ? "inappropriate" : "upload_failed" };
  }
  const { error } = await sb.rpc("send_message", {
    p_nick: ref.nick,
    p_slug: ref.slug,
    p_token: token,
    p_slot: payload.slot,
    p_type: type,
    p_content: content,
    p_opens_at: payload.capsuleAt ?? null,
    p_signed: true,
    p_ox: payload.place?.ox ?? 0,
    p_oy: payload.place?.oy ?? 0,
    p_cov: payload.place?.cov ?? [],
  });
  if (!error) return { ok: true };
  const m = error.message;
  const known: SendFailure[] = ["cooldown", "pending_exists", "not_authenticated", "blocked", "too_many_pending", "plan_limit", "slot_taken", "rate_limited", "not_unlocked", "format_not_allowed"];
  const hit = known.find((k) => m.includes(k)) ?? (m.includes("capsule_not_allowed") || m.includes("format_disabled") ? "format_not_allowed" : "error");
  return { ok: false, reason: hit };
}

/** Texto para o visitante, por motivo de falha. */
export const SEND_ERROR_TEXT: Record<SendFailure, string> = {
  cooldown: "Você já deixou 3 PINs neste mural nos últimos 30 minutos. Tente de novo daqui a pouco.",
  pending_exists: "O último PIN que você deixou neste mural ainda está aguardando a aprovação do dono.",
  not_authenticated: "Crie uma conta ou entre para publicar um pin.",
  blocked: "Não foi possível enviar um pin para este mural.",
  plan_limit: "Este mural chegou ao limite de pins do plano.",
  too_many_pending: "Você já tem pins aguardando aprovação neste mural. Espere o dono aprovar para enviar mais.",
  slot_taken: "Alguém acabou de colar um pin nesse espaço. Escolha outro.",
  rate_limited: "Você colou muitos pins agora há pouco. Tente de novo daqui a pouco.",
  not_unlocked: "Responda a pergunta de novo para continuar.",
  format_not_allowed: "Esse formato não está disponível no momento.",
  upload_failed: "Não foi possível enviar o arquivo. Tente de novo.",
  inappropriate: "Esse arquivo não pode ser publicado: ele parece conter conteúdo impróprio.",
  error: "Não foi possível colar o pin agora. Tente de novo.",
};

// ---------- dono do mural ----------

/** Todos os pins do mural (pendentes e aprovados), com conteúdo. Só o dono consegue. */
export async function listOwnerPins(sb: SupabaseClient, muralId: string): Promise<OwnerPin[] | null> {
  const { data, error } = await sb.rpc("list_owner_pins", { p_mural_id: muralId });
  if (error || !Array.isArray(data)) return null;
  return data as OwnerPin[];
}

/** Edita título e itens de uma lista. O servidor só aceita o dono do mural ou quem criou o pin. */
export async function updateListPin(sb: SupabaseClient, id: string, title: string, items: { text: string; done: boolean }[]): Promise<boolean> {
  const { error } = await sb.rpc("update_list_pin", { p_id: id, p_title: title, p_items: items });
  return !error;
}

/** Aprova (opcionalmente já em blur, no PINZ+) ou recusa/remove (apaga e libera o espaço). */
export async function moderatePin(sb: SupabaseClient, id: string, approve: boolean, hidden = false): Promise<boolean> {
  const { error } = await sb.rpc("moderate_pin", { p_id: id, p_approve: approve, p_hidden: hidden });
  return !error;
}

/** PINZ+: deixa um pin visível ou em blur para quem visita. */
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

/** Texto para quem já usou os 3 envios dos últimos 30 minutos. null = pode enviar. */
export function sendBlockedText(s: SendStatus | null): string | null {
  if (!s || s.can) return null;
  if (s.reason === "cooldown" || s.reason === "pending") return `Você já deixou 3 PINs neste mural nos últimos 30 minutos. Dá para deixar outro daqui a ${wait(s.retryAfter ?? 1800)}.`;
  return null;
}
