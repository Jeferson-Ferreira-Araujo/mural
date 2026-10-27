"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loginUrl, useSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { UptimeView } from "../metricas/uptime";

/** Disponibilidade do servidor: página só do administrador (o JSON público continua em /api/status). */
export default function StatusPage() {
  const { session, loading } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    void getBrowserSupabase().rpc("is_admin").then(({ data }) => setAllowed(data === true));
  }, [session]);

  if (loading || (session && allowed === null)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f6efe0]">
        <Spinner />
      </main>
    );
  }
  if (!session || !allowed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f6efe0] p-6 text-center">
        <div>
          <p className="font-title text-xl font-semibold">Área restrita</p>
          <Link href={session ? "/" : loginUrl("/admin/status")} className="mt-4 inline-block cursor-pointer rounded-lg bg-[#1f232b] px-4 py-2 text-sm font-semibold text-white">
            {session ? "Voltar ao Pinz" : "Entrar"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#6b4a2b] bg-cover bg-fixed p-2 text-[#2a1c12] sm:p-4" style={{ backgroundImage: "linear-gradient(rgba(40,24,10,.35), rgba(40,24,10,.35)), url(/img/blur/cortica.webp)" }}>
      <div className="mx-auto max-w-[1100px] rounded-3xl bg-[#fbf5ea]/95 p-4 shadow-[0_10px_40px_rgba(30,12,0,.35)] sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/pinz-logo.webp" alt="Pinz" className="h-12 w-auto select-none" draggable={false} />
            <div>
              <h1 className="font-title text-3xl font-semibold sm:text-4xl">Status do servidor</h1>
              <p className="text-[#6b5440]">Disponibilidade e velocidade, atualizado a cada 15 segundos.</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link href="/admin/metricas" className="rounded-xl bg-white px-3.5 py-2.5 shadow-[0_2px_8px_rgba(90,60,20,.08)] hover:bg-[#f3e9d6]">
              Painel Growth
            </Link>
            <Link href="/admin" className="rounded-xl bg-white px-3.5 py-2.5 shadow-[0_2px_8px_rgba(90,60,20,.08)] hover:bg-[#f3e9d6]">
              ← Administração
            </Link>
          </nav>
        </header>
        <UptimeView />
      </div>
    </div>
  );
}
