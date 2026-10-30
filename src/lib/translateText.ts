// códigos que o serviço de tradução entende (o resto é igual ao do site)
const CODE: Record<string, string> = { zh: "zh-CN" };

/** Traduz do português para o idioma `to`; devolve null se o serviço falhar. */
export async function translateText(text: string, to: string): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt-BR|${CODE[to] ?? to}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const j = (await res.json()) as { responseStatus?: number | string; responseData?: { translatedText?: string } };
    const out = j.responseData?.translatedText;
    if (Number(j.responseStatus) !== 200 || !out || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) return null;
    return out;
  } catch {
    return null;
  }
}
