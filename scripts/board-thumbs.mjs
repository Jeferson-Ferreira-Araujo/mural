// Gera as versões menores dos fundos do mural, sozinho, a cada build (e no `npm run dev`).
// Para cada /public/img/quadro-NOME.webp cria:
//   quadro-NOME-s.webp  (480 px): só para fundo desfocado (ambiente); o mural em si usa sempre a imagem grande
// Fundo novo? É só colocar o quadro-NOME.webp em public/img: as duas versões nascem no próximo build. Só recria se o original for mais novo.
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.log("board-thumbs: sharp indisponível, pulando (as versões já geradas continuam valendo)");
  process.exit(0); // nunca derruba o build
}

const dir = path.join(process.cwd(), "public", "img");
const SIZES = [
  { suffix: "-s", width: 480, quality: 58 },
];

const newer = async (a, b) => {
  try {
    return (await stat(a)).mtimeMs <= (await stat(b)).mtimeMs;
  } catch {
    return false;
  }
};

let made = 0;
for (const f of await readdir(dir)) {
  if (!/^quadro-[a-z0-9-]+\.webp$/.test(f) || /-(m|s)\.webp$/.test(f)) continue;
  const src = path.join(dir, f);
  for (const { suffix, width, quality } of SIZES) {
    const out = path.join(dir, f.replace(/\.webp$/, `${suffix}.webp`));
    if (await newer(src, out)) continue; // já está em dia
    await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(out);
    made++;
  }
}
console.log(made ? `board-thumbs: ${made} imagem(ns) gerada(s)` : "board-thumbs: tudo em dia");
