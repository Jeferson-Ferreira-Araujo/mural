import type { DemoLocale } from "./demoText";

/** Nomes de usuário inventados (com números no fim, para não coincidir com gente de verdade) que assinam os pins do mural de exemplo. */
const HANDLES = [
  "ana_luiza92", "bruno_rocha07", "carol_lima21", "dudu_alves88", "fer_matos15", "gabi_souza33", "hugo_pires04", "isa_camargo19", "joao_vitor66", "kau_ribeiro12",
  "lari_gomes58", "mateus_cruz71", "nanda_reis27", "otavio_lins09", "paula_dias44", "rafa_moura30", "sara_neves82", "thiago_luz16", "vivi_castro53", "yuri_batista25",
  "bia_santos61", "caio_freitas38", "duda_ramos47", "enzo_falcao90", "flavia_ceu14", "gui_teixeira77", "helena_mar23", "igor_prado68", "julia_flor05", "leo_barros41",
  "malu_arruda36", "nico_vidal59", "olivia_sol18", "pedro_lago72", "quel_viana29", "rubens_paz84", "sofia_brito10", "tati_melo95", "vini_costa02", "wesley_dantas63",
];

/** Nomes comuns em cada idioma, na escrita dele: assinam os pins do mural de exemplo (o português usa a lista própria em decorDisplays.ts). */
const NAMES: Record<Exclude<DemoLocale, "pt">, string[]> = {
  en: ["chris", "emma", "jake", "olivia", "liam", "sophie", "noah", "mia", "ethan", "ava", "jack", "lily", "ryan", "zoe", "tyler", "grace", "mason", "chloe", "owen", "ella", "dylan", "nora", "caleb", "hannah", "luke", "ivy", "max", "ruby", "sam", "kate", "ben", "amy"],
  es: ["carlos", "lucia", "mateo", "valeria", "diego", "camila", "javier", "sofia", "pablo", "marta", "andres", "elena", "sergio", "paula", "adrian", "laura", "hugo", "irene", "ruben", "carmen", "ivan", "alba", "oscar", "noelia", "raul", "silvia", "marcos", "ines", "david", "rocio", "alvaro", "nuria"],
  fr: ["lucas", "camille", "hugo", "chloe", "louis", "manon", "jules", "ines", "arthur", "lea", "theo", "emma", "nathan", "sarah", "maxime", "clara", "antoine", "julie", "paul", "anais", "romain", "lola", "enzo", "mathilde", "victor", "jade", "baptiste", "margaux", "gabin", "eloise", "remi", "oceane"],
  it: ["marco", "giulia", "luca", "sara", "matteo", "chiara", "davide", "elena", "simone", "martina", "andrea", "alice", "fabio", "giorgia", "paolo", "francesca", "stefano", "silvia", "nicola", "valentina", "riccardo", "elisa", "claudio", "federica", "enrico", "laura", "dario", "ilaria", "tommaso", "greta", "gianni", "bianca"],
  de: ["lukas", "anna", "felix", "lena", "jonas", "laura", "finn", "hannah", "leon", "julia", "tim", "sophie", "paul", "mia", "jan", "clara", "niklas", "emilia", "moritz", "marie", "tobias", "johanna", "florian", "katja", "stefan", "nina", "jens", "sabine", "kai", "lea", "ben", "eva"],
  nl: ["daan", "sanne", "sem", "emma", "lars", "lisa", "bram", "fleur", "thijs", "anouk", "jesse", "noor", "ruben", "iris", "milan", "eva", "joost", "femke", "stijn", "lotte", "niek", "julia", "tim", "maud", "koen", "sophie", "wouter", "roos", "jelle", "nienke", "floris", "saskia"],
  pl: ["jakub", "anna", "kacper", "zuzanna", "szymon", "maja", "filip", "julia", "michal", "oliwia", "tomasz", "natalia", "piotr", "kasia", "marek", "ola", "bartek", "magda", "pawel", "ewa", "lukasz", "agnieszka", "mateusz", "marta", "adam", "weronika", "krzysztof", "patrycja", "dawid", "basia", "igor", "klaudia"],
  uk: ["олена", "андрій", "марія", "богдан", "ірина", "тарас", "соломія", "дмитро", "катерина", "максим", "оксана", "влад", "наталя", "юрій", "дарина", "ігор", "софія", "роман", "вікторія", "степан", "аня", "петро", "леся", "микита", "христина", "денис", "яна", "артем", "ліда", "олег", "злата", "назар"],
  ru: ["александр", "мария", "дмитрий", "анна", "иван", "ольга", "сергей", "елена", "андрей", "наташа", "михаил", "ирина", "никита", "светлана", "артём", "юля", "павел", "катя", "антон", "алиса", "кирилл", "вера", "егор", "полина", "максим", "дарья", "денис", "ксения", "глеб", "таня", "илья", "лиза"],
  tr: ["ahmet", "elif", "mehmet", "zeynep", "mustafa", "ayse", "emre", "selin", "burak", "merve", "can", "ece", "kerem", "deniz", "onur", "seda", "baran", "melis", "arda", "ceren", "ugur", "derya", "kaan", "bahar", "yusuf", "irem", "eren", "damla", "tolga", "gizem", "cem", "pinar"],
  ar: ["محمد", "فاطمة", "أحمد", "نور", "علي", "سارة", "عمر", "ليلى", "خالد", "مريم", "يوسف", "هدى", "حسن", "رنا", "إبراهيم", "ياسمين", "طارق", "دانة", "سامي", "لينا", "زياد", "منى", "كريم", "سلمى", "ماجد", "ريم", "فيصل", "أمل", "بدر", "هالة", "نادر", "جود"],
  hi: ["आरव", "अनन्या", "रोहन", "प्रिया", "अमित", "नेहा", "विकास", "पूजा", "राहुल", "सोनम", "अर्जुन", "काव्या", "सचिन", "दिव्या", "मोहित", "ईशा", "करण", "आरती", "निखिल", "रिया", "सुमित", "श्रुति", "अंकित", "मीरा", "विजय", "तनु", "देव", "नंदिनी", "गौरव", "स्वाति", "हर्ष", "पायल"],
  id: ["budi", "siti", "agus", "dewi", "rizki", "putri", "andi", "ayu", "dimas", "rina", "fajar", "wulan", "bayu", "intan", "eko", "sari", "hendra", "nadia", "yoga", "maya", "rudi", "indah", "adi", "fitri", "arif", "lestari", "joko", "citra", "reza", "dian", "bagas", "tika"],
  vi: ["minh", "lan", "huy", "hoa", "nam", "trang", "tuan", "linh", "long", "mai", "hieu", "thao", "duc", "ngoc", "khoa", "huong", "phuc", "anh", "quan", "yen", "bao", "thu", "dung", "hanh", "thanh", "my", "hung", "van", "khang", "vy", "tien", "chi"],
  th: ["สมชาย", "สุดา", "ปิยะ", "มาลี", "ธนากร", "นภา", "วีระ", "พิมพ์", "กิตติ", "อรทัย", "ชัย", "ฟ้า", "ณัฐ", "แพรว", "ภาณุ", "ขวัญ", "อนุชา", "ใบเตย", "รุ่ง", "น้ำ", "ธีร์", "มุก", "ปอ", "ฝน", "เอก", "ก้อย", "บอล", "แก้ม", "นนท์", "เมษา", "โอม", "ปุ้ย"],
  ko: ["민준", "서연", "지훈", "하윤", "도윤", "지우", "시우", "수아", "준서", "예은", "현우", "지민", "건우", "서윤", "승민", "채원", "유진", "다은", "태양", "소연", "재민", "은서", "동현", "나연", "성민", "예린", "우진", "지아", "하준", "보라", "상혁", "유나"],
  ja: ["太郎", "花子", "健太", "さくら", "翔太", "美咲", "大輔", "愛", "拓也", "結衣", "直樹", "陽菜", "蓮", "葵", "悠斗", "凛", "颯太", "優奈", "隼人", "莉子", "駿", "彩", "亮", "真由", "海斗", "七海", "大和", "紗希", "和也", "千尋", "光", "菜々"],
  zh: ["小明", "小红", "伟", "芳", "磊", "静", "强", "丽", "军", "敏", "杰", "婷", "浩", "雪", "鹏", "晨", "宇", "欣", "涛", "琳", "凯", "萱", "阳", "悦", "俊", "思", "辉", "佳", "博", "妍", "睿", "诗"],
};

/** Quantos nomes cada lista tem (o sorteio escolhe um índice de 0 a COUNT - 1). */
export const NAME_COUNT = 32;

/** O nome de usuário de exemplo nº `ix` no idioma (nome comum da língua + número, como `chris_47`). Português: null (usa a lista de decorDisplays.ts). */
export function handleIn(locale: DemoLocale, ix: number): string | null {
  if (locale === "pt") return null;
  const list = NAMES[locale] ?? NAMES.en;
  const i = ((ix % list.length) + list.length) % list.length;
  return `${list[i]}_${((i * 37 + 11) % 90) + 10}`;
}

/** O nome que assina um pin de exemplo no idioma: português usa a lista de cima; as outras línguas, nomes comuns delas. */
export const signerFor = (locale: DemoLocale, ix: number): string => handleIn(locale, ix) ?? HANDLES[ix % HANDLES.length];
