/** Gera os ícones do app instalável (PWA) a partir de src/app/icon.png. Uso: node scripts/build-pwa-icons.cjs */
const sharp = require("sharp");
const path = require("path");
const BG = "#3b2616"; // marrom do quadro, mesma cor do tema
const SRC = path.join(__dirname, "..", "src", "app", "icon.png");
const OUT = path.join(__dirname, "..", "public", "icons");

// o logo ocupa `fill` do lado do ícone, centrado, sobre o fundo marrom
async function make(name, size, fill) {
  const inner = Math.round(size * fill);
  const logo = await sharp(SRC).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name));
  console.log(name, size);
}

(async () => {
  await make("icon-192.png", 192, 0.86);
  await make("icon-512.png", 512, 0.86);
  await make("maskable-512.png", 512, 0.62); // zona segura do ícone adaptável (o sistema corta em círculo/quadrado arredondado)
  await make("apple-touch-icon.png", 180, 0.86); // iOS: sem transparência
})();
