import type { Locale } from "@/i18n/config";
import { SITE_HOST } from "./mural";

/** Textos dos e-mails de login (confirmar o cadastro e redefinir a senha), em cada idioma. Enviados pelo gancho "Send Email" do Supabase. */
type AuthText = {
  /** confirmar o cadastro: assunto, título, texto, botão, rótulo do código, aviso para quem não pediu */
  cS: string; cT: string; cB: string; cBtn: string; cCode: string; cIgn: string;
  /** redefinir a senha: assunto, título, texto, botão, aviso */
  rS: string; rT: string; rB: string; rBtn: string; rIgn: string;
};

const T: Record<Locale, AuthText> = {
  pt: { cS: "Confirme seu e-mail no Pinz", cT: "Confirme seu e-mail", cB: "Falta só um passo para entrar no Pinz. Clique no botão abaixo para confirmar o seu e-mail.", cBtn: "Confirmar meu e-mail", cCode: "Ou digite este código no site:", cIgn: "Se você não criou uma conta no Pinz, ignore este e-mail.",
    rS: "Redefinir sua senha do Pinz", rT: "Redefinir a senha", rB: "Recebemos um pedido para criar uma nova senha. Clique no botão abaixo para escolher a sua.", rBtn: "Criar nova senha", rIgn: "Se não foi você, ignore este e-mail: a sua senha continua a mesma." },
  en: { cS: "Confirm your email on Pinz", cT: "Confirm your email", cB: "Just one more step to get into Pinz. Click the button below to confirm your email.", cBtn: "Confirm my email", cCode: "Or enter this code on the site:", cIgn: "If you didn’t create a Pinz account, you can ignore this email.",
    rS: "Reset your Pinz password", rT: "Reset your password", rB: "We got a request to set a new password. Click the button below to choose yours.", rBtn: "Create new password", rIgn: "If it wasn’t you, ignore this email: your password stays the same." },
  es: { cS: "Confirma tu correo en Pinz", cT: "Confirma tu correo", cB: "Solo falta un paso para entrar en Pinz. Haz clic en el botón de abajo para confirmar tu correo.", cBtn: "Confirmar mi correo", cCode: "O escribe este código en el sitio:", cIgn: "Si no creaste una cuenta en Pinz, ignora este correo.",
    rS: "Restablece tu contraseña de Pinz", rT: "Restablecer la contraseña", rB: "Recibimos una solicitud para crear una nueva contraseña. Haz clic en el botón de abajo para elegirla.", rBtn: "Crear nueva contraseña", rIgn: "Si no fuiste tú, ignora este correo: tu contraseña sigue igual." },
  fr: { cS: "Confirmez votre e-mail sur Pinz", cT: "Confirmez votre e-mail", cB: "Plus qu’une étape pour entrer sur Pinz. Cliquez sur le bouton ci-dessous pour confirmer votre e-mail.", cBtn: "Confirmer mon e-mail", cCode: "Ou saisissez ce code sur le site :", cIgn: "Si vous n’avez pas créé de compte Pinz, ignorez cet e-mail.",
    rS: "Réinitialisez votre mot de passe Pinz", rT: "Réinitialiser le mot de passe", rB: "Nous avons reçu une demande de nouveau mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un.", rBtn: "Créer un nouveau mot de passe", rIgn: "Si ce n’était pas vous, ignorez cet e-mail : votre mot de passe reste le même." },
  it: { cS: "Conferma la tua e-mail su Pinz", cT: "Conferma la tua e-mail", cB: "Manca solo un passaggio per entrare su Pinz. Clicca sul pulsante qui sotto per confermare la tua e-mail.", cBtn: "Conferma la mia e-mail", cCode: "Oppure inserisci questo codice sul sito:", cIgn: "Se non hai creato un account Pinz, ignora questa e-mail.",
    rS: "Reimposta la tua password di Pinz", rT: "Reimposta la password", rB: "Abbiamo ricevuto una richiesta per una nuova password. Clicca sul pulsante qui sotto per sceglierla.", rBtn: "Crea nuova password", rIgn: "Se non sei stato tu, ignora questa e-mail: la tua password resta la stessa." },
  de: { cS: "Bestätige deine E-Mail bei Pinz", cT: "Bestätige deine E-Mail", cB: "Nur noch ein Schritt bis zu Pinz. Klicke auf den Button unten, um deine E-Mail zu bestätigen.", cBtn: "E-Mail bestätigen", cCode: "Oder gib diesen Code auf der Website ein:", cIgn: "Wenn du kein Pinz-Konto erstellt hast, ignoriere diese E-Mail.",
    rS: "Setze dein Pinz-Passwort zurück", rT: "Passwort zurücksetzen", rB: "Wir haben eine Anfrage für ein neues Passwort erhalten. Klicke auf den Button unten, um eines zu wählen.", rBtn: "Neues Passwort erstellen", rIgn: "Warst du es nicht, ignoriere diese E-Mail: Dein Passwort bleibt unverändert." },
  nl: { cS: "Bevestig je e-mail bij Pinz", cT: "Bevestig je e-mail", cB: "Nog één stap om bij Pinz binnen te komen. Klik op de knop hieronder om je e-mail te bevestigen.", cBtn: "Mijn e-mail bevestigen", cCode: "Of vul deze code in op de site:", cIgn: "Heb je geen Pinz-account gemaakt, negeer dan deze e-mail.",
    rS: "Stel je Pinz-wachtwoord opnieuw in", rT: "Wachtwoord opnieuw instellen", rB: "We kregen een verzoek voor een nieuw wachtwoord. Klik op de knop hieronder om er een te kiezen.", rBtn: "Nieuw wachtwoord maken", rIgn: "Was jij het niet, negeer dan deze e-mail: je wachtwoord blijft hetzelfde." },
  pl: { cS: "Potwierdź swój e-mail w Pinz", cT: "Potwierdź swój e-mail", cB: "Został tylko jeden krok, by wejść do Pinz. Kliknij przycisk poniżej, aby potwierdzić e-mail.", cBtn: "Potwierdź mój e-mail", cCode: "Albo wpisz ten kod na stronie:", cIgn: "Jeśli nie zakładasz konta w Pinz, zignoruj tę wiadomość.",
    rS: "Zresetuj hasło do Pinz", rT: "Zresetuj hasło", rB: "Otrzymaliśmy prośbę o nowe hasło. Kliknij przycisk poniżej, aby je wybrać.", rBtn: "Utwórz nowe hasło", rIgn: "Jeśli to nie ty, zignoruj tę wiadomość: Twoje hasło się nie zmieni." },
  uk: { cS: "Підтвердьте e-mail у Pinz", cT: "Підтвердьте e-mail", cB: "Залишився один крок, щоб увійти в Pinz. Натисніть кнопку нижче, щоб підтвердити e-mail.", cBtn: "Підтвердити e-mail", cCode: "Або введіть цей код на сайті:", cIgn: "Якщо ви не створювали акаунт у Pinz, проігноруйте цей лист.",
    rS: "Скидання пароля Pinz", rT: "Скинути пароль", rB: "Ми отримали запит на новий пароль. Натисніть кнопку нижче, щоб вибрати його.", rBtn: "Створити новий пароль", rIgn: "Якщо це були не ви, проігноруйте цей лист: пароль залишиться без змін." },
  ru: { cS: "Подтвердите e-mail в Pinz", cT: "Подтвердите e-mail", cB: "Остался один шаг, чтобы войти в Pinz. Нажмите кнопку ниже, чтобы подтвердить e-mail.", cBtn: "Подтвердить e-mail", cCode: "Или введите этот код на сайте:", cIgn: "Если вы не создавали аккаунт в Pinz, проигнорируйте это письмо.",
    rS: "Сброс пароля Pinz", rT: "Сбросить пароль", rB: "Мы получили запрос на новый пароль. Нажмите кнопку ниже, чтобы выбрать его.", rBtn: "Создать новый пароль", rIgn: "Если это были не вы, проигнорируйте письмо: пароль останется прежним." },
  tr: { cS: "Pinz’de e-postanı onayla", cT: "E-postanı onayla", cB: "Pinz’e girmek için tek adım kaldı. E-postanı onaylamak için aşağıdaki düğmeye tıkla.", cBtn: "E-postamı onayla", cCode: "Ya da bu kodu sitede gir:", cIgn: "Pinz hesabı oluşturmadıysan bu e-postayı yok say.",
    rS: "Pinz şifreni sıfırla", rT: "Şifreyi sıfırla", rB: "Yeni şifre isteği aldık. Şifreni seçmek için aşağıdaki düğmeye tıkla.", rBtn: "Yeni şifre oluştur", rIgn: "Sen değilsen bu e-postayı yok say: şifren aynı kalır." },
  ar: { cS: "أكّد بريدك الإلكتروني في Pinz", cT: "أكّد بريدك الإلكتروني", cB: "بقيت خطوة واحدة للدخول إلى Pinz. اضغط على الزر أدناه لتأكيد بريدك الإلكتروني.", cBtn: "تأكيد بريدي الإلكتروني", cCode: "أو أدخل هذا الرمز في الموقع:", cIgn: "إذا لم تنشئ حسابًا في Pinz، تجاهل هذه الرسالة.",
    rS: "إعادة تعيين كلمة مرور Pinz", rT: "إعادة تعيين كلمة المرور", rB: "تلقينا طلبًا لكلمة مرور جديدة. اضغط على الزر أدناه لاختيارها.", rBtn: "إنشاء كلمة مرور جديدة", rIgn: "إذا لم تكن أنت، تجاهل هذه الرسالة: ستبقى كلمة مرورك كما هي." },
  hi: { cS: "Pinz पर अपना ईमेल कन्फ़र्म करें", cT: "अपना ईमेल कन्फ़र्म करें", cB: "Pinz में आने के लिए बस एक कदम बाकी है। अपना ईमेल कन्फ़र्म करने के लिए नीचे के बटन पर क्लिक करें।", cBtn: "मेरा ईमेल कन्फ़र्म करें", cCode: "या साइट पर यह कोड डालें:", cIgn: "अगर आपने Pinz खाता नहीं बनाया है, तो इस ईमेल को अनदेखा करें।",
    rS: "अपना Pinz पासवर्ड रीसेट करें", rT: "पासवर्ड रीसेट करें", rB: "हमें नया पासवर्ड बनाने का अनुरोध मिला है। चुनने के लिए नीचे के बटन पर क्लिक करें।", rBtn: "नया पासवर्ड बनाएँ", rIgn: "अगर यह आप नहीं थे, तो इस ईमेल को अनदेखा करें: आपका पासवर्ड वही रहेगा।" },
  id: { cS: "Konfirmasi email Anda di Pinz", cT: "Konfirmasi email Anda", cB: "Tinggal satu langkah lagi untuk masuk ke Pinz. Klik tombol di bawah untuk mengonfirmasi email Anda.", cBtn: "Konfirmasi email saya", cCode: "Atau masukkan kode ini di situs:", cIgn: "Jika Anda tidak membuat akun Pinz, abaikan email ini.",
    rS: "Atur ulang kata sandi Pinz Anda", rT: "Atur ulang kata sandi", rB: "Kami menerima permintaan kata sandi baru. Klik tombol di bawah untuk memilihnya.", rBtn: "Buat kata sandi baru", rIgn: "Jika bukan Anda, abaikan email ini: kata sandi Anda tidak berubah." },
  vi: { cS: "Xác nhận email của bạn trên Pinz", cT: "Xác nhận email của bạn", cB: "Chỉ còn một bước nữa để vào Pinz. Bấm nút bên dưới để xác nhận email của bạn.", cBtn: "Xác nhận email của tôi", cCode: "Hoặc nhập mã này trên trang web:", cIgn: "Nếu bạn không tạo tài khoản Pinz, hãy bỏ qua email này.",
    rS: "Đặt lại mật khẩu Pinz của bạn", rT: "Đặt lại mật khẩu", rB: "Chúng tôi nhận được yêu cầu tạo mật khẩu mới. Bấm nút bên dưới để chọn mật khẩu.", rBtn: "Tạo mật khẩu mới", rIgn: "Nếu không phải bạn, hãy bỏ qua email này: mật khẩu của bạn vẫn như cũ." },
  th: { cS: "ยืนยันอีเมลของคุณบน Pinz", cT: "ยืนยันอีเมลของคุณ", cB: "เหลืออีกขั้นเดียวก็เข้า Pinz ได้แล้ว กดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ", cBtn: "ยืนยันอีเมลของฉัน", cCode: "หรือกรอกรหัสนี้บนเว็บไซต์:", cIgn: "หากคุณไม่ได้สร้างบัญชี Pinz โปรดเพิกเฉยต่ออีเมลนี้",
    rS: "รีเซ็ตรหัสผ่าน Pinz ของคุณ", rT: "รีเซ็ตรหัสผ่าน", rB: "เราได้รับคำขอตั้งรหัสผ่านใหม่ กดปุ่มด้านล่างเพื่อเลือกรหัสผ่านของคุณ", rBtn: "สร้างรหัสผ่านใหม่", rIgn: "หากไม่ใช่คุณ โปรดเพิกเฉยต่ออีเมลนี้ รหัสผ่านของคุณจะไม่เปลี่ยน" },
  ko: { cS: "Pinz 이메일을 인증하세요", cT: "이메일 인증", cB: "Pinz에 들어가기까지 한 단계만 남았습니다. 아래 버튼을 눌러 이메일을 인증하세요.", cBtn: "이메일 인증하기", cCode: "또는 사이트에 이 코드를 입력하세요:", cIgn: "Pinz 계정을 만들지 않았다면 이 이메일을 무시하세요.",
    rS: "Pinz 비밀번호 재설정", rT: "비밀번호 재설정", rB: "새 비밀번호 요청을 받았습니다. 아래 버튼을 눌러 새 비밀번호를 정하세요.", rBtn: "새 비밀번호 만들기", rIgn: "본인이 아니라면 이 이메일을 무시하세요. 비밀번호는 그대로입니다." },
  ja: { cS: "Pinzのメールアドレスを確認してください", cT: "メールアドレスの確認", cB: "Pinzに入るまであと一歩です。下のボタンを押してメールアドレスを確認してください。", cBtn: "メールアドレスを確認する", cCode: "または、サイトでこのコードを入力してください：", cIgn: "Pinzのアカウントを作成していない場合は、このメールを無視してください。",
    rS: "Pinzのパスワードを再設定", rT: "パスワードの再設定", rB: "新しいパスワードのリクエストを受け付けました。下のボタンを押して設定してください。", rBtn: "新しいパスワードを作成", rIgn: "心当たりがない場合は、このメールを無視してください。パスワードは変わりません。" },
  zh: { cS: "请确认您在 Pinz 的邮箱", cT: "确认您的邮箱", cB: "只差一步就能进入 Pinz。点击下方按钮确认您的邮箱。", cBtn: "确认我的邮箱", cCode: "或在网站上输入此验证码：", cIgn: "如果您没有创建 Pinz 账户，请忽略此邮件。",
    rS: "重置您的 Pinz 密码", rT: "重置密码", rB: "我们收到了设置新密码的请求。点击下方按钮选择新密码。", rBtn: "创建新密码", rIgn: "如果不是您本人操作，请忽略此邮件：您的密码不会改变。" },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export type AuthMailKind = "confirm" | "reset";

/** E-mail de confirmação do cadastro (botão + código) ou de redefinição de senha (botão), no idioma da pessoa. */
export function authMail(p: { lang: Locale; kind: AuthMailKind; url: string; code?: string }): { subject: string; html: string; text: string } {
  const t = T[p.lang] ?? T.en;
  const confirm = p.kind === "confirm";
  const title = confirm ? t.cT : t.rT;
  const body = confirm ? t.cB : t.rB;
  const btn = confirm ? t.cBtn : t.rBtn;
  const ign = confirm ? t.cIgn : t.rIgn;
  const dir = p.lang === "ar" ? "rtl" : "ltr";
  const code = confirm && p.code ? p.code : null;
  const html = `<div dir="${dir}" style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a1c12"><h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1><p style="margin:0 0 4px;line-height:1.5">${esc(body)}</p><p style="margin:22px 0"><a href="${esc(p.url)}" style="background:#1f232b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">${esc(btn)}</a></p>${code ? `<p style="margin:18px 0 4px;color:#6b5440;font-size:14px">${esc(t.cCode)}</p><p style="margin:0 0 18px;font-size:28px;font-weight:bold;letter-spacing:6px">${esc(code)}</p>` : ""}<p style="color:#6b5440;font-size:13px;margin-top:20px">${esc(ign)}</p><p style="color:#8a7b69;font-size:12px">https://${SITE_HOST}</p></div>`;
  const text = `${title}\n\n${body}\n\n${btn}: ${p.url}\n${code ? `\n${t.cCode} ${code}\n` : ""}\n${ign}`;
  return { subject: confirm ? t.cS : t.rS, html, text };
}
