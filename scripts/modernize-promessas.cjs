/**
 * Atualiza a ortografia da Almeida 1911 (domínio público) para o português do Brasil de hoje, sem mudar as palavras do texto.
 * Entrada: scripts/promessas-almeida1911.json (texto literal). Saída: src/data/promessas.json. Uso: node scripts/modernize-promessas.cjs
 */
const fs = require("fs");
const path = require("path");

// frases inteiras (antes de tudo): concordância e trechos que mudam de forma
const PHRASES = [
  ["um concerto perpetuo", "uma aliança perpétua"], ["por concerto perpetuo", "por aliança perpétua"], ["um concerto eterno", "uma aliança eterna"], ["o seu concerto", "a sua aliança"], ["do concerto", "da aliança"],
  ["sem duvida", "sem dúvida"], ["oliveira, tem dado", "oliveira, têm dado"], ["Senhor todo poderoso", "Senhor Todo-Poderoso"], ["Confia do Senhor", "Confia ao Senhor"], ["a te sustentarei", "e te sustentarei"],
  ["filha de Sião", "filha de Sião"], ["Sião uma pedra", "Sião uma pedra"], ["alegra-te ó filha", "alegra-te, ó filha"], ["fortaleza ó presos", "fortaleza, ó presos"], ["E, eis que, presto venho", "E eis que venho sem demora"], ["também hoje vos anuncio", "também hoje vos anuncio"],
  ["o meu concerto", "a minha aliança"], ["o concerto", "a aliança"],
  ["n'Elle", "Nele"], ["d'Elle", "Dele"], ["t'o", "to"], ["que has de", "que hás de"], ["Temaes pois:", "Temais, pois:"], ["temaes pois:", "temais, pois:"],
  ["d'animo", "de ânimo"], ["d'agua", "de água"], ["d'aguas", "de águas"], ["d'Israel", "de Israel"], ["d'Aarão", "de Arão"],
  ["lh'o", "lho"], ["vol-o", "vo-lo"], ["vol-a", "vo-la"],
];

// palavra inteira (minúsculas) -> forma atual
const W = {
  // nomes
  abrahão: "abraão", jacob: "jacó", david: "davi", jerusalem: "jerusalém", jehovah: "jeová", judea: "judeia", jeshurun: "jesurum", libano: "líbano", aarão: "arão", alpha: "alfa", christo: "cristo", sancto: "santo", sanctos: "santos", samaria: "samaria",
  // acentos e grafias
  abundancia: "abundância", agua: "água", aguas: "águas", ahi: "aí", alguem: "alguém", ninguem: "ninguém", tambem: "também", tres: "três", altissimo: "altíssimo",
  angustia: "angústia", angustias: "angústias", animo: "ânimo", arvore: "árvore", arvores: "árvores", azas: "asas", bemaventurado: "bem-aventurado", bemaventurados: "bem-aventurados",
  bemditas: "benditas", bemdito: "bendito", bemdizendo: "bendizendo", benção: "bênção", bençãos: "bênçãos", beneficencia: "beneficência", beneficencias: "beneficências", benevolencia: "benevolência",
  carmezim: "carmesim", cançada: "cansada", cançado: "cansado", cançados: "cansados", cançarão: "cansarão", cancemos: "cansemos", descançado: "descansado", descançará: "descansará", descanço: "descanso",
  comnosco: "conosco", comsigo: "consigo", comtigo: "contigo", comvosco: "convosco", concupiscencia: "concupiscência", consummação: "consumação", summo: "sumo", sufficiencia: "suficiência",
  creatura: "criatura", creou: "criou", crêdes: "credes", crêde: "crede", crêem: "creem", crêr: "crer", crêrem: "crerem", crêres: "creres", dadivas: "dádivas", delicias: "delícias", descendencia: "descendência", detraz: "detrás", dextra: "destra",
  diluvio: "dilúvio", dizimos: "dízimos", dôr: "dor", dôres: "dores", déres: "deres", edificio: "edifício", egrejas: "igrejas", emquanto: "enquanto", escandalo: "escândalo", espirito: "espírito",
  exalçado: "exaltado", exercicio: "exercício", exercito: "exército", exercitos: "exércitos", fóra: "fora", fôr: "for", corôa: "coroa", gloria: "glória", grandissimas: "grandíssimas", idolos: "ídolos", immundicias: "imundícias",
  impio: "ímpio", impios: "ímpios", impossivel: "impossível", possivel: "possível", incorruptivel: "incorruptível", incontaminavel: "incontaminável", injuria: "injúria", inutil: "inútil", util: "útil", jubilo: "júbilo",
  juizo: "juízo", juizos: "juízos", lagrima: "lágrima", lagrimas: "lágrimas", lingua: "língua", logar: "lugar", logares: "lugares", longanimo: "longânimo", misericordia: "misericórdia", misericordias: "misericórdias",
  nevoa: "névoa", necessario: "necessário", omnipotente: "onipotente", opprobrio: "opróbrio", orphãos: "órfãos", paciencia: "paciência", paraiso: "paraíso", perpetua: "perpétua", perpetuo: "perpétuo", proprio: "próprio",
  redemptor: "redentor", refrigerio: "refrigério", refugio: "refúgio", resplandor: "resplendor", resuscitou: "ressuscitou", resuscitarei: "ressuscitarei", resurreição: "ressurreição", saude: "saúde", seculos: "séculos",
  sequidões: "securas", similhantes: "semelhantes", solicitos: "solícitos", somno: "sono", sómente: "somente", supplicas: "súplicas", tabernaculo: "tabernáculo", teem: "têm", trasbordando: "transbordando", trasbordarão: "transbordarão",
  tyranno: "tirano", unigenito: "unigênito", victoria: "vitória", vae: "vai", sahi: "saí", saida: "saída", sera: "será", ha: "há", ás: "às", á: "à", áquelle: "àquele", áquelles: "àqueles", ó: "ó", sêde: "sede", pozeres: "puseres", puzeres: "puseres",
  quizer: "quiser", quizerdes: "quiserdes", pizar: "pisar", preza: "presa", romeira: "romãzeira", concerto: "aliança", irreprehensiveis: "irrepreensíveis", aprefeiçoará: "aperfeiçoará", alimpae: "limpai", alimpará: "limpará",
  attrahi: "atraí", attrahirei: "atrairei", baptizado: "batizado", prophetizarão: "profetizarão", escripto: "escrito", escriptura: "escritura", vezes: "vezes", opéra: "opera", demais: "demais", máus: "maus",
  "d": "de", "pôl-o-hei": "pô-lo-ei", "coroal-o-has": "coroá-lo-ás", "achal-a-ha": "achá-la-á", "fartal-o-hei": "fartá-lo-ei", "perdel-a-ha": "perdê-la-á", "poupal-os-hei": "poupá-los-ei", "tel-o-heis": "tê-lo-eis",
  augmentarás: "aumentarás", augmentarão: "aumentarão", destruida: "destruída", agradaveis: "agradáveis", aguias: "águias", beneficio: "benefício", contrario: "contrário", dominio: "domínio", familias: "famílias", discipulo: "discípulo", principio: "princípio", primicias: "primícias", salario: "salário", ultimo: "último", omega: "ômega", ácerca: "acerca", amen: "amém", has: "hás", sustem: "sustém", tosquenejará: "cochilará",
  "vo-lo": "vo-lo", "vo-la": "vo-la", "dêm": "deem", "vêm": "vêm", "sustem": "sustém",
};

