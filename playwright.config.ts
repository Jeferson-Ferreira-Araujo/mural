import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta do Pinz. Por padrão rodam contra o site no ar (somente leitura: nada é criado nem apagado);
 * para testar outro endereço: E2E_BASE_URL=http://localhost:3100 npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "https://pinz.digital", locale: "pt-BR", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
});
