import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/lib/contact";
import { AuthShell } from "./ui";
import { useTranslations } from "next-intl";
import { useTag } from "@/i18n/useTag";

const CONTACT = CONTACT_EMAIL;

export function LegalPage({ title, updated, children, bare = false }: { title: string; updated: string; children: ReactNode; /** só o texto (sem cabeçalho do site e sem título): usado dentro do modal */ bare?: boolean }) {
  const tx = useTranslations("components.LegalPage");
  const tag = useTag();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(updated) ? new Date(`${updated}T12:00:00`).toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric" }) : updated;
  const Shell = bare ? Bare : AuthShell;
  return (
    <Shell wide>
      {!bare && <h1 className="font-title text-2xl font-semibold">{title}</h1>}
      <p className="mt-1 text-sm text-[#6b5440]">{tx("x_atualizadoEm", { v0: date })}</p>
      <div className="mt-5 space-y-5 text-[15px] leading-relaxed text-[#3a2c1d] [&_h2]:font-title [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#2f2218] [&_li]:ml-5 [&_li]:list-disc [&_li]:py-0.5">
        {children}
        {CONTACT && (
          <section>
            <h2>{tx("contato")}</h2>
            <p>
              {tx.rich("x_duvidasOuPedidosSobreSeus", { v0: CONTACT, s0: (c) => <a className="font-semibold underline" href={`mailto:${CONTACT}`}>{c}</a> })}</p>
          </section>
        )}
      </div>
    </Shell>
  );
}

function Bare({ children }: { children: ReactNode; wide?: boolean }) {
  return <main className="min-h-dvh bg-[#fffaf0] px-5 py-4">{children}</main>;
}
