import { zipSync, strToU8 } from "fflate";
import { getBrowserSupabase } from "@/lib/supabase";

/** Endereços de arquivos do próprio Pinz (fotos, desenhos, vozes…) que aparecem dentro do conteúdo dos pins. */
function mediaUrls(value: unknown, out: Set<string>) {
  if (typeof value === "string") {
    if (/^https:\/\/[^/]+\/storage\/v1\/object\/(public|sign)\//.test(value)) out.add(value);
  } else if (Array.isArray(value)) value.forEach((v) => mediaUrls(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => mediaUrls(v, out));
}

const extOf = (url: string) => (/\.([a-z0-9]{2,5})(?:\?|$)/i.exec(url)?.[1] ?? "bin").toLowerCase();

export type BackupResult = { ok: true; blob: Blob; name: string; files: number; missing: number } | { ok: false; reason: "mfa" | "error" };

/**
 * Backup do mural: um ZIP com o mural.json (pins, displays e bottons) e a pasta "midia" com as fotos, desenhos e áudios dos pins.
 * Arquivos que não puderem ser baixados continuam com o endereço no JSON. `onProgress` recebe (feitos, total).
 */
export async function backupMural(muralId: string, onProgress?: (done: number, total: number) => void): Promise<BackupResult> {
  const { data, error } = await getBrowserSupabase().rpc("export_mural", { p_mural_id: muralId });
  if (error || !data) return { ok: false, reason: error?.message.includes("mfa_required") ? "mfa" : "error" };
  const doc = data as { mural: { endereco: string }; pins: { conteudo: unknown }[] } & Record<string, unknown>;
  const urls = new Set<string>();
  doc.pins.forEach((p) => mediaUrls(p.conteudo, urls));
  const list = [...urls];
  const files: Record<string, Uint8Array> = {};
  const map: Record<string, string> = {};
  let done = 0;
  let missing = 0;
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      const url = list[i];
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(String(r.status));
        const path = `midia/${String(i + 1).padStart(3, "0")}.${extOf(url)}`;
        files[path] = new Uint8Array(await r.arrayBuffer());
        map[url] = path;
      } catch {
        missing++;
      }
      onProgress?.(++done, list.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, list.length) }, worker));
  files["mural.json"] = strToU8(JSON.stringify({ ...doc, arquivos: map }, null, 2));
  const zip = zipSync(files, { level: 1 });
  const day = new Date().toISOString().slice(0, 10);
  return { ok: true, blob: new Blob([zip as BlobPart], { type: "application/zip" }), name: `pinz-backup-${doc.mural.endereco}-${day}.zip`, files: list.length - missing, missing };
}
