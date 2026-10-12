/**
 * Confere src/data/promessas.json contra a Almeida 1911 (damarals/biblias): cada texto tem de ser IDÊNTICO ao(s) versículo(s) da referência.
 * Uso: node scripts/verify-promessas.cjs [caminho/ALM1911.json]   (sem argumento, baixa do GitHub)
 */
const fs = require("fs");
const path = require("path");
const NAMES = ["Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute","1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias","Ester","Jó","Salmos","Provérbios","Eclesiastes","Cantares","Isaías","Jeremias","Lamentações","Ezequiel","Daniel","Oseias","Joel","Amós","Obadias","Jonas","Miqueias","Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias","Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios","Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses","1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago","1 Pedro","2 Pedro","1 João","2 João","3 João","Judas","Apocalipse"];
(async () => {
  const arg = process.argv[2];
  const bible = JSON.parse(arg ? fs.readFileSync(arg, "utf8") : await (await fetch("https://github.com/damarals/biblias/releases/latest/download/ALM1911.json")).text());
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "data", "promessas.json"), "utf8"));
  const errs = [];
  const texts = new Set(), refs = new Set();
  let maxLen = 0, over220 = 0;
  for (const it of list) {
    const keys = Object.keys(it).sort().join(",");
    if (keys !== "promessa,referencia") errs.push("campos extras/faltando em " + it.referencia);
    const m = it.referencia.match(/^(.+) (\d+):(\d+)(?:-(\d+))?$/);
    const bi = m ? NAMES.indexOf(m[1]) : -1;
    if (bi < 0) { errs.push("referência inválida: " + it.referencia); continue; }
    const c = +m[2], a = +m[3], z = +(m[4] || m[3]);
    const vs = bible[bi].chapters[c - 1]?.slice(a - 1, z) ?? [];
    if (vs.length !== z - a + 1) { errs.push("versículo inexistente: " + it.referencia); continue; }
    if (vs.join(" ").trim() !== it.promessa) errs.push("TEXTO DIFERENTE da Almeida 1911: " + it.referencia);
    if (texts.has(it.promessa)) errs.push("texto duplicado: " + it.referencia);
    if (refs.has(it.referencia)) errs.push("referência duplicada: " + it.referencia);
    texts.add(it.promessa); refs.add(it.referencia);
    maxLen = Math.max(maxLen, it.promessa.length);
    if (it.promessa.length > 220) over220++;
  }
  console.log(`promessas: ${list.length} | únicas: ${texts.size} | maior texto: ${maxLen} caracteres | acima de 220: ${over220}`);
  if (list.length < 366) errs.push("menos de 366 promessas");
  if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
  console.log("OK: todos os textos são idênticos à Almeida 1911, sem duplicações.");
})();
