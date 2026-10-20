// Confere que toda chave usada no código (tx("chave"), t.rich("chave")…) existe no catálogo pt dentro de algum dos namespaces ligados àquela variável no arquivo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pt = JSON.parse(fs.readFileSync(path.join(root, "messages/pt.json"), "utf8"));
const has = (ns, key) => {
  let cur = pt;
  for (const p of ns.split(".")) cur = cur && cur[p];
  return !!cur && typeof cur === "object" && key in cur;
};
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?)$/.test(f)) files.push(p);
  }
})(path.join(root, "src"));
let bad = 0;
for (const file of files) {
  const s = fs.readFileSync(file, "utf8");
  const map = {};
  for (const m of s.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*"([^"]+)"/g)) (map[m[1]] ||= new Set()).add(m[2]);
  for (const [v, nss] of Object.entries(map)) {
    const re = new RegExp("\\b" + v + "(?:\\.rich|\\.raw|\\.markup)?\\(\\s*\"([A-Za-z0-9_.]+)\"", "g");
    for (const m of s.matchAll(re)) {
      const key = m[1];
      if (![...nss].some((ns) => (key.includes(".") ? has(ns + "." + key.split(".").slice(0, -1).join("."), key.split(".").pop()) : has(ns, key)))) {
        bad++;
        console.log(`${path.relative(root, file)}: ${v}("${key}") não existe em ${[...nss].join(" | ")}`);
      }
    }
  }
}
console.log(bad ? `${bad} chave(s) faltando` : "todas as chaves existem");
process.exit(bad ? 1 : 0);
