/**
 * Monta src/data/promessas.en.json (New Heart English Bible, domínio público) e src/data/promessas.es.json (Reina-Valera 1909, domínio público)
 * na MESMA ordem e com as MESMAS referências de src/data/promessas.json (Almeida Revista e Atualizada), para o versículo do dia ser o mesmo em qualquer idioma.
 * Uso: node scripts/build-promessas-i18n.cjs <NHEB.json> <SpaRV.json>
 * (arquivos de github.com/scrollmapper/bible_databases, pasta formats/json)
 */
const fs = require("fs");
const path = require("path");

const PT = ["Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"];
const EN = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const ES = ["Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías", "Ester", "Job", "Salmos", "Proverbios", "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones", "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías", "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos", "1 Corintios", "2 Corintios", "Gálatas", "Efesios", "Filipenses", "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo", "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis"];

const [nhebFile, spaFile] = process.argv.slice(2);
if (!nhebFile || !spaFile) throw new Error("uso: node scripts/build-promessas-i18n.cjs NHEB.json SpaRV.json");
const bibles = { en: JSON.parse(fs.readFileSync(nhebFile, "utf8")), es: JSON.parse(fs.readFileSync(spaFile, "utf8")) };
const names = { en: EN, es: ES };
const base = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "data", "promessas.json"), "utf8"));
const clean = (t) => t.replace(/\s+/g, " ").replace(/\[[^\]]*\]/g, "").trim();

for (const lang of ["en", "es"]) {
  const out = [];
  for (const it of base) {
    const m = it.referencia.match(/^(.+) (\d+):(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error("referência inválida: " + it.referencia);
    const bi = PT.indexOf(m[1]);
    if (bi < 0) throw new Error("livro desconhecido: " + m[1]);
    const c = +m[2], a = +m[3], z = +(m[4] || m[3]);
    const chap = bibles[lang].books[bi].chapters.find((x) => x.chapter === c);
    const verses = [];
    for (let v = a; v <= z; v++) {
      const f = chap?.verses.find((x) => x.verse === v);
      if (!f) throw new Error(`versículo inexistente (${lang}): ${it.referencia}`);
      verses.push(clean(f.text));
    }
    out.push({ promessa: verses.join(" "), referencia: `${names[lang][bi]} ${c}:${a}${z > a ? "-" + z : ""}` });
  }
  const file = path.join(__dirname, "..", "src", "data", `promessas.${lang}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
  console.log(lang, out.length, "gravadas em", file);
}
