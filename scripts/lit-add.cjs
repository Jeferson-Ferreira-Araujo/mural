// Acrescenta traduções de textos em português ao namespace "lit" dos catálogos en e es.
// Uso: node scripts/lit-add.cjs arquivo.txt   (cada linha: português|inglês|espanhol; texto sem "|")
const fs = require("fs");
const path = require("path");
const litKey = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "h" + h.toString(36);
};
const root = path.join(__dirname, "..", "messages");
const cat = { en: JSON.parse(fs.readFileSync(path.join(root, "en.json"), "utf8")), es: JSON.parse(fs.readFileSync(path.join(root, "es.json"), "utf8")) };
cat.en.lit = cat.en.lit || {};
cat.es.lit = cat.es.lit || {};
let n = 0;
for (const line of fs.readFileSync(process.argv[2], "utf8").split("\n").filter((l) => l.trim())) {
  const [pt, en, es] = line.split("|");
  if (!pt || !en || !es) { console.log("linha incompleta:", line.slice(0, 60)); continue; }
  const k = litKey(pt.trim());
  cat.en.lit[k] = en.trim();
  cat.es.lit[k] = es.trim();
  n++;
}
for (const l of ["en", "es"]) fs.writeFileSync(path.join(root, l + ".json"), JSON.stringify(cat[l], null, 2) + "\n");
console.log("traduções gravadas:", n);
