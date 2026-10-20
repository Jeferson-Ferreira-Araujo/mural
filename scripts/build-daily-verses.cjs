/**
 * Monta src/data/dailyVerses.json: os versículos da tabela daily_texts (categoria "versiculo") em inglês (New Heart English Bible) e espanhol (Reina-Valera 1909),
 * ambos de domínio público, a partir das mesmas referências. Uso: node scripts/build-daily-verses.cjs <NHEB.json> <SpaRV.json>
 */
const fs = require("fs");
const path = require("path");
const PT = ["Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"];
const EN = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const ES = ["Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías", "Ester", "Job", "Salmos", "Proverbios", "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones", "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías", "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos", "1 Corintios", "2 Corintios", "Gálatas", "Efesios", "Filipenses", "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo", "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis"];
const REFS = ["Salmos 23:1", "Filipenses 4:13", "Josué 1:9", "Jeremias 29:11", "Provérbios 3:5", "Isaías 41:10", "Mateus 11:28", "Salmos 46:1", "Provérbios 16:3", "Salmos 118:24", "João 3:16", "Salmos 121:1-2", "Provérbios 17:17", "Salmos 37:5", "Isaías 40:31", "Salmos 27:1", "Romanos 12:12", "Salmos 34:8", "Gálatas 6:9", "Colossenses 3:23", "1 Tessalonicenses 5:16-18", "Salmos 91:1", "Provérbios 4:23", "Mateus 5:16", "Efésios 4:32", "Salmos 133:1", "Lamentações 3:22-23", "Mateus 6:34"];
const [nhebFile, spaFile] = process.argv.slice(2);
const bibles = { en: JSON.parse(fs.readFileSync(nhebFile, "utf8")), es: JSON.parse(fs.readFileSync(spaFile, "utf8")) };
const names = { en: EN, es: ES };
const clean = (t) => t.replace(/\s+/g, " ").replace(/\[[^\]]*\]/g, "").trim();

/** Salmos: o versículo 1 de muitas edições traz o título ("Salmo de David", "A Song of Ascents") antes do texto; tira o título. A Reina-Valera 1909 também escreve a primeira palavra em MAIÚSCULAS: volta ao normal. */
function tidy(text, lang, isPsalmVerse1) {
  let t = text;
  if (isPsalmVerse1) {
    if (lang === "en") {
      const title = /^(?:(?:A (?:Psalm|Song|Maskil|Miktam|Prayer|Praise)[^.]*|For the Chief Musician[^.]*|By [A-Z][^.]*|According to [^.]*|Of David|To the tune of [^.]*)\.\s*)+/;
      t = t.replace(title, "");
    } else if (lang === "es") {
      const m = /^(?:Salmo|Cántico|Al Músico|Masquil|Mictam|Oración|Para el Músico)[^]*?[.:]\s+(?=[A-ZÁÉÍÓÚÑ]{2,}(?![A-Za-zÁÉÍÓÚÑáéíóúñ]))/.exec(t);
      if (m) t = t.slice(m[0].length);
    }
  }
  if (lang === "es") t = t.replace(/^([A-ZÁÉÍÓÚÑ]{2,})(?![A-Za-zÁÉÍÓÚÑáéíóúñ])/, (w) => w.charAt(0) + w.slice(1).toLowerCase());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const out = REFS.map((ref) => {
  const m = ref.match(/^(.+) (\d+):(\d+)(?:-(\d+))?$/);
  const bi = PT.indexOf(m[1]);
  if (bi < 0) throw new Error("livro: " + ref);
  const c = +m[2], a = +m[3], z = +(m[4] || m[3]);
  const row = { ref };
  for (const lang of ["en", "es"]) {
    const chap = bibles[lang].books[bi].chapters.find((x) => x.chapter === c);
    const texts = [];
    for (let v = a; v <= z; v++) texts.push(tidy(clean(chap.verses.find((x) => x.verse === v).text), lang, bi === 18 && v === 1));
    row[lang] = { text: texts.join(" "), ref: `${names[lang][bi]} ${c}:${a}${z > a ? "-" + z : ""}` };
  }
  return row;
});
fs.writeFileSync(path.join(__dirname, "..", "src", "data", "dailyVerses.json"), JSON.stringify(out, null, 1) + "\n");
console.log(out.length, "versículos gravados");
