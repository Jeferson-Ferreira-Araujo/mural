import { Pin } from "./messages/fasteners";

/** Plaquinha de papel com o nome do mural. Tamanho controlado pelo font-size do pai. */
export function BoardHeader({ owner, tagline }: { owner: string; tagline: string }) {
  return (
    <header
      className="paper-grain shadow-paper relative bg-[#f7f0dd] px-[1.6em] pt-[1.5em] pb-[1.2em]"
      style={{ borderRadius: "0.25em" }}
    >
      <Pin color="#c43b2f" className="top-[0.45em] left-[0.6em]" />
      <h1 className="font-title text-[2em] leading-[1.05] font-semibold tracking-tight text-[#2f2218]">
        Mural do {owner}
      </h1>
      <p className="font-title mt-[0.35em] text-[0.95em] leading-snug text-[#6b5440] italic">“{tagline}”</p>
    </header>
  );
}
