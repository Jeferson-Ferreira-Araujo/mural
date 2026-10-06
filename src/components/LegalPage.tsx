import type { ReactNode } from "react";
import { AuthShell } from "./ui";

/** E-mail de contato exibido nas páginas legais (NEXT_PUBLIC_CONTACT_EMAIL). Sem ele, a seção de contato não aparece. */
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <AuthShell wide>
      <h1 className="font-title text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-[#6b5440]">Atualizado em {updated}</p>
      <div className="mt-5 space-y-5 text-[15px] leading-relaxed text-[#3a2c1d] [&_h2]:font-title [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#2f2218] [&_li]:ml-5 [&_li]:list-disc [&_li]:py-0.5">
        {children}
        {CONTACT && (
          <section>
            <h2>Contato</h2>
            <p>
              Dúvidas ou pedidos sobre seus dados: <a className="font-semibold underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
          </section>
        )}
      </div>
    </AuthShell>
  );
}
