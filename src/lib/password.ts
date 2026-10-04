export const MIN_PASSWORD = 8;

const COMMON = ["12345678", "123456789", "1234567890", "password", "senha123", "qwertyui", "abc12345", "11111111", "00000000", "iloveyou", "mudar123", "brasil123", "senhasenha"];

export type PasswordCheck = { id: string; label: string; ok: boolean; required: boolean };

/** Regras da senha (as obrigatórias bloqueiam o cadastro; as recomendadas só deixam a senha mais forte). */
export function checkPassword(pw: string, ctx: { email?: string; username?: string } = {}): PasswordCheck[] {
  const low = pw.toLowerCase();
  const mail = (ctx.email ?? "").split("@")[0].toLowerCase();
  const user = (ctx.username ?? "").toLowerCase();
  const personal = (mail.length >= 3 && low.includes(mail)) || (user.length >= 3 && low.includes(user));
  return [
    { id: "len", label: `Pelo menos ${MIN_PASSWORD} caracteres`, ok: pw.length >= MIN_PASSWORD, required: true },
    { id: "case", label: "Letras maiúsculas e minúsculas", ok: /[a-zà-ÿ]/.test(pw) && /[A-ZÀ-Þ]/.test(pw), required: true },
    { id: "num", label: "Pelo menos um número", ok: /\d/.test(pw), required: true },
    { id: "pers", label: "Sem seu e-mail ou nome de usuário", ok: pw.length > 0 && !personal && !COMMON.includes(low), required: true },
    { id: "sym", label: "Um símbolo (!@#$…) deixa mais forte", ok: /[^A-Za-z0-9À-ÿ]/.test(pw), required: false },
    { id: "long", label: "12 caracteres ou mais é ainda melhor", ok: pw.length >= 12, required: false },
  ];
}

export type Strength = 0 | 1 | 2 | 3;

export function passwordStrength(checks: PasswordCheck[]): Strength {
  if (checks.some((c) => c.required && !c.ok)) return checks.filter((c) => c.required && c.ok).length >= 3 ? 1 : 0;
  const bonus = checks.filter((c) => !c.required && c.ok).length;
  return (2 + (bonus >= 1 ? 1 : 0)) as Strength;
}

/** Texto do primeiro problema que impede o cadastro (ou null). */
export function passwordProblem(pw: string, ctx: { email?: string; username?: string }): string | null {
  const bad = checkPassword(pw, ctx).find((c) => c.required && !c.ok);
  if (!bad) return null;
  if (bad.id === "pers") return "Evite senhas comuns ou com seu e-mail e nome de usuário.";
  return `Senha fraca: ${bad.label.charAt(0).toLowerCase()}${bad.label.slice(1)}.`;
}
