/**
 * Cápsula PINZ: mensagem que só abre numa data futura.
 * IMPORTANTE: enquanto fechada, o item do mural NÃO carrega o conteúdo (ver `ClosedCapsuleItem`).
 * No backend, a abertura também terá de ser validada no servidor — o conteúdo só será enviado depois da data.
 */

export function remainingMs(opensAt: string, now = Date.now()) {
  return new Date(opensAt).getTime() - now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "18 dias • 04h • 37min" (ou "04h • 37min" quando falta menos de um dia). */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "agora";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return "menos de 1 min";
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  parts.push(`${pad(hours)}h`, `${pad(minutes)}min`);
  return parts.join(" • ");
}
