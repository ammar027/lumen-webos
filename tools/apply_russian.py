#!/usr/bin/env python3
"""Add Russian after all upstream UI layers: python3 tools/apply_russian.py."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'app'


def sub(path, pairs):
    target = APP / path
    text = target.read_text()
    for old, new in pairs:
        if old not in text:
            raise ValueError(f'{path}: missing {old[:100]!r}')
        text = text.replace(old, new)
    target.write_text(text)


translations = json.loads((ROOT / 'tools/ru.json').read_text())
(APP / 'src/lib/ru.ts').write_text('export const RU: Record<string, string> = ' + json.dumps(translations, ensure_ascii=False, indent='\t') + ';\n')
sub('src/lib/i18n.ts', [
    ('export const LANGS = [', "import {RU} from './ru';\n\nexport const LANGS = [\n\t{code: 'ru', name: 'Русский', locale: 'ru-RU'},"),
    ("current = LANGS.some((l) => l.code === base) ? base : 'en';", "current = LANGS.some((l) => l.code === base) ? base : 'en';\n\tdocument.documentElement.lang = current;"),
    ('vars?: {n: number}', 'vars?: Record<string, string | number>'),
    ('let out = row && at >= 0 && row[at] ? row[at] : text;', "let out = current === 'ru' ? RU[text] || text : row && at >= 0 && row[at] ? row[at] : text;"),
    ("if (vars) out = out.replace('{n}', String(vars.n));", "if (vars) out = out.replace(/\\{(\\w+)\\}/g, (match, key: string) => vars[key] === undefined ? match : String(vars[key]));")
])

for path, pairs in {
    'src/components/SettingsList.tsx': [("{description || ''}", "{tr(description || '')}")],
    'src/components/OptionList.tsx': [('{o.description}', '{tr(o.description)}')],
    'src/components/WallpaperPicker.tsx': [
        ("import {clamp}", "import {t as tr} from '../lib/i18n';\nimport {clamp}"),
        ('>{c}</div>', '>{tr(c)}</div>'),
        ("{e.tint ? '\\u25B6' : e.key.indexOf('selectall:') === 0 ? 'Select all' : e.key === 'none' ? 'Plain' : 'Shuffle'}", "{e.tint ? '\\u25B6' : tr(e.key.indexOf('selectall:') === 0 ? 'Select all' : e.key === 'none' ? 'Plain' : 'Shuffle')}"),
        ('{e.title}', '{tr(e.title)}')
    ],
    'src/components/VideoCaption.tsx': [
        ("import {useEffect", "import {t as tr} from '../lib/i18n';\nimport {useEffect"),
        ('{clip.name}', '{tr(clip.name)}'), ('{clip.title}', '{tr(clip.title)}')
    ],
    'src/components/Tile.tsx': [
        ("import {CheckMark", "import {t as tr} from '../lib/i18n';\nimport {CheckMark"),
        ("model.label.charAt(0)", "tr(model.label).charAt(0)"), ('{model.label}', '{tr(model.label)}')
    ],
    'src/components/AppSwitcher.tsx': [("a.title.charAt(0)", "tr(a.title).charAt(0)"), ('{a.title}', '{tr(a.title)}')],
    'src/components/StandBy.tsx': [
        ('{langLocale, getClockMode}', '{langLocale, getClockMode, t as tr, weekStartsMonday}'),
        ('const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();', 'const monday = weekStartsMonday();\n\tconst first = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + (monday ? 6 : 0)) % 7;'),
        ('new Date(2023, 0, 1 + i)', 'new Date(2023, 0, (monday ? 2 : 1) + i)'),
        ("{weekday: 'narrow'}", "{weekday: monday ? 'short' : 'narrow'}"),
        ('i % 7 === 0 || i % 7 === 6', '(monday ? i % 7 >= 5 : i % 7 === 0 || i % 7 === 6)'),
        ('{FACE_NAMES[name]} · ◀ ▶ face · ▲ ▼ colour · OK exit', "{tr(FACE_NAMES[name])} · {tr('◀ ▶ face · ▲ ▼ colour · OK exit')}")
    ],
    'src/components/Clock.tsx': [('{getClockMode}', '{getClockMode, langLocale}'), ('toLocaleDateString(undefined,', 'toLocaleDateString(langLocale(),')],
    'src/components/ClockPreview.tsx': [("import {useEffect", "import {langLocale} from '../lib/i18n';\nimport {useEffect"), ('toLocaleDateString(undefined,', 'toLocaleDateString(langLocale(),')],
    'src/components/Row.tsx': [("import {LAYOUT}", "import {t as tr} from '../lib/i18n';\nimport {LAYOUT}"), ("emptyText || 'Nothing here yet'", "tr(emptyText || 'Nothing here yet')")],
    'src/components/Header.tsx': [("import {greeting}", "import {t as tr} from '../lib/i18n';\nimport {greeting}"), ('{greeting(now)}', '{tr(greeting(now))}')],
    'src/lib/clock.ts': [("export type TimeFormat", "import {t as tr} from './i18n';\n\nexport type TimeFormat"), ("period: h < 12 ? 'AM' : 'PM'", "period: tr(h < 12 ? 'AM' : 'PM')")],
    'src/components/WeatherIcon.tsx': [
        ('thunder|storm', 'thunder|storm|гроза'), ('snow|sleet|ice', 'snow|sleet|ice|снег'),
        ('rain|drizzle|shower', 'rain|drizzle|shower|дождь|ливни'), ('fog|mist|haze|smoke|dust', 'fog|mist|haze|smoke|dust|туман'),
        ('partly|mostly clear|few clouds|scattered', 'partly|mostly clear|few clouds|scattered|переменная облачность'), ('cloud|overcast', 'cloud|overcast|облачно')
    ],
    'src/screens/Home.tsx': [
        ('No inputs selected: add some in Settings &gt; Sources', "{tr('No inputs selected: add some in Settings > Sources')}"),
        ('{n.folder}', '{tr(n.folder)}')
    ],
    'src/app.tsx': [
        ('t as tr}', 't as tr, duration}'),
        ('setToast({text, kind});', 'setToast({text: tr(text), kind});'),
        ("['Light', 'Regular', 'Bold']", "['Thin', 'Regular', 'Bold']"),
        ("w.place + ' \\u00b7 '", "tr(w.place) + ' \\u00b7 '"),
        ('"Language of the menus, dates and weather. Auto follows the TV. The long descriptions on this screen stay in English."', "'Language of the menus, descriptions, dates and weather. Auto follows the TV.'"),
        ('`${config.wpAutoMinutes} min`', "tr('{n} min', {n: config.wpAutoMinutes})"),
        ('`${n} min`', "tr('{n} min', {n})"),
        ("(n < 60 ? `${n} seconds` : n === 60 ? '1 minute' : `${n / 60} minutes`)", "(n < 60 ? duration(n, 'second') : duration(n / 60, 'minute'))"),
        ('`${Math.abs(n)} px ${n < 0 ? neg : pos}`', "tr('{n} px {direction}', {n: Math.abs(n), direction: tr(n < 0 ? neg : pos)})"),
        ("'Immich: ' + x.title", "'Immich: ' + tr(x.title)"),
        ('`Couldn\'t open ${label}`', "tr(\"Couldn't open {name}\", {name: tr(label)})"),
        ('`Uninstalling ${title}…`', "tr('Uninstalling {name}…', {name: tr(title)})"),
        ('`${title} is still installed`', "tr('{name} is still installed', {name: tr(title)})"),
        ('`${title} uninstalled`', "tr('{name} uninstalled', {name: tr(title)})"),
        ('`Couldn\'t uninstall ${title}`', "tr(\"Couldn't uninstall {name}\", {name: tr(title)})")
    ],
    'src/components/ControlCenter.tsx': [
        ('t as tr}', 't as tr, duration}'),
        ('`Couldn\'t change ${what}`', "tr(\"Couldn't change {setting}\", {setting: tr(what)})"),
        ('tr(`${m} minutes`)', "duration(m, 'minute')"),
        ('{i.sub}', '{tr(i.sub)}'), ('{o.label}', '{tr(o.label)}')
    ]
}.items():
    sub(path, pairs)

with (APP / 'src/lib/i18n.ts').open('a') as out:
    out.write("""
export function weekStartsMonday (): boolean { return current === 'ru'; }

export function duration (n: number, unit: 'minute' | 'second'): string {
\tif (current !== 'ru') return t(`${n} ${n === 1 ? unit : unit + 's'}`);
\tconst mod10 = n % 10, mod100 = n % 100;
\tconst form = mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2;
\treturn `${n} ${unit === 'minute' ? ['минута', 'минуты', 'минут'][form] : ['секунда', 'секунды', 'секунд'][form]}`;
}
""")

print(f'Russian applied: {len(translations)} entries')
