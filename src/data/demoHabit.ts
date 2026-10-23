import type { Locale } from "@/i18n/config";

/** Textos das amostras dos displays de hábito e de humor (mural de exemplo e vitrine da loja), um por idioma. */
export const HABIT_SAMPLE: Record<Locale, { habit: string; mood: string }> = {
  pt: { habit: "Treinar", mood: "Dia incrível!" },
  en: { habit: "Workout", mood: "Amazing day!" },
  es: { habit: "Entrenar", mood: "¡Día increíble!" },
  fr: { habit: "Sport", mood: "Journée géniale !" },
  it: { habit: "Allenarsi", mood: "Giornata fantastica!" },
  de: { habit: "Training", mood: "Toller Tag!" },
  nl: { habit: "Sporten", mood: "Geweldige dag!" },
  pl: { habit: "Trening", mood: "Świetny dzień!" },
  uk: { habit: "Тренування", mood: "Чудовий день!" },
  ru: { habit: "Тренировка", mood: "Отличный день!" },
  tr: { habit: "Spor", mood: "Harika bir gün!" },
  ar: { habit: "التمرين", mood: "يوم رائع!" },
  hi: { habit: "कसरत", mood: "शानदार दिन!" },
  id: { habit: "Olahraga", mood: "Hari yang hebat!" },
  vi: { habit: "Tập luyện", mood: "Một ngày tuyệt vời!" },
  th: { habit: "ออกกำลังกาย", mood: "วันที่แสนวิเศษ!" },
  ko: { habit: "운동", mood: "최고의 하루!" },
  ja: { habit: "運動", mood: "最高の一日！" },
  zh: { habit: "锻炼", mood: "美好的一天！" },
};
