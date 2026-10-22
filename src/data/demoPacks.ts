import type { Locale } from "@/i18n/config";
import de from "./demo/de.json";
import ja from "./demo/ja.json";
import zh from "./demo/zh.json";
import ru from "./demo/ru.json";
import fr from "./demo/fr.json";
import it from "./demo/it.json";
import nl from "./demo/nl.json";
import pl from "./demo/pl.json";
import uk from "./demo/uk.json";
import tr from "./demo/tr.json";
import ar from "./demo/ar.json";
import hi from "./demo/hi.json";
import id from "./demo/id.json";
import vi from "./demo/vi.json";
import th from "./demo/th.json";
import ko from "./demo/ko.json";

/** Textos de um cartão do mural de exemplo que mudam de idioma (o resto do cartão fica como está). */
export type Over = { text?: string; caption?: string; title?: string; items?: string[]; name?: string };

export type SampleText = { bibleText: string; bibleRef: string; motivation: string; birthday: string; trip: string; poll: string; yes: string; no: string; top3: string; food: string[]; book: string; together: string; counter: string };

/** Formas de plural (categorias do Intl.PluralRules); `{n}` vira o número. */
export type PluralForms = Partial<Record<"zero" | "one" | "two" | "few" | "many" | "other", string>>;

export type WtPack = {
  day: string; days: string; hours: string; min: string; sec: string;
  dayToStart: string; daysToStart: string; arrived: string;
  weekInitials: string[]; defQuestion: string;
  ago: PluralForms; pages: string; vote: string; votes: string;
  /** "{n}" é a posição (1, 2, 3) */
  place: string;
  defEvent: string; defTogether: string; defYes: string; defNo: string; defText: string; defCity: string; defCountdownTitle: string;
  weather: { storm: string; snow: string; sleet: string; rainHeavy: string; rainLight: string; rain: string; fog: string; cloudy: string; partly: string; clearNight: string; clearDay: string; noData: string; loading: string; yourLocation: string };
  zones: Record<string, string>;
  fortunes: string[];
};

export type Pack = { demo: Record<string, Over>; sample: SampleText; wt: WtPack };

/** Mural de exemplo, amostras de displays e textos dos widgets nos idiomas que não são pt, en e es (esses ficam em demoText.ts e wt.ts). */
export const PACKS: Partial<Record<Locale, Pack>> = {
  de, ja, zh, ru, fr, it, nl, pl, uk, tr, ar, hi, id, vi, th, ko,
} as unknown as Partial<Record<Locale, Pack>>;
