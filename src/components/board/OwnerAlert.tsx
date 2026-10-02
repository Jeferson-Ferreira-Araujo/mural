import type { Tone } from "../viewProps";

/**
 * Aviso para o PROPRIETÁRIO quando o mural enche e visitantes ainda tentam deixar um PINZ.
 * (Na demonstração os números são locais; depois virão de eventos reais.)
 */
export function OwnerAlert({ tries, tone = "light" }: { tries: number; tone?: Tone }) {
  const dark = tone === "dark";
  return (
    <section
      role="status"
      aria-label="Aviso para o dono do mural"
      className={`rounded-[1em] border px-[1.1em] py-[0.95em] ${dark ? "border-[#e0a02f]/50 bg-[#3a2a0c]/80 text-[#fff1cf] backdrop-blur" : "border-[#e0b04a] bg-[#fff1cf] text-[#4a3000]"}`}
    >
      <p className="flex items-center gap-[0.5em] text-[1.05em] font-bold">
        <span aria-hidden>📌</span> Seu mural está cheio.
      </p>
      <p className="mt-[0.3em] text-[0.92em]">
        {tries > 0 ? (
          <>
            <strong>{tries}</strong> {tries === 1 ? "pessoa tentou" : "pessoas tentaram"} deixar um PINZ.
          </>
        ) : (
          "Ninguém tentou deixar um PINZ ainda."
        )}
      </p>
      <p className={`mt-[0.5em] text-[0.78em] ${dark ? "text-[#fff1cf]/70" : "text-[#4a3000]/70"}`}>Em breve: use créditos para abrir outro mural.</p>
    </section>
  );
}
