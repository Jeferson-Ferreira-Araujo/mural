/**
 * Monta src/data/promessas.json a partir da Bíblia Almeida 1911 (domínio público), repositório github.com/damarals/biblias.
 * Uso: node scripts/build-promessas.cjs [caminho/para/ALM1911.json]   (sem argumento, baixa a edição do GitHub)
 * Texto copiado literalmente (versículos do trecho unidos por um espaço); a ordem do ciclo é um sorteio fixo (semente), igual para sempre.
 */
const fs = require("fs");
const path = require("path");

const URL = "https://github.com/damarals/biblias/releases/latest/download/ALM1911.json";
const NAMES = ["Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute","1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias","Ester","Jó","Salmos","Provérbios","Eclesiastes","Cantares","Isaías","Jeremias","Lamentações","Ezequiel","Daniel","Oseias","Joel","Amós","Obadias","Jonas","Miqueias","Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias","Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios","Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses","1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago","1 Pedro","2 Pedro","1 João","2 João","3 João","Judas","Apocalipse"];

async function loadBible() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(fs.readFileSync(arg, "utf8"));
  const res = await fetch(URL);
  if (!res.ok) throw new Error("download falhou: " + res.status);
  return JSON.parse(await res.text());
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

(async () => {
  const bible = await loadBible();
  const refs = fs.readFileSync(path.join(__dirname, "promessas-refs.txt"), "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
  const items = [];
  const seen = new Set();
  for (const r of refs) {
    const m = r.match(/^(\S+) (\d+):(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error("referência inválida: " + r);
    const bi = bible.findIndex((b) => b.abbrev === m[1]);
    if (bi < 0) throw new Error("livro inexistente: " + r);
    const c = +m[2], a = +m[3], z = +(m[4] || m[3]);
    const verses = bible[bi].chapters[c - 1]?.slice(a - 1, z);
    if (!verses || verses.length !== z - a + 1 || verses.some((v) => !v)) throw new Error("versículo inexistente: " + r);
    const promessa = verses.join(" ").trim();
    if (seen.has(promessa)) throw new Error("duplicada: " + r);
    seen.add(promessa);
    items.push({ promessa, referencia: `${NAMES[bi]} ${c}:${a}${z > a ? "-" + z : ""}` });
  }
  // ordem do ciclo: embaralhamento determinístico (Fisher–Yates com semente fixa)
  const rnd = mulberry32(20261001);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const out = path.join(__dirname, "..", "src", "data", "promessas.json");
  fs.writeFileSync(out, JSON.stringify(items, null, 1) + "\n");
  console.log(items.length + " promessas gravadas em " + out);
})();
