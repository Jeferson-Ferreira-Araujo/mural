"use client";

import { useState } from "react";
import { Pin } from "../messages/fasteners";
import { ghostButton, primaryButton } from "../ui";

/**
 * Mural lotado. Aparece ANTES da composição: o visitante não escreve nada para descobrir depois
 * que não cabe. Em vez disso, pode avisar o dono que passou por aqui.
 */
export function FullNotice({ used, available, planLimit = false, onTried, triedAlready, onClose }: { used: number; available: number; /** o mural ainda tem espaços, mas o plano do dono não permite mais pins */ planLimit?: boolean; onTried: () => void; triedAlready: boolean; onClose: () => void }) {
  const [sent, setSent] = useState(triedAlready);

  return (
    <div className="py-2 text-center">
      <div className="relative mx-auto mb-4 w-fit">
        <Pin tone="red" className="left-1/2 -translate-x-1/2" />
        <div className="mx-auto mt-3 w-40 rotate-[-2deg] rounded-sm bg-[#f5f0e2] px-4 py-6 shadow-[0_0.4rem_1rem_rgba(40,20,5,.3)]">
          <p className="font-hand text-[1.5rem] leading-none text-[#243a7a]">{planLimit ? "limite!" : "lotado!"}</p>
          <p className="font-mono mt-2 text-xs text-[#243a7a]/70">{used} de {available}</p>
        </div>
      </div>

      <h3 className="font-title text-2xl font-semibold">{planLimit ? "Este mural chegou ao limite do plano." : "Este PINZ está lotado."}</h3>
      {planLimit && <p className="mt-2 text-sm text-[#6b5440]">O plano gratuito permite até {available} pins. Para ter mais espaços, o dono precisa do PINZ PLUS ou de créditos.</p>}
      {sent ? (
        <>
          <p role="status" className="mt-3 text-[#4a3826]">
            Pronto! Avisamos o dono do mural que você passou por aqui. 💛
          </p>
          <button type="button" onClick={onClose} className={`${ghostButton} mt-6`}>
            Fechar
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-[#4a3826]">Avise o dono que você passou por aqui.</p>
          <button
            type="button"
            onClick={() => {
              onTried();
              setSent(true);
            }}
            className={`${primaryButton} mt-6`}
          >
            Eu tentei deixar um PINZ
          </button>
          <p className="mt-3 text-xs text-[#8a7b69]">Não custa nada.</p>
        </>
      )}
    </div>
  );
}
