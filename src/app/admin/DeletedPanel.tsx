"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";

type Row = { id: string; email: string | null; nickname: string | null; deletedAt: string; expiresAt: string; murals: number; pins: number };

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

const ERRORS: Record<string, string> = {
  email_taken: "Já existe uma conta com esse e-mail. Exclua-a ou use outro e-mail antes de restaurar.",
  nickname_taken: "O nome de usuário já foi usado por outra conta.",
};

/** Usuários excluídos pelo administrador: ficam 7 dias guardados e podem ser restaurados (dados, murais, pins e arquivos). */
export function DeletedPanel({ onToast, onRestored }: { onToast: (t: string) => void; onRestored: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const token = async () => (await getBrowserSupabase().auth.getSession()).data.session?.access_token ?? "";
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/deleted-users", { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { rows?: Row[] } | null;
    setRows(d?.rows ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function restore(r: Row) {
    if (busy || !window.confirm(`Restaurar @${r.nickname ?? "?"}? A pessoa volta com tudo e entra de novo por "esqueci minha senha".`)) return;
    setBusy(r.id);
    const res = await fetch("/api/admin/restore-user", {
      method: "POST",
      headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ backupId: r.id }),
    }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(null);
    if (res?.ok) {
      onToast(`@${r.nickname ?? "usuário"} restaurado.`);
      onRestored();
      void load();
    } else onToast(ERRORS[d?.error ?? ""] ?? "Não foi possível restaurar agora.");
  }

  return (
    <section className="mt-4" aria-label="Excluídos">
      <p className="text-xs text-[#6b5440]">Usuários excluídos pelo administrador ficam guardados por 7 dias (dados e arquivos). Depois disso, somem de vez.</p>
      {!rows ? (
        <div className="py-8">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6b5440]">Nenhum usuário excluído nos últimos 7 dias.</p>
      ) : (
        <div className="mt-3 overflow-auto rounded-2xl border border-[#e1d3ba] bg-white/70">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-[#f1e6cf] text-[11px] tracking-wide text-[#6b5440] uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Usuário</th>
                <th className="px-3 py-2 font-semibold">E-mail</th>
                <th className="px-3 py-2 text-right font-semibold">Murais</th>
                <th className="px-3 py-2 text-right font-semibold">Pins</th>
                <th className="px-3 py-2 font-semibold">Excluído em</th>
                <th className="px-3 py-2 font-semibold">Vence em</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eadfc8]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-semibold">@{r.nickname ?? "?"}</td>
                  <td className="max-w-[14rem] truncate px-3 py-2 text-[#6b5440]">{r.email}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.murals}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.pins}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#6b5440]">{fmt(r.deletedAt)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#6b5440]">{daysLeft(r.expiresAt)} dia(s)</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" disabled={busy === r.id} onClick={() => void restore(r)} className="cursor-pointer rounded-lg bg-[#1f232b] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                      {busy === r.id ? "Restaurando…" : "Restaurar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