// o que sobra de regra geral, na palavra já em minúsculas
function generic(w) {
  return w
    .replace(/ph/g, "f").replace(/th/g, "t").replace(/y/g, "i")
    .replace(/ff/g, "f").replace(/ll/g, "l").replace(/nn/g, "n").replace(/mm/g, "m").replace(/pp/g, "p").replace(/tt/g, "t").replace(/gg/g, "g")
    .replace(/cc/g, "c").replace(/cç/g, "ç").replace(/ct/g, "t").replace(/mn/g, "n").replace(/pt(?=i|o|a)/g, (m) => m)
    .replace(/aes$/, "ais").replace(/ae(?=$|-)/, "ai");
}
// "-ha", "-hei" etc. dos futuros com pronome (dar-lhe-hei -> dar-lhe-ei)
function clitic(w) {
  return w.replace(/-hei(?=$|-)/g, "-ei").replace(/-heis(?=$|-)/g, "-eis").replace(/-has(?=$|-)/g, "-ás").replace(/-ha(?=$|-)/g, "-á").replace(/-hão(?=$|-)/g, "-ão");
}

function fix(text) {
  let t = text;
  for (const [a, b] of PHRASES) t = t.split(a).join(b);
  t = t.replace(/ha de/g, "há de");
  t = t.replace(/\b([dnDN])['’](?=[eaioEAIO])/g, "$1"); // d'elle -> delle ; n'elle -> nelle
  t = t.replace(/[\p{L}]+(?:-[\p{L}]+)*/gu, (tok) => {
    const lower = tok.toLowerCase();
    let out;
    if (W[lower] !== undefined) out = W[lower];
    else {
      out = clitic(lower)
        .split("-")
        .map((part) => (/^(á|ás|ão|ei|eis)$/.test(part) ? part : W[part] !== undefined ? W[part] : generic(part)))
        .join("-");
      if (W[out] !== undefined) out = W[out];
    }
    return tok[0] !== tok[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out;
  });
  return t.replace("Todo-poderoso", "Todo-Poderoso");
}

module.exports = { fix };
if (require.main === module) main();
function main() {
const src = JSON.parse(fs.readFileSync(path.join(__dirname, "promessas-almeida1911.json"), "utf8"));
const out = src.map((p) => ({ promessa: fix(p.promessa), referencia: p.referencia }));
fs.writeFileSync(path.join(__dirname, "..", "src", "data", "promessas.json"), JSON.stringify(out, null, 1) + "\n");
console.log(out.length + " promessas atualizadas");
}
