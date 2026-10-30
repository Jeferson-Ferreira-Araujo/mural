import type { Locale } from "@/i18n/config";

/**
 * E-mail enviado quando o PINZ+ acaba e a conta tem murais além do que o plano grátis comporta.
 * `start`: logo que o PINZ+ acaba (carência de 15 dias); `last`: faltando 3 dias ou menos. {n} = dias que faltam.
 */
type LapseText = { subject: string; start: string; last: string; btn: string };

export const LAPSE_TEXT: Record<Locale, LapseText> = {
  pt: {
    subject: "Seu PINZ+ acabou: escolha qual mural continua ativo",
    start: "Seu PINZ+ acabou. Você tem {n} dias para escolher qual mural continua ativo: arraste o mural que você quer manter para o topo da lista em Meus murais. Depois disso, os outros ficam pausados: continuam visíveis, mas não recebem pins novos. Nada é apagado e tudo volta se você renovar o PINZ+.",
    last: "Faltam {n} dias para os seus murais extras serem pausados. Escolha qual fica ativo arrastando-o para o topo da lista em Meus murais, ou renove o PINZ+ para manter todos. Nada é apagado.",
    btn: "Abrir o Pinz",
  },
  en: {
    subject: "Your PINZ+ has ended: choose which mural stays active",
    start: "Your PINZ+ has ended. You have {n} days to choose which mural stays active: drag the one you want to keep to the top of the list in My murals. After that, the others are paused: they stay visible but stop receiving new pins. Nothing is deleted and everything comes back if you renew PINZ+.",
    last: "{n} days left before your extra murals are paused. Choose which one stays active by dragging it to the top of the list in My murals, or renew PINZ+ to keep them all. Nothing is deleted.",
    btn: "Open Pinz",
  },
  es: {
    subject: "Tu PINZ+ terminó: elige qué mural sigue activo",
    start: "Tu PINZ+ terminó. Tienes {n} días para elegir qué mural sigue activo: arrastra el que quieras conservar al principio de la lista en Mis murales. Después, los demás se pausan: siguen visibles pero no reciben pins nuevos. No se borra nada y todo vuelve si renuevas PINZ+.",
    last: "Faltan {n} días para que tus murales extra se pausen. Elige cuál sigue activo arrastrándolo al principio de la lista en Mis murales, o renueva PINZ+ para conservarlos todos. No se borra nada.",
    btn: "Abrir Pinz",
  },
  fr: {
    subject: "Ton PINZ+ est terminé : choisis quel mur reste actif",
    start: "Ton PINZ+ est terminé. Tu as {n} jours pour choisir quel mur reste actif : fais glisser celui que tu veux garder en haut de la liste dans Mes murs. Ensuite, les autres sont mis en pause : ils restent visibles mais ne reçoivent plus de nouveaux pins. Rien n'est supprimé et tout revient si tu renouvelles PINZ+.",
    last: "Il reste {n} jours avant la mise en pause de tes murs supplémentaires. Choisis celui qui reste actif en le faisant glisser en haut de la liste dans Mes murs, ou renouvelle PINZ+ pour tous les garder. Rien n'est supprimé.",
    btn: "Ouvrir Pinz",
  },
  it: {
    subject: "Il tuo PINZ+ è finito: scegli quale bacheca resta attiva",
    start: "Il tuo PINZ+ è finito. Hai {n} giorni per scegliere quale bacheca resta attiva: trascina quella che vuoi mantenere in cima all'elenco in Le mie bacheche. Dopo, le altre vanno in pausa: restano visibili ma non ricevono nuovi pin. Nulla viene eliminato e tutto torna se rinnovi PINZ+.",
    last: "Mancano {n} giorni alla pausa delle tue bacheche extra. Scegli quale resta attiva trascinandola in cima all'elenco in Le mie bacheche, o rinnova PINZ+ per tenerle tutte. Nulla viene eliminato.",
    btn: "Apri Pinz",
  },
  de: {
    subject: "Dein PINZ+ ist abgelaufen: Wähle, welche Wand aktiv bleibt",
    start: "Dein PINZ+ ist abgelaufen. Du hast {n} Tage, um zu wählen, welche Wand aktiv bleibt: Ziehe die gewünschte in Meine Wände an den Anfang der Liste. Danach werden die anderen pausiert: Sie bleiben sichtbar, erhalten aber keine neuen Pins. Nichts wird gelöscht, und alles ist wieder da, wenn du PINZ+ verlängerst.",
    last: "Noch {n} Tage, bis deine zusätzlichen Wände pausiert werden. Wähle die aktive, indem du sie in Meine Wände an den Anfang der Liste ziehst, oder verlängere PINZ+, um alle zu behalten. Nichts wird gelöscht.",
    btn: "Pinz öffnen",
  },
  nl: {
    subject: "Je PINZ+ is afgelopen: kies welk mural actief blijft",
    start: "Je PINZ+ is afgelopen. Je hebt {n} dagen om te kiezen welk mural actief blijft: sleep het mural dat je wilt houden naar boven in de lijst bij Mijn murals. Daarna worden de andere gepauzeerd: ze blijven zichtbaar maar ontvangen geen nieuwe pins. Er wordt niets verwijderd en alles komt terug als je PINZ+ verlengt.",
    last: "Nog {n} dagen voordat je extra murals worden gepauzeerd. Kies welke actief blijft door hem bovenaan de lijst bij Mijn murals te slepen, of verleng PINZ+ om ze allemaal te houden. Er wordt niets verwijderd.",
    btn: "Pinz openen",
  },
  pl: {
    subject: "Twój PINZ+ się skończył: wybierz, który mural zostaje aktywny",
    start: "Twój PINZ+ się skończył. Masz {n} dni, by wybrać, który mural zostaje aktywny: przeciągnij ten, który chcesz zachować, na górę listy w Moje murale. Potem pozostałe zostaną wstrzymane: pozostaną widoczne, ale nie będą przyjmować nowych pinów. Nic nie jest usuwane, a wszystko wraca po odnowieniu PINZ+.",
    last: "Zostało {n} dni do wstrzymania Twoich dodatkowych muralów. Wybierz aktywny, przeciągając go na górę listy w Moje murale, albo odnów PINZ+, by zachować wszystkie. Nic nie jest usuwane.",
    btn: "Otwórz Pinz",
  },
  uk: {
    subject: "Ваш PINZ+ закінчився: оберіть, який мурал залишиться активним",
    start: "Ваш PINZ+ закінчився. У вас є {n} дн., щоб обрати, який мурал залишиться активним: перетягніть потрібний угору списку в «Мої мурали». Після цього решту буде призупинено: вони залишаться видимими, але не прийматимуть нових пінів. Нічого не видаляється, і все повернеться, якщо ви продовжите PINZ+.",
    last: "Залишилося {n} дн. до призупинення ваших додаткових муралів. Оберіть активний, перетягнувши його угору списку в «Мої мурали», або продовжте PINZ+, щоб зберегти всі. Нічого не видаляється.",
    btn: "Відкрити Pinz",
  },
  ru: {
    subject: "Ваш PINZ+ закончился: выберите, какой мурал останется активным",
    start: "Ваш PINZ+ закончился. У вас есть {n} дн., чтобы выбрать, какой мурал останется активным: перетащите нужный в начало списка в «Мои муралы». После этого остальные будут приостановлены: они останутся видимыми, но не будут принимать новые пины. Ничего не удаляется, и всё вернётся, если вы продлите PINZ+.",
    last: "Осталось {n} дн. до приостановки ваших дополнительных муралов. Выберите активный, перетащив его в начало списка в «Мои муралы», или продлите PINZ+, чтобы сохранить все. Ничего не удаляется.",
    btn: "Открыть Pinz",
  },
  tr: {
    subject: "PINZ+ süren bitti: hangi muralin aktif kalacağını seç",
    start: "PINZ+ süren bitti. Hangi muralin aktif kalacağını seçmek için {n} günün var: tutmak istediğini Muralerim listesinde en üste sürükle. Sonra diğerleri duraklatılır: görünür kalırlar ama yeni pin almazlar. Hiçbir şey silinmez ve PINZ+ ı yenilersen her şey geri gelir.",
    last: "Ek muralerinin duraklatılmasına {n} gün kaldı. Aktif kalacak olanı Muralerim listesinde en üste sürükleyerek seç ya da hepsini tutmak için PINZ+ ı yenile. Hiçbir şey silinmez.",
    btn: "Pinz i aç",
  },
  ar: {
    subject: "انتهى اشتراكك في PINZ+: اختر أي جدارية تبقى نشطة",
    start: "انتهى اشتراكك في PINZ+. لديك {n} يومًا لاختيار الجدارية التي تبقى نشطة: اسحب الجدارية التي تريد الاحتفاظ بها إلى أعلى القائمة في جدارياتي. بعد ذلك تتوقف الجداريات الأخرى مؤقتًا: تبقى ظاهرة لكنها لا تستقبل دبابيس جديدة. لا يُحذف شيء وكل شيء يعود إذا جددت PINZ+.",
    last: "بقي {n} يومًا قبل إيقاف جدارياتك الإضافية مؤقتًا. اختر الجدارية النشطة بسحبها إلى أعلى القائمة في جدارياتي، أو جدّد PINZ+ للاحتفاظ بها كلها. لا يُحذف شيء.",
    btn: "افتح Pinz",
  },
  hi: {
    subject: "आपका PINZ+ खत्म हो गया: चुनें कौन सा म्यूरल सक्रिय रहे",
    start: "आपका PINZ+ खत्म हो गया है। यह चुनने के लिए आपके पास {n} दिन हैं कि कौन सा म्यूरल सक्रिय रहे: जिसे रखना है उसे मेरे म्यूरल की सूची में सबसे ऊपर खींचें। उसके बाद बाकी रुक जाएँगे: वे दिखते रहेंगे पर नए पिन नहीं लेंगे। कुछ नहीं हटता और PINZ+ का नवीनीकरण करने पर सब लौट आता है।",
    last: "आपके अतिरिक्त म्यूरल रुकने में {n} दिन बचे हैं। सक्रिय म्यूरल को मेरे म्यूरल की सूची में सबसे ऊपर खींचकर चुनें, या सब रखने के लिए PINZ+ का नवीनीकरण करें। कुछ नहीं हटता।",
    btn: "Pinz खोलें",
  },
  id: {
    subject: "PINZ+ kamu sudah berakhir: pilih mural yang tetap aktif",
    start: "PINZ+ kamu sudah berakhir. Kamu punya {n} hari untuk memilih mural yang tetap aktif: seret mural yang ingin dipertahankan ke atas daftar di Mural saya. Setelah itu, yang lain dijeda: tetap terlihat tetapi tidak menerima pin baru. Tidak ada yang dihapus dan semuanya kembali jika kamu memperpanjang PINZ+.",
    last: "Tinggal {n} hari sebelum mural tambahanmu dijeda. Pilih yang tetap aktif dengan menyeretnya ke atas daftar di Mural saya, atau perpanjang PINZ+ untuk mempertahankan semuanya. Tidak ada yang dihapus.",
    btn: "Buka Pinz",
  },
  vi: {
    subject: "PINZ+ của bạn đã hết: chọn bức tường nào tiếp tục hoạt động",
    start: "PINZ+ của bạn đã hết. Bạn có {n} ngày để chọn bức tường nào tiếp tục hoạt động: kéo bức bạn muốn giữ lên đầu danh sách trong Tường của tôi. Sau đó, các bức còn lại sẽ tạm dừng: vẫn hiển thị nhưng không nhận ghim mới. Không có gì bị xóa và mọi thứ trở lại nếu bạn gia hạn PINZ+.",
    last: "Còn {n} ngày trước khi các bức tường bổ sung của bạn bị tạm dừng. Chọn bức giữ hoạt động bằng cách kéo nó lên đầu danh sách trong Tường của tôi, hoặc gia hạn PINZ+ để giữ tất cả. Không có gì bị xóa.",
    btn: "Mở Pinz",
  },
  th: {
    subject: "PINZ+ ของคุณหมดอายุแล้ว: เลือกมูรัลที่จะใช้งานต่อ",
    start: "PINZ+ ของคุณหมดอายุแล้ว คุณมีเวลา {n} วันเพื่อเลือกมูรัลที่จะใช้งานต่อ: ลากอันที่ต้องการเก็บไว้ไปบนสุดของรายการใน มูรัลของฉัน หลังจากนั้นอันอื่นจะถูกพัก: ยังมองเห็นได้แต่ไม่รับพินใหม่ ไม่มีอะไรถูกลบ และทุกอย่างจะกลับมาเมื่อคุณต่ออายุ PINZ+",
    last: "เหลืออีก {n} วันก่อนที่มูรัลเพิ่มเติมของคุณจะถูกพัก เลือกอันที่ใช้งานต่อโดยลากไปบนสุดของรายการใน มูรัลของฉัน หรือต่ออายุ PINZ+ เพื่อเก็บไว้ทั้งหมด ไม่มีอะไรถูกลบ",
    btn: "เปิด Pinz",
  },
  ko: {
    subject: "PINZ+가 끝났어요: 유지할 뮤럴을 고르세요",
    start: "PINZ+가 끝났어요. 활성으로 둘 뮤럴을 고를 시간이 {n}일 있어요: 내 뮤럴 목록에서 유지하려는 뮤럴을 맨 위로 끌어다 놓으세요. 그 뒤 나머지는 일시 중지돼요: 계속 보이지만 새 핀은 받지 않아요. 아무것도 삭제되지 않고, PINZ+를 갱신하면 모두 돌아와요.",
    last: "추가 뮤럴이 일시 중지되기까지 {n}일 남았어요. 내 뮤럴 목록에서 유지할 뮤럴을 맨 위로 끌어다 놓거나, PINZ+를 갱신해 모두 유지하세요. 아무것도 삭제되지 않아요.",
    btn: "Pinz 열기",
  },
  ja: {
    subject: "PINZ+が終了しました：有効にするミューラルを選んでください",
    start: "PINZ+が終了しました。有効にするミューラルを選ぶ期間は{n}日です。残したいミューラルを「マイミューラル」のリストの一番上にドラッグしてください。その後、ほかのミューラルは一時停止されます。表示は残りますが、新しいピンは受け付けません。何も削除されず、PINZ+を更新するとすべて元に戻ります。",
    last: "追加のミューラルが一時停止されるまであと{n}日です。有効にするものを「マイミューラル」のリストの一番上にドラッグするか、PINZ+を更新してすべて残してください。何も削除されません。",
    btn: "Pinzを開く",
  },
  zh: {
    subject: "你的 PINZ+ 已到期：选择保持启用的墙",
    start: "你的 PINZ+ 已到期。你有 {n} 天选择保持启用的墙：在“我的墙”列表中把想保留的拖到最上面。之后其余的墙将被暂停：仍可查看，但不再接收新图钉。不会删除任何内容，续订 PINZ+ 后一切恢复。",
    last: "距离额外的墙被暂停还有 {n} 天。在“我的墙”列表中把想保留的拖到最上面，或续订 PINZ+ 保留全部。不会删除任何内容。",
    btn: "打开 Pinz",
  },
};
