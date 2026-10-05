/** Foto de perfil redonda; sem foto, a inicial do nome sobre uma cor fixa por pessoa. `className` define o tamanho (ex.: "size-10"). */
const COLORS = ["#d98a2b", "#5aa5ff", "#e0657a", "#4fae6a", "#9a6bd6", "#d2a21c", "#3fa3a0"];

export function Avatar({ src, name, className = "size-10", plus = false }: { src?: string | null; name: string; className?: string; /** conta PLUS: borda dourada em volta da foto */ plus?: boolean }) {
  const color = COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
  const frame = plus
    ? "shrink-0 rounded-full border-[0.16em] border-[#f2b81c] shadow-[0_0_0_0.07em_#a86a00,0_0.1em_0.5em_rgba(220,150,0,.55)]"
    : "shrink-0 rounded-full border-2 border-white/70 shadow-[0_0.1em_0.4em_rgba(0,0,0,.3)]";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`Foto de ${name}${plus ? " (PLUS)" : ""}`} draggable={false} className={`${className} ${frame} bg-[#e9e5df] object-cover`} />
  ) : (
    // a inicial é desenhada em SVG: escala sozinha com o tamanho do círculo
    <svg role="img" aria-label={`Sem foto: ${name}`} viewBox="0 0 100 100" className={`${className} ${frame}`} style={{ background: color }}>
      <text x="50" y="50" fill="#fff" fontSize="46" fontWeight="700" textAnchor="middle" dominantBaseline="central" fontFamily="inherit">
        {name.slice(0, 1).toUpperCase()}
      </text>
    </svg>
  );
}
