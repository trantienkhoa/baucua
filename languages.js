'use strict';
// MC đổi ngôn ngữ theo từng nước (giống MC đọc giọng Bắc – Trung – Nam của Thắp Sáng Quê Hương):
// câu nói về nước nào thì đọc trọn câu bằng tiếng và giọng của nước đó.
// VOICE: giọng Microsoft Edge cho từng ngôn ngữ (lỗi thì tự chuyển giọng Google cùng ngôn ngữ).
// TPL: 6 mẫu câu theo thứ tự [0 nước mới tham gia · 1 vươn lên dẫn đầu · 2 thắng vòng · 3 cảm ơn quà · 4 đèn sắp tắt · 5 chào người vào]
//      {c} = tên nước (tự đổi sang tiếng bản xứ) · {u} = tên người xem.
// Sửa câu thoải mái; thêm ngôn ngữ thì thêm cả VOICE lẫn TPL, rồi gán nước ở BY_CC.
const VOICE = {
  vi: 'vi-VN-NamMinhNeural', ja: 'ja-JP-KeitaNeural', ko: 'ko-KR-InJoonNeural', zh: 'zh-CN-YunxiNeural', 'zh-TW': 'zh-TW-YunJheNeural',
  th: 'th-TH-NiwatNeural', id: 'id-ID-ArdiNeural', ms: 'ms-MY-OsmanNeural', fil: 'fil-PH-AngeloNeural', hi: 'hi-IN-MadhurNeural',
  bn: 'bn-BD-PradeepNeural', ur: 'ur-PK-AsadNeural', ne: 'ne-NP-SagarNeural', si: 'si-LK-SameeraNeural', km: 'km-KH-PisethNeural',
  lo: 'lo-LA-ChanthavongNeural', my: 'my-MM-ThihaNeural', mn: 'mn-MN-BataaNeural', kk: 'kk-KZ-DauletNeural', uz: 'uz-UZ-SardorNeural',
  fr: 'fr-FR-HenriNeural', de: 'de-DE-ConradNeural', es: 'es-ES-AlvaroNeural', 'es-MX': 'es-MX-JorgeNeural', pt: 'pt-BR-AntonioNeural',
  'pt-PT': 'pt-PT-DuarteNeural', it: 'it-IT-DiegoNeural', nl: 'nl-NL-MaartenNeural', ru: 'ru-RU-DmitryNeural', uk: 'uk-UA-OstapNeural',
  pl: 'pl-PL-MarekNeural', tr: 'tr-TR-AhmetNeural', ar: 'ar-SA-HamedNeural', 'ar-EG': 'ar-EG-ShakirNeural', fa: 'fa-IR-FaridNeural',
  he: 'he-IL-AvriNeural', el: 'el-GR-NestorasNeural', sv: 'sv-SE-MattiasNeural', nb: 'nb-NO-FinnNeural', da: 'da-DK-JeppeNeural',
  fi: 'fi-FI-HarriNeural', cs: 'cs-CZ-AntoninNeural', hu: 'hu-HU-TamasNeural', ro: 'ro-RO-EmilNeural', sw: 'sw-KE-RafikiNeural', am: 'am-ET-AmehaNeural',
};
const ES = ['¡{c} se une al mapa!', '¡{c} toma la delantera!', '¡{c} gana esta ronda! ¡Felicidades!', '¡Gracias {u}! ¡Un gran impulso para {c}!', '¡{c} se está apagando! ¿Dónde están los fans de {c}?', '¡Bienvenido {u}!'];
const AR = ['{c} انضمت إلى الخريطة!', '{c} في الصدارة الآن!', '{c} تفوز بهذه الجولة! مبروك!', 'شكراً {u}! دعم كبير لـ {c}!', 'أضواء {c} تخفت! أين مشجعو {c}؟', 'أهلاً وسهلاً {u}!'];
const TPL = {
  vi: ['{c} đã tham gia bản đồ!', '{c} vươn lên dẫn đầu!', '{c} chiến thắng vòng này! Xin chúc mừng!', 'Cảm ơn {u}! {c} được tiếp thêm sức mạnh!', '{c} đang mờ dần! Người hâm mộ {c} đâu rồi?', 'Chào mừng {u}!'],
  ja: ['{c}が参加しました！', '{c}がトップに立ちました！', '{c}の勝利です！おめでとうございます！', '{u}さん、ありがとうございます！{c}がパワーアップ！', '{c}の光が消えそうです！{c}のファンはどこですか？', '{u}さん、ようこそ！'],
  ko: ['{c}, 참가했습니다!', '{c}, 1위로 올라섰습니다!', '{c}, 이번 라운드 우승! 축하합니다!', '{u}님 감사합니다! {c}에 큰 힘이 됩니다!', '{c}의 불빛이 꺼져 갑니다! {c} 팬 여러분 어디 계세요?', '{u}님, 환영합니다!'],
  zh: ['{c}加入了地图！', '{c}冲到了第一名！', '{c}赢得了本轮！恭喜！', '感谢{u}！{c}获得强力加成！', '{c}的灯光正在变暗！{c}的朋友们在哪里？', '欢迎{u}！'],
  'zh-TW': ['{c}加入了地圖！', '{c}衝到了第一名！', '{c}贏得了本輪！恭喜！', '感謝{u}！{c}獲得強力加成！', '{c}的燈光正在變暗！{c}的朋友們在哪裡？', '歡迎{u}！'],
  th: ['{c} เข้าร่วมแล้ว!', '{c} ขึ้นนำเป็นที่หนึ่ง!', '{c} ชนะรอบนี้! ยินดีด้วย!', 'ขอบคุณ {u}! {c} ได้พลังเพิ่ม!', 'แสงของ {c} กำลังจะดับ! แฟน ๆ {c} อยู่ไหน?', 'ยินดีต้อนรับ {u}!'],
  id: ['{c} bergabung di peta!', '{c} memimpin!', '{c} menang ronde ini! Selamat!', 'Terima kasih {u}! {c} mendapat dorongan besar!', '{c} mulai meredup! Di mana para pendukung {c}?', 'Selamat datang {u}!'],
  ms: ['{c} menyertai peta!', '{c} mendahului!', '{c} menang pusingan ini! Tahniah!', 'Terima kasih {u}! {c} mendapat rangsangan besar!', '{c} semakin malap! Di mana penyokong {c}?', 'Selamat datang {u}!'],
  fil: ['Sumali na ang {c}!', 'Nangunguna na ang {c}!', 'Panalo ang {c} sa round na ito! Binabati kita!', 'Salamat {u}! Malaking tulong para sa {c}!', 'Lumalabo na ang {c}! Nasaan ang mga taga-suporta ng {c}?', 'Maligayang pagdating {u}!'],
  hi: ['{c} नक्शे पर आ गया है!', '{c} सबसे आगे है!', '{c} ने यह राउंड जीत लिया! बधाई हो!', 'धन्यवाद {u}! {c} को बड़ी ताक़त मिली!', '{c} की रोशनी कम हो रही है! {c} के प्रशंसक कहाँ हैं?', 'स्वागत है {u}!'],
  bn: ['{c} মানচিত্রে যোগ দিয়েছে!', '{c} এখন শীর্ষে!', '{c} এই রাউন্ড জিতেছে! অভিনন্দন!', 'ধন্যবাদ {u}! {c} বড় শক্তি পেল!', '{c} এর আলো নিভে যাচ্ছে! {c} এর সমর্থকরা কোথায়?', 'স্বাগতম {u}!'],
  ur: ['{c} نقشے پر آ گیا ہے!', '{c} سب سے آگے ہے!', '{c} نے یہ راؤنڈ جیت لیا! مبارک ہو!', 'شکریہ {u}! {c} کو بڑی طاقت ملی!', '{c} کی روشنی مدھم ہو رہی ہے! {c} کے مداح کہاں ہیں؟', 'خوش آمدید {u}!'],
  ne: ['{c} नक्सामा आयो!', '{c} अहिले पहिलो स्थानमा छ!', '{c} ले यो राउन्ड जित्यो! बधाई छ!', 'धन्यवाद {u}! {c} लाई ठूलो साथ मिल्यो!', '{c} को बत्ती निभ्दैछ! {c} का समर्थकहरू कहाँ हुनुहुन्छ?', 'स्वागत छ {u}!'],
  si: ['{c} සිතියමට එක් විය!', '{c} දැන් පළමු ස්ථානයේ!', '{c} මෙම වටය දිනුවා! සුභ පැතුම්!', 'ස්තුතියි {u}! {c} ට විශාල ශක්තියක්!', '{c} හි ආලෝකය අඩු වෙමින්! {c} රසිකයන් කොහෙද?', 'ආයුබෝවන් {u}!'],
  km: ['{c} បានចូលរួមហើយ!', '{c} កំពុងនាំមុខ!', '{c} ឈ្នះជុំនេះ! សូមអបអរសាទរ!', 'អរគុណ {u}! {c} ទទួលបានកម្លាំងបន្ថែម!', 'ពន្លឺរបស់ {c} កំពុងរលត់! អ្នកគាំទ្រ {c} នៅឯណា?', 'សូមស្វាគមន៍ {u}!'],
  lo: ['{c} ເຂົ້າຮ່ວມແລ້ວ!', '{c} ຂຶ້ນນຳເປັນທີໜຶ່ງ!', '{c} ຊະນະຮອບນີ້! ຂໍສະແດງຄວາມຍິນດີ!', 'ຂອບໃຈ {u}! {c} ໄດ້ຮັບພະລັງເພີ່ມ!', 'ແສງຂອງ {c} ກຳລັງຈະມອດ! ແຟນໆ {c} ຢູ່ໃສ?', 'ຍິນດີຕ້ອນຮັບ {u}!'],
  my: ['{c} ပါဝင်လာပါပြီ!', '{c} ဦးဆောင်နေပါပြီ!', '{c} ဒီအချီကို နိုင်ပါပြီ! ဂုဏ်ယူပါတယ်!', 'ကျေးဇူးတင်ပါတယ် {u}! {c} အတွက် အားအင်အကြီးကြီးပါ!', '{c} ရဲ့ အလင်းရောင် မှိန်လာနေပါပြီ! {c} ပရိသတ်တွေ ဘယ်မှာလဲ?', 'ကြိုဆိုပါတယ် {u}!'],
  mn: ['{c} нэгдлээ!', '{c} тэргүүлж байна!', '{c} энэ тойрогт яллаа! Баяр хүргэе!', 'Баярлалаа {u}! {c}-д том дэмжлэг боллоо!', '{c}-ын гэрэл бүдгэрч байна! Хөгжөөн дэмжигчид хаана байна?', 'Тавтай морил {u}!'],
  kk: ['{c} қосылды!', '{c} алға шықты!', '{c} осы раундта жеңді! Құттықтаймыз!', 'Рақмет {u}! {c} үшін үлкен қолдау!', '{c} жарығы сөніп барады! Жанкүйерлер қайда?', 'Қош келдіңіз {u}!'],
  uz: ['{c} qo‘shildi!', '{c} oldinga chiqdi!', '{c} bu raundda g‘olib bo‘ldi! Tabriklaymiz!', 'Rahmat {u}! {c} uchun katta yordam!', '{c} chirog‘i so‘nmoqda! Muxlislar qayerda?', 'Xush kelibsiz {u}!'],
  fr: ['{c} rejoint la carte !', '{c} prend la tête !', '{c} remporte cette manche ! Félicitations !', 'Merci {u} ! Un grand coup de pouce pour {c} !', '{c} s’éteint ! Où sont les fans de {c} ?', 'Bienvenue {u} !'],
  de: ['{c} ist jetzt auf der Karte!', '{c} übernimmt die Führung!', '{c} gewinnt diese Runde! Glückwunsch!', 'Danke {u}! Ein großer Schub für {c}!', '{c} verblasst! Wo sind die Fans von {c}?', 'Willkommen {u}!'],
  es: ES, 'es-MX': ES,
  pt: ['{c} entrou no mapa!', '{c} assume a liderança!', '{c} vence esta rodada! Parabéns!', 'Obrigado {u}! Um grande impulso para {c}!', '{c} está se apagando! Onde estão os fãs de {c}?', 'Bem-vindo {u}!'],
  'pt-PT': ['{c} entrou no mapa!', '{c} assume a liderança!', '{c} vence esta ronda! Parabéns!', 'Obrigado {u}! Um grande impulso para {c}!', '{c} está a apagar-se! Onde estão os fãs de {c}?', 'Bem-vindo {u}!'],
  it: ['{c} entra nella mappa!', '{c} passa in testa!', '{c} vince questo round! Complimenti!', 'Grazie {u}! Una grande spinta per {c}!', '{c} si sta spegnendo! Dove sono i tifosi di {c}?', 'Benvenuto {u}!'],
  nl: ['{c} doet nu mee!', '{c} neemt de leiding!', '{c} wint deze ronde! Gefeliciteerd!', 'Bedankt {u}! Een grote boost voor {c}!', '{c} dooft uit! Waar zijn de fans van {c}?', 'Welkom {u}!'],
  ru: ['{c} — теперь на карте!', '{c} — выходит в лидеры!', '{c} — победа в этом раунде! Поздравляем!', 'Спасибо, {u}! Мощная поддержка: {c}!', '{c} — огни гаснут! Где же болельщики?', 'Добро пожаловать, {u}!'],
  uk: ['{c} — тепер на карті!', '{c} — виходить у лідери!', '{c} — перемога в цьому раунді! Вітаємо!', 'Дякуємо, {u}! Потужна підтримка: {c}!', '{c} — вогні згасають! Де ж уболівальники?', 'Ласкаво просимо, {u}!'],
  pl: ['{c} — już na mapie!', '{c} — obejmuje prowadzenie!', '{c} — zwycięstwo w tej rundzie! Gratulacje!', 'Dziękujemy, {u}! Wielkie wsparcie: {c}!', '{c} — światła gasną! Gdzie są kibice?', 'Witamy, {u}!'],
  tr: ['{c} haritaya katıldı!', '{c} liderliğe yükseldi!', '{c} bu turu kazandı! Tebrikler!', 'Teşekkürler {u}! {c} için büyük destek!', '{c} sönüyor! {c} taraftarları nerede?', 'Hoş geldin {u}!'],
  ar: AR, 'ar-EG': AR,
  fa: ['{c} به نقشه پیوست!', '{c} پیشتاز شد!', '{c} برنده این دور شد! تبریک!', 'ممنون {u}! حمایت بزرگی برای {c}!', 'چراغ‌های {c} رو به خاموشی است! هواداران {c} کجایند؟', 'خوش آمدی {u}!'],
  he: ['{c} הצטרפה למפה!', '{c} עולה למקום הראשון!', '{c} מנצחת בסיבוב הזה! מזל טוב!', 'תודה {u}! דחיפה גדולה ל{c}!', 'האורות של {c} דועכים! איפה האוהדים של {c}?', 'ברוך הבא {u}!'],
  el: ['{c} — μπήκε στον χάρτη!', '{c} — περνά στην πρώτη θέση!', '{c} — νίκη σε αυτόν τον γύρο! Συγχαρητήρια!', 'Ευχαριστούμε {u}! Μεγάλη ώθηση: {c}!', '{c} — τα φώτα σβήνουν! Πού είναι οι οπαδοί;', 'Καλώς ήρθες {u}!'],
  sv: ['{c} är med på kartan!', '{c} tar ledningen!', '{c} vinner den här omgången! Grattis!', 'Tack {u}! En stor skjuts för {c}!', '{c} håller på att slockna! Var är fansen?', 'Välkommen {u}!'],
  nb: ['{c} er med på kartet!', '{c} tar ledelsen!', '{c} vinner denne runden! Gratulerer!', 'Takk {u}! Et stort løft for {c}!', '{c} er i ferd med å slukne! Hvor er fansen?', 'Velkommen {u}!'],
  da: ['{c} er med på kortet!', '{c} tager føringen!', '{c} vinder denne runde! Tillykke!', 'Tak {u}! Et stort løft til {c}!', '{c} er ved at slukke! Hvor er fansene?', 'Velkommen {u}!'],
  fi: ['{c} — mukana kartalla!', '{c} — siirtyy johtoon!', '{c} — voitto tällä kierroksella! Onnittelut!', 'Kiitos {u}! Suuri tuki: {c}!', '{c} — valot hiipuvat! Missä fanit ovat?', 'Tervetuloa {u}!'],
  cs: ['{c} — už je na mapě!', '{c} — jde do vedení!', '{c} — vítězství v tomto kole! Gratulujeme!', 'Děkujeme, {u}! Velká podpora: {c}!', '{c} — světla hasnou! Kde jsou fanoušci?', 'Vítej, {u}!'],
  hu: ['{c} — már a térképen van!', '{c} — átveszi a vezetést!', '{c} — győzelem ebben a körben! Gratulálunk!', 'Köszönjük, {u}! Nagy lendület: {c}!', '{c} — a fények kialszanak! Hol vannak a szurkolók?', 'Üdvözlünk, {u}!'],
  ro: ['{c} — a intrat pe hartă!', '{c} — preia conducerea!', '{c} — victorie în această rundă! Felicitări!', 'Mulțumim, {u}! Un mare impuls: {c}!', '{c} — luminile se sting! Unde sunt fanii?', 'Bine ai venit, {u}!'],
  sw: ['{c} imejiunga na ramani!', '{c} inaongoza sasa!', '{c} imeshinda raundi hii! Hongera!', 'Asante {u}! Msaada mkubwa kwa {c}!', 'Taa za {c} zinafifia! Mashabiki wa {c} wako wapi?', 'Karibu {u}!'],
  am: ['{c} ካርታውን ተቀላቅሏል!', '{c} አሁን እየመራ ነው!', '{c} ይህን ዙር አሸንፏል! እንኳን ደስ አለዎት!', 'እናመሰግናለን {u}! ለ{c} ትልቅ ድጋፍ!', 'የ{c} ብርሃን እየደበዘዘ ነው! የ{c} ደጋፊዎች የት ናችሁ?', 'እንኳን ደህና መጡ {u}!'],
};
// nước → ngôn ngữ (nước nói tiếng Anh thì MC nói tiếng Anh)
const BY_CC = {
  vn: 'vi', jp: 'ja', kr: 'ko', kp: 'ko', cn: 'zh', tw: 'zh-TW', hk: 'zh-TW', mo: 'zh-TW', th: 'th', id: 'id', my: 'ms', bn: 'ms', ph: 'fil',
  in: 'hi', bd: 'bn', pk: 'ur', np: 'ne', lk: 'si', kh: 'km', la: 'lo', mm: 'my', mn: 'mn', kz: 'kk', uz: 'uz',
  fr: 'fr', be: 'fr', mc: 'fr', sn: 'fr', ci: 'fr', cm: 'fr', de: 'de', at: 'de', ch: 'de', es: 'es',
  mx: 'es-MX', ar: 'es-MX', co: 'es-MX', cl: 'es-MX', pe: 'es-MX', ve: 'es-MX', ec: 'es-MX', bo: 'es-MX', py: 'es-MX', uy: 'es-MX', cu: 'es-MX', do: 'es-MX', gt: 'es-MX', cr: 'es-MX', pa: 'es-MX',
  br: 'pt', ao: 'pt', mz: 'pt', pt: 'pt-PT', it: 'it', nl: 'nl', ru: 'ru', by: 'ru', ua: 'uk', pl: 'pl', tr: 'tr',
  sa: 'ar', ae: 'ar', qa: 'ar', kw: 'ar', bh: 'ar', om: 'ar', jo: 'ar', iq: 'ar', sy: 'ar', lb: 'ar', ye: 'ar', ps: 'ar', ma: 'ar', dz: 'ar', tn: 'ar', ly: 'ar', sd: 'ar', eg: 'ar-EG',
  ir: 'fa', il: 'he', gr: 'el', cy: 'el', se: 'sv', no: 'nb', dk: 'da', fi: 'fi', cz: 'cs', hu: 'hu', ro: 'ro', md: 'ro', ke: 'sw', tz: 'sw', et: 'am',
};
// tên nước bằng tiếng bản xứ (Việt Nam, 日本, Deutschland…)
const NAME = {};
for (const [cc, lang] of Object.entries(BY_CC)) { try { NAME[cc] = new Intl.DisplayNames([lang], { type: 'region' }).of(cc.toUpperCase()); } catch {} }
module.exports = { VOICE, TPL, BY_CC, NAME };
