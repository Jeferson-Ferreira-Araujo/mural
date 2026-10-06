"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/account/Modal";
import { BadgeProvider } from "@/components/badges/BadgeContext";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { MessageView } from "@/components/messages/MessageView";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { loginUrl, useSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import type { BoardItem, Message } from "@/lib/types";
import type { PlacedBadge } from "@/lib/badges";

type MuralLite = { id: string; slug: string; title: string; plan: "free" | "full"; private: boolean };
type UserRow = { id: string; email: string; nickname: string; createdAt: string; lastSignIn: string | null; credits: number; banned: boolean; isAdmin: boolean; murals: MuralLite[]; pinsReceived: number; pinsSent: number };
type UserDetail = Omit<UserRow, "murals" | "pinsReceived"> & { banReason: string | null; bannedAt: string | null; reportsAgainst: number; murals: (MuralLite & { pins: number; pending: number; badges: number })[]; ledger: { delta: number; reason: string; at: string }[] };
type PinRow = { id: string; slot: number; type: string; content: Record<string, unknown>; status: "pending" | "approved"; signed: boolean; hidden: boolean; createdAt: string; opensAt: string | null; authorId: string | null; author: string | null; authorEmail: string | null; visitor: string | null };
type MuralPins = { mural: MuralLite & { question: string; owner: string; ownerId: string; board: string; welcome: string | null }; badges: PlacedBadge[]; pins: PinRow[] };
type Report = { id: string; createdAt: string; reason: string; details: string | null; blocked: boolean; type: string; content: Record<string, unknown>; mural: string | null; owner: string | null; senderId: string | null; sender: string | null; senderBanned: boolean };

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const btn = "cursor-pointer rounded-lg border border-[#d9c9ad] bg-white/70 px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf] disabled:cursor-not-allowed disabled:opacity-50";
const primary = "cursor-pointer rounded-lg bg-[#1f232b] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2c313b] disabled:cursor-not-allowed disabled:opacity-50";
const danger = "cursor-pointer rounded-lg bg-[#a23b2a] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#8c3022] disabled:cursor-not-allowed disabled:opacity-50";
const input = "w-full rounded-lg border border-[#d9c9ad] bg-white px-3 py-2 text-sm text-[#2f2218] outline-none focus:ring-2 focus:ring-[#d98a2b]/60";

const sb = () => getBrowserSupabase();
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const { data, error } = await sb().rpc(name, args);
  return error ? { ok: false, error: error.message } : { ok: true, data: data as T };
}

