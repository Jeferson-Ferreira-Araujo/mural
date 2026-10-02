import { BoardTitle } from "./BoardTitle";
import { Brand } from "./Brand";
import { PolaroidPhoto } from "./messages/PolaroidPhoto";
import { UnlockPanel } from "./UnlockPanel";
import type { ViewProps } from "./viewProps";

const icon = "size-[1.5em]";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Stat({ icon: Icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <li className="flex flex-col items-center gap-[0.15em] text-center">
      {Icon}
      <span className="text-[1.05em] leading-none font-semibold">{value}</span>
      <span className="text-[0.72em] leading-tight text-[#6b5440]">{label}</span>
    </li>
  );
}

export const UNLOCK_INPUT_DESKTOP = "unlock-answer-desktop";

/** Coluna esquerda do desktop: título, pergunta de desbloqueio e números do mural. */
export function Sidebar({ title, question, stats, unlocked, onSubmitAnswer }: ViewProps) {
  return (
    <aside
      className="paper-grain relative z-20 flex h-full w-[clamp(280px,22vw,350px)] shrink-0 flex-col gap-[1.4em] overflow-x-hidden overflow-y-auto bg-[#f2e8d3] px-[1.6em] py-[1.8em] text-[clamp(14px,1.05vw,16px)] shadow-[0.4em_0_2em_rgba(30,12,0,.35)]"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.35), transparent 40%)" }}
    >
      <Brand className="-mb-3 h-[4.5rem]" />
      <BoardTitle title={title} />

      <UnlockPanel question={question} unlocked={unlocked} onSubmit={onSubmitAnswer} inputId={UNLOCK_INPUT_DESKTOP} />

      <div className="flex items-center gap-[0.9em] rounded-[0.9em] border border-[#d9c9ad] px-[1em] py-[0.8em] text-[0.88em] leading-snug text-[#4a3826]">
        <svg viewBox="0 0 24 24" className="size-[1.9em] shrink-0" {...stroke} aria-hidden>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M5 12v8h14v-8M12 8v12M12 8c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3Z" />
        </svg>
        Responda corretamente e deixe uma mensagem anônima.
      </div>

      <div className="mt-[0.5em] hidden justify-center [@media(min-height:860px)]:flex">
        <div className="-rotate-[7deg] text-[0.62em]">
          <PolaroidPhoto scene="sunset" caption="A vida fica melhor com pessoas assim. ♥" />
        </div>
      </div>

      <ul className="mt-auto grid grid-cols-4 gap-[0.4em] border-t border-[#d9c9ad] pt-[1.1em] text-[#2f2218]">
        <Stat
          value={stats.visited}
          label="visitaram"
          icon={
            <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />
        <Stat
          value={stats.tried}
          label="tentaram entrar"
          icon={
            <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
              <rect x="5" y="10" width="14" height="10" rx="1.5" />
              <path d="M8 10V8a4 4 0 0 1 8 0v2" />
            </svg>
          }
        />
        <Stat
          value={stats.correct}
          label="acertaram"
          icon={
            <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="m8.5 12 2.5 2.5 4.5-5" />
            </svg>
          }
        />
        <Stat
          value={stats.messages}
          label="mensagens"
          icon={
            <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
              <path d="M4 5h16v11H9l-5 4V5Z" />
              <path d="M9 10h6" />
            </svg>
          }
        />
      </ul>
    </aside>
  );
}
