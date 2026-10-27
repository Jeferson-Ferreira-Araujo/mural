/**
 * Textos da tela de erro nos 19 idiomas. Ficam num arquivo próprio (e não nas mensagens do next-intl) porque o global-error.tsx
 * aparece justamente quando o resto do site, provedores inclusive, não carregou.
 */
export type ErrorCopy = { title: string; body: string; retry: string; home: string };

export const ERROR_TEXT: Record<string, ErrorCopy> = {
  pt: { title: "Algo deu errado", body: "Já fomos avisados. Tente de novo; se continuar, volte ao início.", retry: "Tentar de novo", home: "Ir para o início" },
  en: { title: "Something went wrong", body: "We have been notified. Try again; if it keeps happening, go back to the start.", retry: "Try again", home: "Go to the start" },
  es: { title: "Algo salió mal", body: "Ya recibimos el aviso. Inténtalo de nuevo; si sigue, vuelve al inicio.", retry: "Intentar de nuevo", home: "Ir al inicio" },
  fr: { title: "Une erreur s'est produite", body: "Nous avons été prévenus. Réessayez ; si cela continue, revenez à l'accueil.", retry: "Réessayer", home: "Aller à l'accueil" },
  it: { title: "Qualcosa è andato storto", body: "Siamo stati avvisati. Riprova; se continua, torna alla home.", retry: "Riprova", home: "Vai alla home" },
  de: { title: "Etwas ist schiefgelaufen", body: "Wir wurden benachrichtigt. Versuche es erneut; falls es weitergeht, geh zurück zum Start.", retry: "Erneut versuchen", home: "Zur Startseite" },
  nl: { title: "Er ging iets mis", body: "We zijn op de hoogte gebracht. Probeer het opnieuw; blijft het gebeuren, ga dan terug naar het begin.", retry: "Opnieuw proberen", home: "Naar het begin" },
  pl: { title: "Coś poszło nie tak", body: "Dostaliśmy powiadomienie. Spróbuj ponownie; jeśli nadal się powtarza, wróć na stronę główną.", retry: "Spróbuj ponownie", home: "Przejdź do strony głównej" },
  uk: { title: "Щось пішло не так", body: "Ми вже отримали сповіщення. Спробуйте ще раз; якщо не минає, поверніться на початок.", retry: "Спробувати ще раз", home: "На головну" },
  ru: { title: "Что-то пошло не так", body: "Мы уже получили уведомление. Попробуйте ещё раз; если не проходит, вернитесь на главную.", retry: "Попробовать снова", home: "На главную" },
  tr: { title: "Bir şeyler ters gitti", body: "Haberdar olduk. Tekrar dene; devam ederse ana sayfaya dön.", retry: "Tekrar dene", home: "Ana sayfaya git" },
  ar: { title: "حدث خطأ ما", body: "تم إبلاغنا بالفعل. حاول مرة أخرى، وإذا استمر ذلك فعُد إلى الصفحة الرئيسية.", retry: "حاول مرة أخرى", home: "العودة إلى الرئيسية" },
  hi: { title: "कुछ गड़बड़ हो गई", body: "हमें सूचना मिल चुकी है। फिर से कोशिश करें; अगर बना रहे तो शुरुआत पर लौट जाएँ।", retry: "फिर से कोशिश करें", home: "शुरुआत पर जाएँ" },
  id: { title: "Terjadi kesalahan", body: "Kami sudah diberi tahu. Coba lagi; jika terus terjadi, kembali ke beranda.", retry: "Coba lagi", home: "Ke beranda" },
  vi: { title: "Đã xảy ra lỗi", body: "Chúng tôi đã được thông báo. Hãy thử lại; nếu vẫn lỗi, quay về trang đầu.", retry: "Thử lại", home: "Về trang đầu" },
  th: { title: "เกิดข้อผิดพลาดบางอย่าง", body: "เราได้รับแจ้งแล้ว ลองอีกครั้ง หากยังเป็นอยู่ให้กลับไปหน้าแรก", retry: "ลองอีกครั้ง", home: "ไปหน้าแรก" },
  ko: { title: "문제가 발생했어요", body: "이미 알림을 받았어요. 다시 시도해 주세요. 계속되면 처음으로 돌아가 주세요.", retry: "다시 시도", home: "처음으로" },
  ja: { title: "問題が発生しました", body: "すでに通知を受け取っています。もう一度お試しください。続く場合はトップに戻ってください。", retry: "もう一度試す", home: "トップへ" },
  zh: { title: "出了点问题", body: "我们已收到通知。请重试；如果仍然出错，请回到首页。", retry: "重试", home: "回到首页" },
};

/** Idioma da pessoa sem depender dos provedores: cookie do site, depois o idioma do navegador. */
export function errorCopy(): ErrorCopy {
  let code = "pt";
  try {
    const c = document.cookie.match(/(?:^|; )pinz-locale=([^;]+)/)?.[1];
    code = c ?? navigator.language ?? "pt";
  } catch {}
  const base = code.toLowerCase().split("-")[0];
  return ERROR_TEXT[base] ?? ERROR_TEXT.pt;
}
