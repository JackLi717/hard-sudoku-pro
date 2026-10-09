#!/usr/bin/env python3
"""Apply the assistant's domain corrections to static machine drafts.

This is a terminology/logic pass, not independent native-speaker certification.
Rules are scoped by the English source concept to avoid changing unrelated copy.
"""
from pathlib import Path
import argparse
import json
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
# Native forms that the draft service incorrectly used for Sudoku concepts.
RULES = {
    "zh-Hant": {
        "naked": [["裸對", "顯性數對"], ["裸三", "顯性三數組"], ["裸四", "顯性四數組"], ["裸結構", "顯性數組"]],
        "hidden": [["隱對", "隱性數對"], ["隱三", "隱性三數組"], ["隱四", "隱性四數組"], ["隱結構", "隱性數組"]],
        "bivalue": [["雙值格", "雙候選格"]],
    },
    "ko": {
        "candidate": [
            [
                "후보자",
                "후보"
            ]
        ],
        "box": [
            [
                "상자",
                "박스"
            ]
        ],
        "cell": [
            [
                "셀",
                "칸"
            ]
        ],
        "link": [
            [
                "강력한 링크",
                "강한 연결"
            ],
            [
                "강한 링크",
                "강한 연결"
            ],
            [
                "약한 링크",
                "약한 연결"
            ]
        ]
    },
    "fr": {
        "cell": [
            [
                "cellules",
                "cases"
            ],
            [
                "cellule",
                "case"
            ]
        ],
        "box": [
            [
                "les boîtes",
                "les blocs"
            ],
            [
                "des boîtes",
                "des blocs"
            ],
            [
                "ces boîtes",
                "ces blocs"
            ],
            [
                "cette boîte",
                "ce bloc"
            ],
            [
                "une boîte",
                "un bloc"
            ],
            [
                "la boîte",
                "le bloc"
            ],
            [
                "boîtes",
                "blocs"
            ],
            [
                "boîte",
                "bloc"
            ],
            [
                "lignes, colonnes et cases",
                "lignes, colonnes et blocs"
            ],
            [
                "ligne, colonne et case",
                "ligne, colonne et bloc"
            ],
            [
                "ligne, colonne ou case",
                "ligne, colonne ou bloc"
            ]
        ]
    },
    "es": {
        "cell": [
            [
                "celdas",
                "casillas"
            ],
            [
                "celda",
                "casilla"
            ],
            [
                "células",
                "casillas"
            ],
            [
                "célula",
                "casilla"
            ]
        ],
        "box": [
            [
                "las cajas",
                "los bloques"
            ],
            [
                "estas cajas",
                "estos bloques"
            ],
            [
                "una caja",
                "un bloque"
            ],
            [
                "la caja",
                "el bloque"
            ],
            [
                "esta caja",
                "este bloque"
            ],
            [
                "cajas",
                "bloques"
            ],
            [
                "caja",
                "bloque"
            ]
        ]
    },
    "pt-BR": {
        "box": [
            [
                "as caixas",
                "os blocos"
            ],
            [
                "essas caixas",
                "esses blocos"
            ],
            [
                "uma caixa",
                "um bloco"
            ],
            [
                "a caixa",
                "o bloco"
            ],
            [
                "esta caixa",
                "este bloco"
            ],
            [
                "caixas",
                "blocos"
            ],
            [
                "caixa",
                "bloco"
            ]
        ]
    },
    "vi": {
        "candidate": [
            [
                "ứng cử viên",
                "ứng viên"
            ],
            [
                "một người",
                "một ứng viên"
            ],
            [
                "người kia",
                "ứng viên kia"
            ]
        ],
        "box": [
            [
                "hộp",
                "khối"
            ]
        ]
    },
    "hi": {
        "candidate": [
            [
                "उम्मीदवारों",
                "संभावित अंकों"
            ],
            [
                "उम्मीदवार",
                "संभावित अंक"
            ],
            [
                "प्रत्याशियों",
                "संभावित अंकों"
            ],
            [
                "प्रत्याशी",
                "संभावित अंक"
            ]
        ]
    },
    "th": {
        "candidate": [
            [
                "ผู้สมัครรับเลือกตั้ง",
                "ตัวเลขที่เป็นไปได้"
            ],
            [
                "ผู้สมัครงาน",
                "ตัวเลขที่เป็นไปได้"
            ],
            [
                "ผู้สมัคร",
                "ตัวเลขที่เป็นไปได้"
            ]
        ],
        "box": [
            [
                "กล่อง",
                "บล็อก"
            ]
        ],
        "cell": [
            [
                "เซลล์",
                "ช่อง"
            ]
        ]
    },
    "fi": {
        "box": [
            [
                "laatikoissa",
                "lohkoissa"
            ],
            [
                "laatikoista",
                "lohkoista"
            ],
            [
                "laatikoiden",
                "lohkojen"
            ],
            [
                "laatikossa",
                "lohkossa"
            ],
            [
                "laatikosta",
                "lohkosta"
            ],
            [
                "laatikkoon",
                "lohkoon"
            ],
            [
                "laatikkoa",
                "lohkoa"
            ],
            [
                "laatikon",
                "lohkon"
            ],
            [
                "laatikot",
                "lohkot"
            ],
            [
                "laatikko",
                "lohko"
            ]
        ],
        "cell": [
            [
                "soluissa",
                "ruuduissa"
            ],
            [
                "solujen",
                "ruutujen"
            ],
            [
                "solussa",
                "ruudussa"
            ],
            [
                "soluun",
                "ruutuun"
            ],
            [
                "solusta",
                "ruudusta"
            ],
            [
                "solun",
                "ruudun"
            ],
            [
                "solut",
                "ruudut"
            ],
            [
                "solua",
                "ruutua"
            ],
            [
                "solu",
                "ruutu"
            ]
        ]
    },
    "ar": {
        "cell": [
            [
                "خلايا",
                "خانات"
            ],
            [
                "خلية",
                "خانة"
            ]
        ]
    },
    "ms": {
        "cell": [
            [
                "\\bsel\\b",
                "petak"
            ]
        ]
    },
    "fil": {
        "cell": [
            [
                "\\bselda\\b",
                "kahon"
            ]
        ]
    }
}


