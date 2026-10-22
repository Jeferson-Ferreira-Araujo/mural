import ar_ from "./frases/ar.json";
import de_ from "./frases/de.json";
import en_ from "./frases/en.json";
import es_ from "./frases/es.json";
import fr_ from "./frases/fr.json";
import hi_ from "./frases/hi.json";
import it_ from "./frases/it.json";
import nl_ from "./frases/nl.json";
import pl_ from "./frases/pl.json";
import pt_ from "./frases/pt.json";
import ru_ from "./frases/ru.json";
import tr_ from "./frases/tr.json";
import uk_ from "./frases/uk.json";

/** 365 frases motivacionais por idioma (mesma ordem em todos). Idiomas ausentes usam o inglês. */
export const FRASES: Record<string, readonly string[]> = {
  ar: ar_,
  de: de_,
  en: en_,
  es: es_,
  fr: fr_,
  hi: hi_,
  it: it_,
  nl: nl_,
  pl: pl_,
  pt: pt_,
  ru: ru_,
  tr: tr_,
  uk: uk_,
};
