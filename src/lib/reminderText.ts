import type { Locale } from "@/i18n/config";

/** Texto do lembrete diário do hábito (notificação no aparelho e e-mail), em cada idioma. {habit} é trocado pelo nome do hábito. */
export const REMINDER_TEXT: Record<Locale, { body: string; subject: string; mail: string }> = {
  pt: { body: "Você ainda não marcou “{habit}” hoje. Mantenha a sua sequência!", subject: "Lembrete: {habit}", mail: "Você ainda não marcou “{habit}” hoje. Abra o Pinz e marque para manter a sua sequência." },
  en: { body: "You haven’t checked “{habit}” today. Keep your streak going!", subject: "Reminder: {habit}", mail: "You haven’t checked “{habit}” today. Open Pinz and mark it to keep your streak going." },
  es: { body: "Aún no marcaste “{habit}” hoy. ¡Mantén tu racha!", subject: "Recordatorio: {habit}", mail: "Aún no marcaste “{habit}” hoy. Abre Pinz y márcalo para mantener tu racha." },
  fr: { body: "Vous n’avez pas encore coché « {habit} » aujourd’hui. Gardez votre série !", subject: "Rappel : {habit}", mail: "Vous n’avez pas encore coché « {habit} » aujourd’hui. Ouvrez Pinz et cochez-le pour garder votre série." },
  it: { body: "Oggi non hai ancora segnato “{habit}”. Mantieni la tua serie!", subject: "Promemoria: {habit}", mail: "Oggi non hai ancora segnato “{habit}”. Apri Pinz e segnalo per mantenere la tua serie." },
  de: { body: "Du hast „{habit}“ heute noch nicht abgehakt. Halte deine Serie am Laufen!", subject: "Erinnerung: {habit}", mail: "Du hast „{habit}“ heute noch nicht abgehakt. Öffne Pinz und hake es ab, um deine Serie zu halten." },
  nl: { body: "Je hebt “{habit}” vandaag nog niet afgevinkt. Hou je reeks vol!", subject: "Herinnering: {habit}", mail: "Je hebt “{habit}” vandaag nog niet afgevinkt. Open Pinz en vink het af om je reeks vol te houden." },
  pl: { body: "Nie zaznaczyłeś jeszcze dziś „{habit}”. Utrzymaj swoją serię!", subject: "Przypomnienie: {habit}", mail: "Nie zaznaczyłeś jeszcze dziś „{habit}”. Otwórz Pinz i zaznacz, aby utrzymać serię." },
  uk: { body: "Ви ще не позначили «{habit}» сьогодні. Збережіть свою серію!", subject: "Нагадування: {habit}", mail: "Ви ще не позначили «{habit}» сьогодні. Відкрийте Pinz і позначте, щоб зберегти серію." },
  ru: { body: "Вы ещё не отметили «{habit}» сегодня. Сохраните свою серию!", subject: "Напоминание: {habit}", mail: "Вы ещё не отметили «{habit}» сегодня. Откройте Pinz и отметьте, чтобы сохранить серию." },
  tr: { body: "Bugün “{habit}” için henüz işaret koymadınız. Serinizi sürdürün!", subject: "Hatırlatma: {habit}", mail: "Bugün “{habit}” için henüz işaret koymadınız. Pinz’i açın ve serinizi sürdürmek için işaretleyin." },
  ar: { body: "لم تُعلّم «{habit}» اليوم بعد. حافظ على سلسلتك!", subject: "تذكير: {habit}", mail: "لم تُعلّم «{habit}» اليوم بعد. افتح Pinz وعلّمها للحفاظ على سلسلتك." },
  hi: { body: "आपने आज “{habit}” अभी तक चिह्नित नहीं किया। अपना सिलसिला बनाए रखें!", subject: "याद दिलाना: {habit}", mail: "आपने आज “{habit}” अभी तक चिह्नित नहीं किया। Pinz खोलें और सिलसिला बनाए रखने के लिए चिह्नित करें।" },
  id: { body: "Anda belum menandai “{habit}” hari ini. Pertahankan rangkaian Anda!", subject: "Pengingat: {habit}", mail: "Anda belum menandai “{habit}” hari ini. Buka Pinz dan tandai untuk mempertahankan rangkaian Anda." },
  vi: { body: "Hôm nay bạn chưa đánh dấu “{habit}”. Hãy giữ chuỗi của bạn!", subject: "Nhắc nhở: {habit}", mail: "Hôm nay bạn chưa đánh dấu “{habit}”. Mở Pinz và đánh dấu để giữ chuỗi của bạn." },
  th: { body: "วันนี้คุณยังไม่ได้ทำเครื่องหมาย “{habit}” รักษาสถิติต่อเนื่องของคุณไว้นะ!", subject: "เตือนความจำ: {habit}", mail: "วันนี้คุณยังไม่ได้ทำเครื่องหมาย “{habit}” เปิด Pinz แล้วทำเครื่องหมายเพื่อรักษาสถิติต่อเนื่องของคุณ" },
  ko: { body: "오늘 아직 “{habit}”을(를) 체크하지 않았어요. 연속 기록을 이어가세요!", subject: "알림: {habit}", mail: "오늘 아직 “{habit}”을(를) 체크하지 않았어요. Pinz를 열어 체크하고 연속 기록을 이어가세요." },
  ja: { body: "今日はまだ「{habit}」をチェックしていません。連続記録を続けましょう！", subject: "リマインダー：{habit}", mail: "今日はまだ「{habit}」をチェックしていません。Pinzを開いてチェックし、連続記録を続けましょう。" },
  zh: { body: "你今天还没有打卡“{habit}”。保持你的连续天数吧！", subject: "提醒：{habit}", mail: "你今天还没有打卡“{habit}”。打开 Pinz 打卡，保持你的连续天数。" },
};
