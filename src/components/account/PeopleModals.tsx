"use client";

import { useEffect, useState } from "react";
import { listFollowers, listFollowing, listVisitors, setFollowing, type PersonLite } from "@/lib/social";
import { getBrowserSupabase } from "@/lib/supabase";
import { Avatar } from "../Avatar";
import { Modal } from "./Modal";
import { ListSkeleton } from "../Skeleton";
import { useTranslations } from "next-intl";

function Row({ p, action }: { p: PersonLite; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-[#e1d3ba] bg-white/70 p-2.5">
      <a href={`/${p.nickname}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Abrir o mural de @${p.nickname}`}>
        <Avatar src={p.avatar} name={p.nickname} plus={p.plus} className="size-11 shrink-0" />
        <span className="min-w-0 truncate text-base font-bold">@{p.nickname}</span>
      </a>
      {action}
    </li>
  );
}

/** Seguindo e Seguidores (duas abas): quem você segue, com acesso rápido ao mural, e quem segue você; a busca no topo filtra a lista da aba aberta. */
export function FollowingModal({ open, onClose, nick }: { open: boolean; onClose: () => void; /** seu nome de usuário (para listar os seguidores) */ nick: string }) {
  const tx = useTranslations("components.account.PeopleModals");
  const [tab, setTab] = useState<"following" | "followers">("following");
  const [following, setFollowing_] = useState<PersonLite[] | null>(null);
  const [followers, setFollowers] = useState<PersonLite[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) return;
    setTab("following");
    setQ("");
    setFollowing_(null);
    setFollowers(null);
    const sb = getBrowserSupabase();
    void listFollowing(sb).then((l) => setFollowing_(l ?? []));
    void listFollowers(sb, nick).then((l) => setFollowers(l ?? []));
  }, [open, nick]);

  async function unfollow(n: string) {
    setFollowing_((l) => (l ?? []).filter((p) => p.nickname !== n));
    if (!(await setFollowing(getBrowserSupabase(), n, false))) void listFollowing(getBrowserSupabase()).then((l) => setFollowing_(l ?? []));
  }

  const list = tab === "following" ? following : followers;
  const term = q.trim().toLowerCase().replace(/^@/, "");
  const shown = list && term ? list.filter((p) => p.nickname.toLowerCase().includes(term)) : list;
  const tabBtn = (id: "following" | "followers", label: string, n: number | null) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-bold transition ${tab === id ? "bg-white text-[#2a1c12] shadow-[0_0.1rem_0.4rem_rgba(60,35,10,.2)]" : "text-[#6b5440] hover:text-[#2a1c12]"}`}
    >
      {label}
      {n != null && <span className="ml-1.5 font-semibold text-[#8a7b69]">{n}</span>}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title={tx("seguidoresESeguindo")} label={tx("seguidoresESeguindo")}>
      <div role="tablist" aria-label={tx("seguindoESeguidores")} className="mb-3 flex gap-1 rounded-xl bg-[#e9dcc3]/70 p-1">
        {tabBtn("following", "Seguindo", following?.length ?? null)}
        {tabBtn("followers", "Seguidores", followers?.length ?? null)}
      </div>
      <div className="relative mb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={tab === "following" ? "Buscar entre quem você segue" : "Buscar entre seus seguidores"}
          autoComplete="off"
          className="w-full rounded-xl border border-[#d9c9ad] bg-white py-2.5 pr-11 pl-3.5 text-[15px] outline-none [&::-webkit-search-cancel-button]:appearance-none focus:border-[#d98a2b] focus:ring-2 focus:ring-[#d98a2b]/30"
        />
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-[#8a7b69]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      </div>
      {!shown ? (
        <ListSkeleton rows={5} />
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">
          {term ? "Ninguém encontrado com esse nome." : tab === "following" ? "Você ainda não segue ninguém. Toque em “Seguir” no mural de uma pessoa para ter acesso rápido a ele aqui." : "Nenhum seguidor para mostrar."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((p) => (
            <Row
              key={p.nickname}
              p={p}
              action={
                tab === "following" ? (
                  <button type="button" onClick={() => void unfollow(p.nickname)} className="shrink-0 cursor-pointer rounded-lg border border-[#d9c9ad] bg-white px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf]">
                    {tx("deixarDeSeguir")}</button>
                ) : undefined
              }
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Seguidores de uma pessoa (aberto ao tocar no número de seguidores do mural). */
export function FollowersModal({ open, onClose, nick }: { open: boolean; onClose: () => void; nick: string }) {
  const tx = useTranslations("components.account.PeopleModals");
  const [list, setList] = useState<PersonLite[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setList(null);
    void listFollowers(getBrowserSupabase(), nick).then((l) => setList(l ?? []));
  }, [open, nick]);
  return (
    <Modal open={open} onClose={onClose} title={tx("seguidores")} label={tx("seguidores")}>
      {!list ? (
        <ListSkeleton rows={5} />
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">{tx("nenhumSeguidorParaMostrar")}</p>
      ) : (
        <ul className="space-y-2.5">
          {list.map((p) => (
            <Row key={p.nickname} p={p} />
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Visitantes: quem entrou nos seus murais com conta (sem datas) e quantos seguidores você tem. */
export function VisitorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tx = useTranslations("components.account.PeopleModals");
  const [data, setData] = useState<{ hidden: boolean; visitors: PersonLite[]; followers: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    setData(null);
    void listVisitors(getBrowserSupabase()).then((d) => setData(d ?? { hidden: false, visitors: [], followers: 0 }));
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={tx("visitantes")} label={tx("visitantes")}>
      {!data ? (
        <ListSkeleton rows={5} />
      ) : data.hidden ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">{tx("voceDesligouAparecerComoVisitante")}</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-[#6b5440]">
            {data.followers} {data.followers === 1 ? "seguidor" : "seguidores"}
          </p>
          {data.visitors.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b5440]">{tx("ninguemComContaVisitouSeus")}</p>
          ) : (
            <ul className="space-y-2.5">
              {data.visitors.map((p) => (
                <Row key={p.nickname} p={p} />
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
