"use client";

import { useEffect, useState } from "react";
import { listFollowing, listVisitors, setFollowing, type PersonLite } from "@/lib/social";
import { getBrowserSupabase } from "@/lib/supabase";
import { Avatar } from "../Avatar";
import { Modal } from "./Modal";

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

/** Seguindo: as pessoas que você segue, com acesso rápido ao mural delas. */
export function FollowingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<PersonLite[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setList(null);
    void listFollowing(getBrowserSupabase()).then((l) => setList(l ?? []));
  }, [open]);

  async function unfollow(nick: string) {
    setList((l) => (l ?? []).filter((p) => p.nickname !== nick));
    if (!(await setFollowing(getBrowserSupabase(), nick, false))) void listFollowing(getBrowserSupabase()).then((l) => setList(l ?? []));
  }

  return (
    <Modal open={open} onClose={onClose} title="Seguindo" label="Seguindo">
      {!list ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Você ainda não segue ninguém. Toque em “Seguir” no mural de uma pessoa para ter acesso rápido a ele aqui.</p>
      ) : (
        <ul className="space-y-2.5">
          {list.map((p) => (
            <Row
              key={p.nickname}
              p={p}
              action={
                <button type="button" onClick={() => void unfollow(p.nickname)} className="shrink-0 cursor-pointer rounded-lg border border-[#d9c9ad] bg-white px-3 py-1.5 text-sm font-semibold text-[#4a3826] transition hover:bg-[#efe4cf]">
                  Deixar de seguir
                </button>
              }
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Visitantes: quem entrou nos seus murais com conta (sem datas) e quantos seguidores você tem. */
export function VisitorsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<{ hidden: boolean; visitors: PersonLite[]; followers: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    setData(null);
    void listVisitors(getBrowserSupabase()).then((d) => setData(d ?? { hidden: false, visitors: [], followers: 0 }));
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Visitantes" label="Visitantes">
      {!data ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Carregando…</p>
      ) : data.hidden ? (
        <p className="py-6 text-center text-sm text-[#6b5440]">Você desligou “Aparecer como visitante” no Perfil. Quem desliga também não vê quem visitou os seus murais. Ligue de novo lá para ver a lista.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-[#6b5440]">
            {data.followers} {data.followers === 1 ? "seguidor" : "seguidores"}
          </p>
          {data.visitors.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b5440]">Ninguém com conta visitou seus murais ainda.</p>
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
