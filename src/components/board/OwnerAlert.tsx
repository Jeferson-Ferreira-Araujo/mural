import type { Tone } from "../viewProps";
import { useTranslations } from "next-intl";

/**
 * Aviso para o PROPRIETÁRIO quando o mural enche e visitantes ainda tentam deixar um PINZ.
 * (Na demonstração os números são locais; depois virão de eventos reais.)
 */
export function OwnerAlert({ tries, tone = "light", planLimit = 0 }: { tries: number; tone?: Tone; /** > 0: o plano gratuito travou o mural neste número de pins (ainda há espaços no quadro) */ planLimit?: number }) {
  const tx = useTranslations("components.board.OwnerAlert");
  const dark = tone === "dark";
  return (
    <section
      role="status"
      aria-label={tx("avisoParaODonoDo")}
      className={`rounded-[1em] border px-[1.1em] py-[0.95em] ${dark ? "border-[#e0a02f]/50 bg-[#3a2a0c]/80 text-[#fff1cf] backdrop-blur" : "border-[#e0b04a] bg-[#fff1cf] text-[#4a3000]"}`}
    >
      <p className="flex items-center gap-[0.5em] text-[1.05em] font-bold">
        <span aria-hidden>📌</span> {planLimit > 0 ? tx("m_voceChegouAoLimiteDe", { v0: planLimit }) : tx("m_seuMuralEstaCheio")}
      </p>
      <p className="mt-[0.3em] text-[0.92em]">
        {tries > 0 ? (
          <>
            {tx.rich("x_deixarUmPinz", { v0: tries, s0: (c) => <strong>{c}</strong> })}</>
        ) : (
          tx("m_ninguemTentouDeixarUmPinz")
        )}
      </p>
      <p className={`mt-[0.5em] text-[0.78em] ${dark ? "text-[#fff1cf]/70" : "text-[#4a3000]/70"}`}>{planLimit > 0 ? tx("m_assineOPinzParaColocar") : tx("m_emBreveUseCreditosPara")}</p>
    </section>
  );
}
