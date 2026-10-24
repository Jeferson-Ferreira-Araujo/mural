import { expect, test } from "@playwright/test";

/**
 * Fluxos com conta (ficam PULADOS sem credenciais). Para rodar, use uma conta de teste exclusiva:
 *   E2E_EMAIL=teste@exemplo.com E2E_PASSWORD=... npm run test:e2e
 * Nunca use uma conta de verdade: os testes só leem, mas entram na conta.
 */
const has = !!process.env.E2E_EMAIL && !!process.env.E2E_PASSWORD;

async function entrar(page: import("@playwright/test").Page) {
  await page.goto("/entrar");
  await page.locator("input[type=email]").first().fill(process.env.E2E_EMAIL!);
  await page.locator("input[type=password]").first().fill(process.env.E2E_PASSWORD!);
  await page.locator("button[type=submit]").first().click();
  await expect(page).not.toHaveURL(/entrar/, { timeout: 20_000 });
}

test.describe("com conta de teste", () => {
  test.skip(!has, "defina E2E_EMAIL e E2E_PASSWORD para rodar estes testes");

  test("entra na conta e vê o próprio mural", async ({ page }) => {
    await entrar(page);
    await expect(page.locator("[data-explorer]")).toBeVisible();
  });

  test("a loja abre e mostra os displays em pacote", async ({ page }) => {
    await entrar(page);
    await page.getByRole("button", { name: /Loja/i }).first().click();
    await page.getByRole("tab", { name: /Displays/i }).click();
    await expect(page.getByText(/Pacote/).first()).toBeVisible();
  });
});
