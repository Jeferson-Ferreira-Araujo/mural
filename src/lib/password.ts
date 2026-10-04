export const MIN_PASSWORD = 8;

const COMMON = ["12345678", "123456789", "1234567890", "password", "senha123", "qwertyui", "abc12345", "11111111", "00000000", "iloveyou", "mudar123", "brasil123", "senhasenha"];

export type PasswordCheck = { id: string; label: string; ok: boolean; required: boolean };

/** Regras da senha (as obrigatórias bloqueiam o cadastro; as recomendadas só deixam a senha mais forte). */
export function checkPassword(pw: string, ctx: { email?: string; username?: string } = {}): PasswordCheck[] {
  return [
    { id: "len", label: `Pelo menos ${MIN_PASSWORD} caracteres`, ok: pw.length >= MIN_PASSWORD, required: true },
    { id: "case", label: "Letras maiúsculas e minúsculas", ok: /[a-zà-ÿ]/.test(pw) && /[A-ZÀ-Þ]/.test(pw), required: true },
    { id: "num", label: "Pelo menos um número", ok: /\d/.test(pw), required: true },
    { id: "sym", label: "Um símbolo (!@#$…)", ok: /[^A-Za-z0-9À-ÿ]/.test(pw), required: true },
  ];
}

export type Strength = 0 | 1 | 2 | 3;

export function passwordStrength(checks: PasswordCheck[], pw = ""): Strength {
  const done = checks.filter((c) => c.ok).length;
  if (done < checks.length) return done >= 3 ? 1 : 0;
  return pw.length >= 12 ? 3 : 2;
}

/** Texto do primeiro problema que impede o cadastro (ou null). */
export function passwordProblem(pw: string, ctx: { email?: string; username?: string }): string | null {
  const low = pw.toLowerCase();
  const mail = (ctx.email ?? "").split("@")[0].toLowerCase();
  const user = (ctx.username ?? "").toLowerCase();
  const bad0 = checkPassword(pw, ctx).find((c) => c.required && !c.ok);
  if (!bad0 && (COMMON.includes(low) || (mail.length >= 3 && low.includes(mail)) || (user.length >= 3 && low.includes(user)))) return "Escolha uma senha menos óbvia.";
  const bad = checkPassword(pw, ctx).find((c) => c.required && !c.ok);
  if (!bad) return null;
  return `Senha fraca: ${bad.label.charAt(0).toLowerCase()}${bad.label.slice(1)}.`;
}
