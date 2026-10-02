import { Pin } from "./fasteners";
import { Scene } from "./Scene";

export function PolaroidPhoto({ caption }: { caption: string }) {
  return (
    <article
      aria-label="Foto"
      className="paper-grain shadow-paper relative w-[12em] bg-[#fdfcf7] px-[0.8em] pt-[0.8em] pb-[1em]"
      style={{ borderRadius: "0.15em" }}
    >
      <Pin color="#c43b2f" className="top-[-0.55em] left-1/2 -translate-x-1/2" />
      <div className="relative aspect-square w-full overflow-hidden bg-[#222] shadow-[inset_0_0_0.6em_rgba(0,0,0,.55)]">
        <Scene variant="sunset" />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.18),transparent_40%)]" />
      </div>
      <p className="font-marker mt-[0.35em] text-center text-[1.6em] leading-none text-[#2b2b3a]">{caption}</p>
    </article>
  );
}
