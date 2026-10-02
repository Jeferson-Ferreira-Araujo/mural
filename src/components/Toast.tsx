/** Aviso curto e discreto (somente aria-live, sem interação). */
export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
      {message && (
        <p className="rise rounded-full bg-[#1f232b] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0.5rem_1.5rem_rgba(0,0,0,.4)]">
          {message}
        </p>
      )}
    </div>
  );
}