DOMAIN_RULES = {
    "ko": {
        "cover": [
            [
                "표지 열",
                "커버 열"
            ],
            [
                "표지 선",
                "커버선"
            ],
            [
                "표지",
                "커버선"
            ],
            [
                "덮개 영역",
                "커버 영역"
            ],
            [
                "덮개",
                "커버선"
            ]
        ],
        "base": [
            [
                "기지",
                "기준선"
            ]
        ]
    },
    "fi": {
        "cover": [
            [
                "kansisarak",
                "peittosarak"
            ],
            [
                "kansiviiv",
                "peittolinj"
            ]
        ],
        "deduction": [
            [
                "Vähennys",
                "Päätelmä"
            ]
        ]
    },
    "uk": {
        "base": [
            [
                "волосіней",
                "ліній"
            ],
            [
                "волосіні",
                "лінії"
            ]
        ],
        "deduction": [
            [
                "відрахуванню",
                "логічному висновку"
            ],
            [
                "відрахування",
                "висновок"
            ]
        ]
    },
    "id": {
        "cover": [
            [
                "kolom sampul",
                "kolom cakupan"
            ],
            [
                "garis sampul",
                "garis cakupan"
            ],
            [
                "sampul",
                "garis cakupan"
            ]
        ],
        "state": [
            [
                "negara bagian",
                "keadaan logis"
            ]
        ],
        "round": [
            [
                "Putaran A",
                "A bertanda lingkaran"
            ]
        ]
    },
    "it": {
        "cover": [
            [
                "colonne di copertina",
                "colonne di copertura"
            ],
            [
                "copertine",
                "linee di copertura"
            ],
            [
                "copertina",
                "linea di copertura"
            ]
        ],
        "deduction": [
            [
                "detrazione",
                "deduzione"
            ]
        ],
        "round": [
            [
                "giro A",
                "A contrassegnato da un cerchio"
            ]
        ]
    },
    "tr": {
        "cover": [
            [
                "kapak yazılarının",
                "örtü çizgilerinin"
            ],
            [
                "kapak çizgileri",
                "örtü çizgileri"
            ],
            [
                "kapak satırları",
                "örtü çizgileri"
            ],
            [
                "kapak sütunları",
                "örtü sütunları"
            ],
            [
                "kapak hattında",
                "örtü çizgisinde"
            ],
            [
                "kapak bölgesinde",
                "örtü bölgesinde"
            ],
            [
                "kapakların",
                "örtü çizgilerinin"
            ],
            [
                "kapaklarda",
                "örtü çizgilerinde"
            ],
            [
                "kapaklarla",
                "örtü çizgileriyle"
            ],
            [
                "kapakları",
                "örtü çizgilerini"
            ],
            [
                "kapaklar",
                "örtü çizgileri"
            ],
            [
                "kapakta",
                "örtü çizgisinde"
            ],
            [
                "kapaktaki",
                "örtü çizgisindeki"
            ],
            [
                "kapakla",
                "örtü çizgisiyle"
            ],
            [
                "kapağı",
                "örtü çizgisini"
            ],
            [
                "kapak",
                "örtü çizgisi"
            ]
        ],
        "deduction": [
            [
                "kesinti",
                "çıkarım"
            ]
        ]
    },
    "th": {
        "cover": [
            [
                "หน้าปก",
                "เส้นครอบคลุม"
            ],
            [
                "ฝาปิด",
                "เส้นครอบคลุม"
            ]
        ],
        "candidate": [
            [
                "ผู้เข้าแข่งขัน",
                "ตัวเลือก"
            ],
            [
                "ผู้สมัคร",
                "ตัวเลือก"
            ],
            [
                "ทุกคน",
                "ทุกตัว"
            ]
        ],
        "lie": [
            [
                "นอนอยู่",
                "อยู่"
            ]
        ],
        "round": [
            [
                "รอบ A",
                "A ที่ทำเครื่องหมายวงกลม"
            ]
        ]
    },
    "pl": {
        "cover": [
            [
                "kolumn okładki",
                "kolumn pokrywających"
            ],
            [
                "okładkach",
                "liniach pokrywających"
            ],
            [
                "okładkami",
                "liniami pokrywającymi"
            ],
            [
                "okładkę",
                "linię pokrywającą"
            ],
            [
                "okładką",
                "linią pokrywającą"
            ],
            [
                "okładce",
                "linii pokrywającej"
            ],
            [
                "okładek",
                "linii pokrywających"
            ],
            [
                "okładki",
                "linie pokrywające"
            ],
            [
                "okładka",
                "linia pokrywająca"
            ]
        ],
        "case": [
            [
                "Obudowa",
                "Przypadek"
            ]
        ]
    },
    "ru": {
        "cover": [
            [
                "столбцов обложки",
                "покрывающих столбцов"
            ],
            [
                "столбце обложки",
                "покрывающем столбце"
            ],
            [
                "обложках",
                "покрывающих линиях"
            ],
            [
                "обложками",
                "покрывающими линиями"
            ],
            [
                "обложек",
                "покрывающих линий"
            ],
            [
                "обложку",
                "покрывающую линию"
            ],
            [
                "обложке",
                "покрывающей линии"
            ],
            [
                "обложки",
                "покрывающие линии"
            ],
            [
                "обложка",
                "покрывающая линия"
            ]
        ]
    },
    "nl": {
        "cover": [
            [
                "omslagen",
                "dekkingslijnen"
            ],
            [
                "omslag",
                "dekkingslijn"
            ],
            [
                "deksels",
                "dekkingslijnen"
            ]
        ],
        "case": [
            [
                "Behuizing",
                "Geval"
            ]
        ],
        "deduction": [
            [
                "aftrek",
                "gevolgtrekking"
            ]
        ]
    },
    "ms": {
        "state": [
            [
                "negeri",
                "keadaan"
            ]
        ],
        "case": [
            [
                "sarung",
                "kes"
            ]
        ],
        "deduction": [
            [
                "potongan",
                "inferens"
            ]
        ]
    },
    "fil": {
        "cover": [
            [
                "hanay ng pabalat",
                "kolum na pantakip"
            ],
            [
                "linya ng pabalat",
                "linyang pantakip"
            ],
            [
                "rehiyon ng pabalat",
                "rehiyong pantakip"
            ],
            [
                "pabalat",
                "linyang pantakip"
            ]
        ],
        "lie": [
            [
                "humiga",
                "naroroon"
            ],
            [
                "nakahiga",
                "naroroon"
            ]
        ],
        "legend": [
            [
                "alamat",
                "legend"
            ]
        ]
    },
    "ar": {
        "deduction": [
            [
                "الخصم",
                "الاستدلال"
            ],
            [
                "خصم",
                "استدلال"
            ]
        ]
    },
    "hi": {
        "deduction": [
            [
                "कटौती",
                "तार्किक निष्कर्ष"
            ]
        ],
        "candidate": [
            [
                "संभावित अंक अंकों",
                "संभावित अंकों"
            ],
            [
                "संभावित अंक अंक",
                "संभावित अंक"
            ]
        ],
        "legend": [
            [
                "किंवदंती",
                "संकेत-विवरण"
            ]
        ]
    }
}

