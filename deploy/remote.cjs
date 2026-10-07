// Publica o site (ou roda um comando) no servidor. A senha NUNCA fica no arquivo: vem da variável de ambiente VPSPW.
//
//   Preparar uma vez (fora do projeto, para não sujar o package.json):  mkdir %TEMP%\pinz-ssh && cd %TEMP%\pinz-ssh && npm i ssh2
//   Publicar (PowerShell):  $env:VPSPW='<senha>'; node deploy/remote.cjs
//   Outro comando:          $env:VPSPW='<senha>'; $env:CMD='cut -d= -f1 /opt/mural/.env'; node deploy/remote.cjs
//
// ANTES de publicar: `git push` precisa ter dado certo (o servidor faz `git pull` do GitHub; sem push ele publica o código antigo).
// O servidor roda /opt/mural/deploy.sh = git pull --ff-only em /opt/mural/src + docker compose up -d --build; termina com "deploy ok".
// Variáveis do servidor (fora do git): /opt/mural/.env (AVATAR_SIGNING_SECRET, GOOGLE_MAPS_API_KEY, MP_ACCESS_TOKEN, SUPABASE_SECRET_KEY).
const path = require("path");
let Client;
try {
  ({ Client } = require("ssh2"));
} catch {
  // procura o ssh2 na pasta temporária de preparo
  const tmp = process.env.TEMP || process.env.TMPDIR || "/tmp";
  ({ Client } = require(require.resolve("ssh2", { paths: [path.join(tmp, "pinz-ssh"), process.cwd()] })));
}

if (!process.env.VPSPW) {
  console.error("Defina a senha do servidor na variável de ambiente VPSPW (peça ao dono; não grave em arquivo).");
  process.exit(1);
}
const cmd = process.env.CMD || "/opt/mural/deploy.sh 2>&1 | tail -25";
const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (e, s) => {
    if (e) throw e;
    s.on("data", (d) => process.stdout.write(d)).stderr.on("data", (d) => process.stdout.write(d));
    s.on("close", (code) => {
      console.log("exit", code);
      c.end();
    });
  });
})
  .on("error", (e) => console.log("ERRO", e.message))
  .connect({ host: "108.174.149.199", port: 22022, username: "root", password: process.env.VPSPW, readyTimeout: 20000 });
