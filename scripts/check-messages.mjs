// Confere os catálogos de tradução:
//  - en e es não podem ter chaves que o pt não tem (exceto o namespace "lit", que só existe fora do pt: o texto original é o próprio português);
//  - o pt não pode ficar com texto vazio;
//  - todo texto precisa ser uma mensagem ICU válida, e os marcadores ({v0}, <s0>…) de en/es têm que ser os mesmos do pt.
// Chave que só falta em en/es não quebra (cai no pt), mas é avisada aqui.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let parse = null;
try {
  ({ parse } = require("@formatjs/icu-messageformat-parser"));
} catch {
  console.log("aviso: @formatjs/icu-messageformat-parser não encontrado; pulando a validação ICU");
}
const read = (n) => JSON.parse(fs.readFileSync(new URL(`../messages/${n}.json`, import.meta.url), "utf8"));
const flat = (o, p = "", out = {}) => {
  for (const [k, v] of Object.entries(o)) typeof v === "object" && v ? flat(v, p + k + ".", out) : (out[p + k] = v);
  return out;
};
// nomes dos argumentos e das tags de uma mensagem (olhando a árvore ICU, para não confundir com o texto das opções de plural/select)
const marks = (s) => {
  const out = new Set();
  const walk = (els) => {
    for (const e of els) {
      if (e.type === 0 || e.type === 7) continue;
      if (e.value) out.add(e.value);
      if (e.children) walk(e.children);
      if (e.options) for (const o of Object.values(e.options)) walk(o.value);
    }
  };
  try {
    walk(parse(String(s)));
  } catch {
    /* mensagem inválida: já avisada por icu() */
  }
  return out;
};
const pt = flat(read("pt"));
let bad = 0;
const icu = (l, k, v) => {
  if (!parse || typeof v !== "string") return;
  try {
    parse(v);
  } catch (e) {
    bad++;
    console.log(`${l}: mensagem ICU inválida em ${k}: ${String(e.message).slice(0, 80)} | ${v.slice(0, 60)}`);
  }
};
for (const [k, v] of Object.entries(pt)) icu("pt", k, v);
for (const l of ["en", "es", "de", "ja", "zh", "ru"]) {
  const m = flat(read(l));
  const extra = Object.keys(m).filter((k) => !(k in pt) && !k.startsWith("lit."));
  const missing = Object.keys(pt).filter((k) => !(k in m));
  if (extra.length) { bad++; console.log(`${l}: ${extra.length} chave(s) que o pt não tem`, extra.slice(0, 5)); }
  if (missing.length) console.log(`${l}: aviso — ${missing.length} chave(s) ainda sem tradução (usa o pt)`, missing.slice(0, 5));
  for (const [k, v] of Object.entries(m)) {
    icu(l, k, v);
    if (k in pt && typeof v === "string") {
      const a = marks(pt[k]), b = marks(v);
      const alien = [...b].filter((x) => !a.has(x)); // marcador que o pt não tem
      const lost = [...a].filter((x) => !b.has(x) && /^[sn]\d+$/.test(x)); // tag que sumiu
      if (alien.length || lost.length) { bad++; console.log(`${l}: marcadores diferentes do pt em ${k}: sobra ${alien} / falta ${lost}`); }
    }
  }
}
const empty = Object.entries(pt).filter(([, v]) => typeof v === "string" && !v.trim());
if (empty.length) { bad++; console.log("pt com texto vazio:", empty.slice(0, 5).map(([k]) => k)); }
process.exit(bad ? 1 : 0);
