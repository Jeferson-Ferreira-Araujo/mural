import { expect, test } from "@playwright/test";

const LOCALES = ["en", "es", "fr", "it", "de", "nl", "pl", "uk", "ru", "tr", "ar", "hi", "id", "vi", "th", "ko", "ja", "zh"];
const TAGS: Record<string, string> = { en: "en-US", es: "es", fr: "fr-FR", it: "it-IT", de: "de-DE", nl: "nl-NL", pl: "pl-PL", uk: "uk-UA", ru: "ru-RU", tr: "tr-TR", ar: "ar", hi: "hi-IN", id: "id-ID", vi: "vi-VN", th: "th-TH", ko: "ko-KR", ja: "ja-JP", zh: "zh-CN" };

test.describe("páginas públicas", () => {
  test("a página inicial abre em português, indexável e sem erro", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page).toHaveTitle(/Pinz/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/);
    expect(errors).toEqual([]);
  });

  for (const l of LOCALES) {
    test(`/${l} abre no idioma certo, com canônica própria`, async ({ request }) => {
      const res = await request.get(`/${l}`);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<html lang="${TAGS[l]}"`);
      expect(html).toContain(`rel="canonical" href="https://pinz.digital/${l}"`);
    });
  }

  test("a inicial declara hreflang para os 19 idiomas e o x-default", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const tags = html.match(/hrefLang="[^"]+"/gi) ?? [];
    expect(tags.length).toBeGreaterThanOrEqual(20);
    expect(html).toContain('hrefLang="x-default"');
  });

  for (const p of ["/termos", "/privacidade", "/exclusao-de-dados"]) {
    test(`${p} chega com o texto já no HTML (não só no navegador)`, async ({ request }) => {
      const html = await (await request.get(p)).text();
      expect(html).toMatch(/<h1/);
      expect(html).not.toContain('$RX("'); // erro de renderização no servidor
    });
  }

  test("robots.txt e sitemap.xml listam os endereços certos", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /");
    expect(robots).toContain("Sitemap: https://pinz.digital/sitemap.xml");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const l of ["en", "ja", "ar"]) expect(sitemap).toContain(`https://pinz.digital/${l}`);
    expect(sitemap).toContain("https://pinz.digital/privacidade");
  });

  test("painel e murais ficam fora do Google", async ({ request }) => {
    for (const p of ["/admin", "/admin/metricas", "/nao-existe-este-mural"]) {
      const html = await (await request.get(p)).text();
      expect(html, p).toMatch(/name="robots" content="noindex/);
    }
  });
});

test.describe("privacidade", () => {
  test("o aviso aparece, 'Só o essencial' o fecha e a escolha é lembrada", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: /Privacidade e cookies/i });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Só o essencial" }).click();
    await expect(banner).toBeHidden();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("pinz:consent") ?? "null"));
    expect(saved).toMatchObject({ v: 1, analytics: false });
    await page.reload();
    await expect(page.getByRole("dialog", { name: /Privacidade e cookies/i })).toBeHidden();
  });

  test("sem aceitar as métricas, nenhum evento de uso é enviado", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/rpc/track_event")) calls.push(r.url());
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Só o essencial" }).click();
    await page.goto("/privacidade");
    await page.waitForTimeout(1500);
    expect(calls).toEqual([]);
  });
});

test.describe("segurança das rotas", () => {
  test("o agendador recusa quem não tem o segredo", async ({ request }) => {
    expect((await request.post("/api/cron/habit-reminders")).status()).toBe(403);
    expect((await request.post("/api/cron/habit-reminders", { headers: { "x-cron-secret": "errado" } })).status()).toBe(403);
  });

  test("a chave pública de notificações é entregue", async ({ request }) => {
    const j = (await (await request.get("/api/push/key")).json()) as { key: string };
    expect(j.key.length).toBeGreaterThan(60);
  });

  test("o webhook de pagamento recusa chamadas sem assinatura", async ({ request }) => {
    const r = await request.post("/api/pay/stripe/webhook", { data: "{}" });
    expect([400, 401, 403, 503]).toContain(r.status());
  });

  test("cabeçalhos de segurança presentes", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBeTruthy();
  });
});

test.describe("entrada na conta", () => {
  test("a tela de entrada mostra o formulário", async ({ page }) => {
    await page.goto("/entrar");
    await expect(page.locator("input[type=email]:visible, input[type=password]:visible").first()).toBeVisible();
  });
});