def correct(source: str, value: str, locale: str) -> str:
    # Batch markers sometimes drift after an adjacent short label. It is an
    # extra line, never part of this single-line source; missing labels were
    # individually rewritten in reviewed-core-copy.json.
    if '\n' not in source and '\n' in value:
        first = value.split('\n')[0].strip()
        slots = lambda text: sorted(re.findall(r'\{\{\w+\}\}|\{\w+\}', text))
        if slots(first) != slots(source):
            raise ValueError('manual boundary review required: ' + source)
        value = first
    for concept, rules in RULES.get(locale, {}).items():
        if not re.search(r'\b' + {'box': 'box(?:es)?', 'cell': 'cells?', 'candidate': 'candidates?', 'link': 'links?', 'naked': 'naked', 'hidden': 'hidden', 'bivalue': 'bivalue'}[concept] + r'\b', source, re.I):
            continue
        for old, new in rules:
            value = re.sub(old, lambda m: new[0].upper() + new[1:] if m[0][0].isupper() else new, value, flags=re.I)
    if locale == 'ko':
        if re.search(r'\bcells?\b', source, re.I):
            value = value.replace('세포', '칸')
        if re.search(r'\bbivalue\b', source, re.I):
            value = value.replace('이중값', '두 후보').replace('이중 값', '두 후보')
        if re.search(r'\bnotes?\b', source, re.I):
            value = value.replace('음표', '후보 표기')
        if re.search(r'\bimplications?\b', source, re.I):
            value = value.replace('암시', '함의')
        if re.search(r'\btrue\b', source, re.I):
            for old, new in [('참가 됩니다', '참이 됩니다'), ('참로', '참으로'), ('참라고', '참이라고'), ('참여야', '참이어야')]:
                value = value.replace(old, new)
        if re.search(r'\bfalse\b', source, re.I):
            value = value.replace('거짓로', '거짓으로')
        if re.search(r'\blinks?\b', source, re.I):
            for old, new in [('연결가', '연결이'), ('연결는', '연결은'), ('연결를', '연결을'), ('연결와', '연결과')]:
                value = value.replace(old, new)
        for old, new in [('커버선는', '커버선은'), ('커버선를', '커버선을'), ('커버선로', '커버선으로'), ('커버선라고', '커버선이라고')]:
            value = value.replace(old, new)
    if locale == 'pl' and re.search(r'\bproofs?\b', source, re.I):
        value = value.replace('wydruku próbnego', 'dowodu')
    if locale == 'nl' and re.search(r'\bproofs?\b', source, re.I):
        value = value.replace('proefdruk', 'bewijs')
    if locale == 'zh-Hant':
        for old, new in [('裸對', '顯性數對'), ('裸三', '顯性三數組'), ('裸四', '顯性四數組'), ('裸結構', '顯性數組'), ('隱對', '隱性數對'), ('隱三', '隱性三數組'), ('隱四', '隱性四數組'), ('隱結構', '隱性數組'), ('雙值格', '雙候選格'), ('重復', '重複'), ('網絡', '網路'), ('並集', '聯集'), ('格子里', '格子裡'), ('區域里', '區域裡'), ('宮里', '宮裡'), ('線里', '線裡'), ('格里', '格裡')]:
            value = value.replace(old, new)
    if locale == 'fr' and re.search(r'\bfins?\b', source, re.I):
        for old, new in [('ailerons', 'nageoires'), ('aileron', 'nageoire'), ('une fin', 'une nageoire')]:
            value = re.sub(old, new, value, flags=re.I)
    if re.search(r'\bstates?\b', source, re.I):
        if locale == 'hi':
            value = value.replace('राज्य', 'स्थिति')
        if locale == 'nl':
            value = re.sub(r'\bstaten\b', 'toestanden', value, flags=re.I)
            value = re.sub(r'\bstaat\b', 'toestand', value, flags=re.I)
    for concept, rules in DOMAIN_RULES.get(locale, {}).items():
        if not re.search(r'\b' + {'cover': 'covers?', 'base': 'bases?|base', 'state': 'states?', 'case': 'cases?', 'candidate': 'candidates?', 'lie': 'lie|lies', 'deduction': 'deductions?', 'round': 'round', 'legend': 'legend'}[concept] + r'\b', source, re.I):
            continue
        for old, new in rules:
            pattern = r'\b' + old + r'\b' if locale == 'tr' else old
            value = re.sub(pattern, lambda m: new[0].upper() + new[1:] if m[0][0].isupper() else new, value, flags=re.I)
    if locale == 'th' and re.search(r'\b[1-9]s\b', source):
        value = re.sub(r'([1-9])\s*วินาที', r'ตัวเลือกเลข \1', value)
    truth_words = {
        'ko': ('참', '거짓'), 'vi': ('đúng', 'sai'),
        'th': ('จริง', 'เท็จ'), 'ar': ('صحيح', 'خاطئ'),
        'tr': ('doğru', 'yanlış'), 'fil': ('tama', 'mali'),
    }
    if locale in truth_words and re.search(r'\b(?:true|false)\b', source, re.I):
        for english, native in zip(('true', 'false'), truth_words[locale]):
            value = re.sub(r'(?<![A-Za-z])' + english + r'(?![A-Za-z])', native, value, flags=re.I)
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--traditional-source', type=Path)
    args = parser.parse_args()
    directory = ROOT / 'src/localization/generated'
    if args.traditional_source:
        rows = json.loads(args.traditional_source.read_text())
        converter = shutil.which('uconv') or '/opt/homebrew/opt/icu4c/bin/uconv'
        converted = subprocess.run([converter, '-x', 'Simplified-Traditional'], input=json.dumps({r['source']: r['chinese'] for r in rows}, ensure_ascii=False), text=True, capture_output=True, check=True)
        (directory / 'zh-Hant.json').write_text(json.dumps(json.loads(converted.stdout), ensure_ascii=False, indent=2) + '\n')
    terminology = json.loads((ROOT / 'tools/localization/terminology.json').read_text())
    reviewed = json.loads((ROOT / 'tools/localization/reviewed-core-copy.json').read_text())
    for locale, terms in terminology.items():
        path = directory / (locale + '.json')
        catalog = json.loads(path.read_text())
        catalog = {source: correct(source, value, locale) for source, value in catalog.items()}
        catalog.update(terms)
        catalog.update({source: correct(source, value, locale) for source, value in reviewed[locale].items()})
        serialized = json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'
        if path.read_text() != serialized:
            path.write_text(serialized)


if __name__ == '__main__':
    main()