function Tag({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "gold" | "red" | "dark" }) {
  const cls = { plain: "border border-[#d9c9ad] bg-[#f3ead8] text-[#6b5440]", gold: "bg-[#f2c230] text-[#3a2300]", red: "bg-[#a23b2a] text-white", dark: "bg-[#1f232b] text-white" }[tone];
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase ${cls}`}>{children}</span>;
}

/** O mural completo do usuário, como ele aparece no site (com todos os pins, inclusive os pendentes, e os botons). A outra aba lista os pins com o autor. */
function MuralViewer({ muralId, onClose, onBan }: { muralId: string | null; onClose: () => void; onBan: (userId: string, label: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<MuralPins | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async (id: string) => {
    const r = await rpc<MuralPins>("admin_mural_pins", { p_mural_id: id });
    if (r.ok) setData(r.data);
    else setErr("Não foi possível carregar o mural.");
  }, []);
  useEffect(() => {
    setData(null);
    setErr(null);
    setView("board");
    if (muralId) void load(muralId);
  }, [muralId, load]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (muralId && !d.open) d.showModal();
    if (!muralId && d.open) d.close();
  }, [muralId]);

  async function del(id: string) {
    if (!window.confirm("Excluir este pin? Não dá para desfazer.")) return;
    const r = await rpc("admin_delete_pin", { p_id: id });
    if (r.ok && muralId) await load(muralId);
    else if (!r.ok) setErr("Não foi possível excluir.");
  }

  const items: BoardItem[] = (data?.pins ?? []).map(
    (p) =>
      ({
        ...p.content,
        id: p.id,
        slot: p.slot,
        type: p.type,
        pending: p.status === "pending",
        ownerHidden: p.hidden,
        fromCapsule: !!p.opensAt,
        signedBy: p.signed ? (p.author ?? undefined) : undefined,
      }) as unknown as BoardItem,
  );

  return (
    <dialog ref={ref} onClose={onClose} aria-label="Mural do usuário" className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-[#2a1a0e] p-0 text-[#2f2218] backdrop:bg-black/70">
      {muralId && (
        <div className="flex h-dvh flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 bg-[#f2e8d3] px-4 py-2.5 shadow-[0_0.2rem_0.8rem_rgba(0,0,0,.25)]">
            <div className="min-w-0">
              <p className="font-title truncate text-lg font-semibold">{data ? data.mural.title : "Mural"}</p>
              {data && (
                <p className="truncate text-xs text-[#6b5440]">
                  de <strong>{data.mural.owner}</strong> · {data.mural.plan === "full" ? "PLUS" : "FREE"} · {data.mural.private ? `🔒 privado (pergunta: ${data.mural.question})` : "🌐 público"} · {data.pins.length} pins · {data.badges.length} botons ·{" "}
                  <Link href={`/${data.mural.owner}/${data.mural.slug}`} target="_blank" className="underline">
                    abrir no site
                  </Link>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div role="tablist" aria-label="Visualização" className="grid grid-cols-2 rounded-xl border border-[#d9c9ad] bg-white/60 p-0.5">
                {(
                  [
                    ["board", "Mural"],
                    ["list", "Pins e autores"],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} role="tab" type="button" aria-selected={view === id} onClick={() => setView(id)} className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold ${view === id ? "bg-[#1f232b] text-white" : "text-[#4a3826]"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 cursor-pointer place-items-center rounded-lg text-2xl hover:bg-black/5">
                ×
              </button>
            </div>
          </header>
          {err && <p className="bg-[#fbeae5] px-4 py-2 text-sm text-[#a23b2a]">{err}</p>}

          {!data ? (
            <div className="grid flex-1 place-items-center">
              <Spinner />
            </div>
          ) : view === "board" ? (
            <div className="relative min-h-0 flex-1">
              <BadgeProvider editable={false} badges={data.badges} setBadges={() => undefined} notify={() => undefined}>
                <BoardCanvas items={items} plan={data.mural.plan} board={data.mural.board} hasSelection unlocked onCompose={null} />
              </BadgeProvider>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-[#f2e8d3] px-4 py-4">
              {data.pins.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#6b5440]">Nenhum pin neste mural.</p>
              ) : (
                <ul className="mx-auto max-w-3xl space-y-2">
                  {data.pins.map((p) => (
                    <li key={p.id} className="flex gap-3 rounded-xl border border-[#e1d3ba] bg-white/70 p-3">
                      <div className="w-[7.6rem] shrink-0 overflow-hidden pt-2 text-[7px]" aria-hidden>
                        <div inert className="pointer-events-none origin-top-left" style={{ width: "14em" }}>
                          <MessageView message={{ ...p.content, id: p.id, type: p.type, pending: false } as unknown as Message} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">
                          {p.type} · espaço {p.slot + 1} <Tag tone={p.status === "pending" ? "gold" : "plain"}>{p.status === "pending" ? "pendente" : "aprovado"}</Tag> {p.signed && <Tag>assinado</Tag>}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6b5440]">{fmt(p.createdAt)}</p>
                        <p className="mt-1 text-xs break-all text-[#4a3826]">
                          Autor: {p.author ? <strong>{p.author}</strong> : <em>visitante sem conta</em>}
                          {p.authorEmail ? ` (${p.authorEmail})` : ""}
                          {p.visitor ? ` · aparelho ${p.visitor.slice(0, 10)}…` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className={btn} onClick={() => del(p.id)}>
                            Excluir pin
                          </button>
                          {p.authorId && (
                            <button type="button" className={`${btn} !border-[#c0463a]/50 !text-[#a23b2a]`} onClick={() => onBan(p.authorId!, p.author ?? "autor")}>
                              Bloquear autor
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

/** Ficha do usuário: créditos, plano de cada mural, bloqueio e histórico. */
function UserModal({ userId, onClose, onChanged, onOpenMural }: { userId: string | null; onClose: () => void; onChanged: () => void; onOpenMural: (id: string) => void }) {
  const [u, setU] = useState<UserDetail | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const r = await rpc<UserDetail>("admin_user_detail", { p_id: id });
    if (r.ok) setU(r.data);
  }, []);
  useEffect(() => {
    setU(null);
    setMsg(null);
    setAmount("");
    setNote("");
    setReason("");
    if (userId) void load(userId);
  }, [userId, load]);

  async function run(label: string, fn: () => Promise<{ ok: boolean }>) {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: label });
      if (userId) await load(userId);
      onChanged();
    } else setMsg({ ok: false, text: "Não foi possível concluir." });
  }
  const n = Number.parseInt(amount, 10);

  return (
    <Modal open={!!userId} onClose={onClose} title={u ? u.nickname : "Usuário"} wide>
      {!u ? (
        <Spinner />
      ) : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {u.banned ? <Tag tone="red">bloqueado</Tag> : <Tag>ativo</Tag>}
            {u.isAdmin && <Tag tone="dark">admin</Tag>}
          </div>
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-[#e1d3ba] bg-white/60 p-4">
            {(
              [
                ["E-mail", u.email],
                ["Criado em", fmt(u.createdAt)],
                ["Último acesso", fmt(u.lastSignIn)],
                ["Pins enviados", String(u.pinsSent)],
                ["Denúncias contra", String(u.reportsAgainst)],
                ["Créditos", String(u.credits)],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold tracking-wide text-[#8a7b69] uppercase">{k}</dt>
                <dd className="font-semibold break-all">{v}</dd>
              </div>
            ))}
          </dl>

          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-[#2f6a3c]" : "text-[#a23b2a]"}>
              {msg.text}
            </p>
          )}

          <section aria-label="Créditos" className="rounded-2xl border border-[#e1d3ba] bg-white/60 p-4">
            <h3 className="font-title text-base font-semibold">Créditos</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr]">
              <input className={input} type="number" min={1} inputMode="numeric" placeholder="Quantidade" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Quantidade de créditos" />
              <input className={input} placeholder="Motivo (opcional)" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} aria-label="Motivo" />
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" className={primary} disabled={busy || !(n > 0)} onClick={() => run(`+${n} créditos concedidos.`, () => rpc("admin_grant_credits", { p_user_id: u.id, p_delta: n, p_note: note }))}>
                Conceder
              </button>
              <button type="button" className={btn} disabled={busy || !(n > 0)} onClick={() => run(`${n} créditos retirados.`, () => rpc("admin_grant_credits", { p_user_id: u.id, p_delta: -n, p_note: note }))}>
                Retirar
              </button>
            </div>
            {u.ledger.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-[#6b5440]">
                {u.ledger.map((l, i) => (
                  <li key={i}>
                    {fmt(l.at)} · <strong className={l.delta > 0 ? "text-[#2f6a3c]" : "text-[#a23b2a]"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</strong> · {l.reason}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Murais">
            <h3 className="font-title text-base font-semibold">Murais</h3>
            {u.murals.length === 0 ? (
              <p className="mt-1 text-[#6b5440]">Nenhum mural.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {u.murals.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-[#e1d3ba] bg-white/60 p-3">
                    <p className="font-semibold">
                      {m.title} <Tag tone={m.plan === "full" ? "gold" : "plain"}>{m.plan === "full" ? "plus" : "free"}</Tag> <Tag>{m.private ? "privado" : "público"}</Tag>
                    </p>
                    <p className="text-xs text-[#6b5440]">
                      {m.pins} pins ({m.pending} pendentes) · {m.badges} Bottons ·{" "}
                      <Link href={`/${u.nickname}/${m.slug}`} target="_blank" className="underline">
                        abrir
                      </Link>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className={btn} onClick={() => onOpenMural(m.id)}>
                        Ver mural
                      </button>
                      <button type="button" className={btn} disabled={busy} onClick={() => run(`Plano do mural: ${m.plan === "full" ? "FREE" : "PLUS"}.`, () => rpc("admin_set_plan", { p_mural_id: m.id, p_plan: m.plan === "full" ? "free" : "full" }))}>
                        {m.plan === "full" ? "Mudar para FREE" : "Mudar para PLUS"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!u.isAdmin && (
            <section aria-label="Bloqueio" className={`rounded-2xl border p-4 ${u.banned ? "border-[#e3b3a8] bg-[#fbeae5]" : "border-[#e1d3ba] bg-white/60"}`}>
              <h3 className="font-title text-base font-semibold">{u.banned ? "Usuário bloqueado" : "Bloquear por irregularidade"}</h3>
              {u.banned ? (
                <>
                  <p className="mt-1 text-[#6b2a1c]">
                    Desde {fmt(u.bannedAt)}. Motivo: {u.banReason ?? "não informado"}.
                  </p>
                  <button type="button" className={`${primary} mt-3`} disabled={busy} onClick={() => run("Usuário desbloqueado.", () => rpc("admin_set_ban", { p_user_id: u.id, p_banned: false, p_reason: "" }))}>
                    Desbloquear
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-[#6b5440]">Impede o login, esconde o mural dele para todos e impede que ele envie pins.</p>
                  <input className={`${input} mt-2`} placeholder="Motivo (fica registrado)" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} aria-label="Motivo do bloqueio" />
                  <button
                    type="button"
                    className={`${danger} mt-2`}
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => window.confirm(`Bloquear ${u.nickname}?`) && run("Usuário bloqueado.", () => rpc("admin_set_ban", { p_user_id: u.id, p_banned: true, p_reason: reason.trim() }))}
                  >
                    Bloquear usuário
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Admin() {
  const { session, loading } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"users" | "reports" | "analytics">("users");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<{ total: number; rows: UserRow[] } | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [muralId, setMuralId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; label: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void rpc<boolean>("is_admin").then((r) => setAllowed(r.ok && r.data === true));
  }, [session]);

  const loadUsers = useCallback(async (term: string) => {
    const r = await rpc<{ total: number; rows: UserRow[] }>("admin_list_users", { p_q: term, p_limit: 50, p_offset: 0 });
    if (r.ok) setUsers(r.data);
  }, []);
  const loadReports = useCallback(async () => {
    const r = await rpc<Report[]>("admin_reports", { p_limit: 100 });
    if (r.ok) setReports(r.data);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(() => void loadUsers(q), 250);
    return () => clearTimeout(t);
  }, [allowed, q, loadUsers]);
  useEffect(() => {
    if (allowed && tab === "reports") void loadReports();
  }, [allowed, tab, loadReports]);

  async function confirmBan() {
    if (!banTarget || banReason.trim().length < 3) return;
    const r = await rpc("admin_set_ban", { p_user_id: banTarget.id, p_banned: true, p_reason: banReason.trim() });
    setToast(r.ok ? `${banTarget.label} foi bloqueado.` : "Não foi possível bloquear (admins não podem ser bloqueados).");
    setBanTarget(null);
    setBanReason("");
    void loadUsers(q);
    if (tab === "reports") void loadReports();
  }

  if (loading || (session && allowed === null)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f2e8d3] p-6">
        <Spinner />
      </main>
    );
  }
  if (!session || !allowed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f2e8d3] p-6 text-center text-[#2f2218]">
        <div>
          <h1 className="font-title text-2xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-[#6b5440]">{session ? "Esta conta não é de administrador." : "Entre com a conta de administrador."}</p>
          <Link href={session ? "/" : loginUrl("/admin")} className={`${primary} mt-4 inline-block`}>
            {session ? "Voltar ao site" : "Entrar"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f2e8d3] px-4 py-6 text-[#2f2218] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-title text-2xl font-semibold">Administração</h1>
            <p className="text-sm text-[#6b5440]">Usuários, murais, créditos, bloqueios e analytics.</p>
          </div>
          <Link href="/" className={btn}>
            ← Voltar ao site
          </Link>
        </header>

        <div role="tablist" aria-label="Seções" className="mt-5 grid max-w-md grid-cols-3 rounded-xl border border-[#e1d3ba] bg-white/60 p-1">
          {(
            [
              ["users", `Usuários${users ? ` (${users.total})` : ""}`],
              ["reports", "Denúncias"],
              ["analytics", "Analytics"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-[#1f232b] text-white" : "text-[#4a3826] hover:bg-[#efe4cf]"}`}>
              {label}
            </button>
          ))}
        </div>

        {toast && (
          <p role="status" className="mt-3 rounded-lg bg-[#1f232b] px-3 py-2 text-sm text-white" onClick={() => setToast(null)}>
            {toast}
          </p>
        )}

        {tab === "analytics" ? (
          <AnalyticsPanel />
        ) : tab === "users" ? (
          <section className="mt-4" aria-label="Usuários">
            <input className={input} placeholder="Buscar por e-mail ou nome de usuário…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuário" />
            {!users ? (
              <div className="py-8">
                <Spinner />
              </div>
            ) : users.rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6b5440]">Nenhum usuário encontrado.</p>
            ) : (
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {users.rows.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => setUserId(u.id)} className="w-full cursor-pointer rounded-2xl border border-[#e1d3ba] bg-white/70 p-4 text-left transition hover:bg-white">
                      <p className="flex flex-wrap items-center gap-2">
                        <strong className="font-title text-lg">{u.nickname}</strong>
                        {u.banned && <Tag tone="red">bloqueado</Tag>}
                        {u.isAdmin && <Tag tone="dark">admin</Tag>}
                        {u.murals.some((m) => m.plan === "full") && <Tag tone="gold">plus</Tag>}
                      </p>
                      <p className="truncate text-sm text-[#6b5440]">{u.email}</p>
                      <p className="mt-1 text-xs text-[#6b5440]">
                        {u.credits} créditos · {u.murals.length} mural · {u.pinsReceived} pins recebidos · {u.pinsSent} enviados
                      </p>
                      <p className="text-xs text-[#8a7b69]">Criado em {fmt(u.createdAt)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="mt-4" aria-label="Denúncias">
            {!reports ? (
              <div className="py-8">
                <Spinner />
              </div>
            ) : reports.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6b5440]">Nenhuma denúncia.</p>
            ) : (
              <ul className="space-y-2.5">
                {reports.map((r) => (
                  <li key={r.id} className="flex gap-3 rounded-2xl border border-[#e1d3ba] bg-white/70 p-4">
                    <div className="w-[7.6rem] shrink-0 overflow-hidden pt-2 text-[7px]" aria-hidden>
                      <div inert className="pointer-events-none origin-top-left" style={{ width: "14em" }}>
                        <MessageView message={{ ...r.content, id: r.id, type: r.type, pending: false } as unknown as Message} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold">
                        <Tag tone="red">{r.reason}</Tag> no mural “{r.mural ?? "—"}” de <strong>{r.owner ?? "—"}</strong>
                      </p>
                      <p className="mt-0.5 text-xs text-[#6b5440]">{fmt(r.createdAt)}</p>
                      {r.details && <p className="mt-1 text-xs break-words">“{r.details}”</p>}
                      <p className="mt-1 text-xs text-[#4a3826]">
                        Enviado por: {r.sender ? <strong>{r.sender}</strong> : <em>visitante sem conta</em>} {r.senderBanned && <Tag tone="red">bloqueado</Tag>}
                      </p>
                      {r.senderId && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className={btn} onClick={() => setUserId(r.senderId)}>
                            Ver usuário
                          </button>
                          {!r.senderBanned && (
                            <button type="button" className={`${btn} !border-[#c0463a]/50 !text-[#a23b2a]`} onClick={() => setBanTarget({ id: r.senderId!, label: r.sender ?? "autor" })}>
                              Bloquear autor
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <UserModal userId={userId} onClose={() => setUserId(null)} onChanged={() => void loadUsers(q)} onOpenMural={(id) => setMuralId(id)} />
      <MuralViewer muralId={muralId} onClose={() => setMuralId(null)} onBan={(id, label) => setBanTarget({ id, label })} />
      <Modal open={!!banTarget} onClose={() => setBanTarget(null)} title={`Bloquear ${banTarget?.label ?? ""}`}>
        <p className="text-sm text-[#6b5440]">Impede o login, esconde o mural e impede que envie pins. Dá para desbloquear depois.</p>
        <input className={`${input} mt-3`} placeholder="Motivo (fica registrado)" value={banReason} maxLength={300} onChange={(e) => setBanReason(e.target.value)} aria-label="Motivo do bloqueio" />
        <button type="button" className={`${danger} mt-3`} disabled={banReason.trim().length < 3} onClick={() => void confirmBan()}>
          Bloquear
        </button>
      </Modal>
    </main>
  );
}
