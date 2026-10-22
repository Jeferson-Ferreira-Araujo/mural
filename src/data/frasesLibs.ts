import de_ from "./frases/de.json";
import en_ from "./frases/en.json";
import es_ from "./frases/es.json";
import pt_ from "./frases/pt.json";

/** 365 frases motivacionais por idioma (mesma ordem em todos). Idiomas ausentes usam o inglês. */
export const FRASES: Record<string, readonly string[]> = {
  de: de_,
  en: en_,
  es: es_,
  pt: pt_,
};
