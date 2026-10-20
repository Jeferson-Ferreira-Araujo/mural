// Confere os catálogos de tradução: en e es não podem ter chaves que o pt não tem, e o pt não pode ficar sem texto.
// Chave que só falta em en/es não quebra (cai no pt), mas é avisada aqui.
import fs from "node:fs";
const read = (n) => JSON.parse(fs.readFileSync(new URL(`../messages/${n}.json`, import.meta.url), "utf8"));
const flat = (o, p = "", out = {}) => {
  for (const [k, v] of Object.entries(o)) typeof v === "object" && v ? flat(v, p + k + ".", out) : (out[p + k] = v);
  return out;
};
const pt = flat(read("pt"));
let bad = 0;
for (const l of ["en", "es"]) {
  const m = flat(read(l));
  const extra = Object.keys(m).filter((k) => !(k in pt));
  const missing = Object.keys(pt).filter((k) => !(k in m));
  if (extra.length) { bad++; console.log(`${l}: ${extra.length} chave(s) que o pt não tem`, extra.slice(0, 5)); }
  if (missing.length) console.log(`${l}: aviso — ${missing.length} chave(s) ainda sem tradução (usa o pt)`, missing.slice(0, 5));
}
const empty = Object.entries(pt).filter(([, v]) => typeof v === "string" && !v.trim());
if (empty.length) { bad++; console.log("pt com texto vazio:", empty.slice(0, 5).map(([k]) => k)); }
process.exit(bad ? 1 : 0);
