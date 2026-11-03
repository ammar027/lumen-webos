import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire, stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'app/src');
const require = createRequire(path.join(root, 'app/package.json'));
const {parse} = require('@babel/parser');
const ru = JSON.parse(fs.readFileSync(path.join(root, 'tools/ru.json'), 'utf8'));
const needed = new Set();
const names = new Set(['Immich', 'AirPlay', 'FILMMAKER', 'English', 'Deutsch', 'Español', 'Français', 'Italiano', 'Português', 'Nederlands', 'Türkçe']);
const fragments = new Set(['Immich: ', 'Add to ']);

function visit(node, fn) {
    if (!node || typeof node !== 'object') return;
    fn(node);
    for (const [key, value] of Object.entries(node)) {
        if (['loc', 'start', 'end', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(child => visit(child, fn));
        else if (value && typeof value === 'object') visit(value, fn);
    }
}

const files = ['app.tsx', ...fs.readdirSync(path.join(src, 'screens')).map(f => `screens/${f}`), ...fs.readdirSync(path.join(src, 'components')).map(f => `components/${f}`)];
for (const file of files) {
    const code = fs.readFileSync(path.join(src, file), 'utf8');
    const ast = parse(code, {sourceType: 'module', plugins: ['typescript', 'jsx']});
    visit(ast, node => {
        if (node.type === 'StringLiteral' && /^(?:[A-Z][a-z]|[A-Z]{2,}(?:[ -]|$))/.test(node.value)) needed.add(node.value);
        if (node.type === 'CallExpression' && ['tr', 't'].includes(node.callee.name) && node.arguments[0]?.type === 'StringLiteral') needed.add(node.arguments[0].value);
        if (node.type === 'JSXText' && /[A-Za-z]/.test(node.value)) assert.fail(`${file}: untranslated JSX: ${node.value.trim()}`);
    });
}

for (const file of ['config/wallpapers.ts', 'config/wallpaperVideos.ts', 'config/cities.ts', 'config/systemApps.ts']) {
    const ast = parse(fs.readFileSync(path.join(src, file), 'utf8'), {sourceType: 'module', plugins: ['typescript']});
    visit(ast, node => {
        if (node.type === 'ObjectProperty' && ['title', 'name', 'category'].includes(node.key.name) && node.value.type === 'StringLiteral') needed.add(node.value.value);
    });
}
for (const file of ['lib/tvcontrols.ts', 'lib/immich.ts']) {
    const ast = parse(fs.readFileSync(path.join(src, file), 'utf8'), {sourceType: 'module', plugins: ['typescript']});
    visit(ast, node => {
        if (node.type === 'VariableDeclarator' && ['PICTURE_LABEL', 'SOUND_LABEL', 'IMMICH_SOURCES'].includes(node.id.name)) {
            visit(node.init, item => { if (item.type === 'StringLiteral' && !item.value.startsWith('immich:')) needed.add(item.value); });
        }
    });
}
const source = fs.readFileSync(path.join(src, 'lib/i18n.ts'), 'utf8');
const table = JSON.parse(source.match(/const TABLE: Record<string, string\[\]> = (\{[\s\S]*?\n\});/)[1]);
Object.keys(table).forEach(key => needed.add(key));
['Games', 'Tools', 'Media'].forEach(folder => needed.add('Add to ' + folder));
const missing = [...needed].filter(key => key && !names.has(key) && !fragments.has(key) && !ru[key]);
assert.deepEqual(missing, [], 'Missing Russian translations');

for (const [key, value] of Object.entries(ru)) {
    assert.ok(value.trim(), `Empty translation: ${key}`);
    assert.match(value, /[А-Яа-яЁё]/u, `No Russian text: ${key}`);
    const tokens = text => (text.match(/\{\w+\}/g) || []).sort();
    assert.deepEqual(tokens(value), tokens(key), `Placeholders: ${key}`);
}

const document = {documentElement: {lang: ''}};
const code = stripTypeScriptTypes(source.replace(/^import .*$/gm, '').replace(/\bexport /g, ''));
const api = vm.runInNewContext(code + '\n({t, setLang, langLocale, duration, weekStartsMonday})', {RU: ru, document, navigator: {language: 'ru-RU'}});
api.setLang('auto');
assert.equal(api.langLocale(), 'ru-RU');
assert.equal(document.documentElement.lang, 'ru');
assert.equal(api.weekStartsMonday(), true);
assert.equal(api.t('Settings'), 'Настройки');
assert.equal(api.t("Couldn't open {name}", {name: 'KPuppy'}), 'Не удалось открыть: KPuppy');
assert.equal(api.t('{n} px {direction}', {n: 200, direction: 'вправо'}), '200 пкс вправо');
assert.equal(api.t('unregistered.external.app'), 'unregistered.external.app');
for (const [n, unit, expected] of [[1, 'minute', '1 минута'], [2, 'minute', '2 минуты'], [5, 'minute', '5 минут'], [11, 'minute', '11 минут'], [21, 'minute', '21 минута'], [22, 'minute', '22 минуты'], [111, 'minute', '111 минут'], [10, 'second', '10 секунд'], [21, 'second', '21 секунда'], [24, 'second', '24 секунды']]) {
    assert.equal(api.duration(n, unit), expected);
}
api.setLang('de');
assert.equal(api.t('Settings'), 'Einstellungen');
assert.equal(api.weekStartsMonday(), false);
api.setLang('en');
assert.equal(api.t('Settings'), 'Settings');
api.setLang('unknown');
assert.equal(api.langLocale(), 'en-US');
console.log(`Russian: ${Object.keys(ru).length} translations; ${needed.size} UI/catalogue strings covered; locale, placeholders and plurals passed`);
