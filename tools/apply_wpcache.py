#!/usr/bin/env python3
"""Layer: cloud wallpapers (and their pre-blurred copies) are kept in IndexedDB once loaded, so a cold start shows them straight from the TV. Before, every launch asked the image resizer again, and that check alone took ~0.5 s on the TV (measured Nov 7)."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
edit(P('lib/wallpaper.ts'), [
 ("const PROXY = 'https://images.weserv.nl/';       // free image resizer: a 1920-wide copy instead of the multi-MB original\n",
  "const PROXY = 'https://images.weserv.nl/';       // free image resizer: a 1920-wide copy instead of the multi-MB original\n"
  "\n"
  "// Resized cloud pictures are kept in IndexedDB once loaded, so a cold start shows them from the TV instead of asking the resizer\n"
  "// again (that check took ~0.5 s per launch). The first time the picture loads normally and is saved in the background.\n"
  "let wpDb: Promise<IDBDatabase | null> | null = null;\n"
  "function cacheDb (): Promise<IDBDatabase | null> {\n"
  "\tif (!wpDb) wpDb = new Promise((done) => {\n"
  "\t\ttry {\n"
  "\t\t\tconst q = indexedDB.open('lumen-wp-cache', 1);\n"
  "\t\t\tq.onupgradeneeded = () => q.result.createObjectStore('img');\n"
  "\t\t\tq.onsuccess = () => done(q.result);\n"
  "\t\t\tq.onerror = () => done(null);\n"
  "\t\t} catch (e) { done(null); }\n"
  "\t});\n"
  "\treturn wpDb;\n"
  "}\n"
  "const objectUrls: Record<string, string> = {};\n"
  "function save (d: IDBDatabase, url: string): void {\n"
  "\tfetch(url).then((r) => (r.ok ? r.blob() : null)).then((blob) => {\n"
  "\t\tif (!blob || blob.size === 0) return;\n"
  "\t\tconst store = d.transaction('img', 'readwrite').objectStore('img');\n"
  "\t\tconst n = store.count();\n"
  "\t\tn.onsuccess = () => { if (n.result > 40) store.clear(); store.put(blob, url); };   // shuffle would grow it forever: start over past 40\n"
  "\t}).catch(() => undefined);\n"
  "}\n"
  "/** The saved copy of a resized cloud picture (an object URL), or the URL itself when there is none yet. */\n"
  "function cachedSrc (url: string): Promise<string> {\n"
  "\tif (url.indexOf(PROXY) !== 0) return Promise.resolve(url);\n"
  "\tif (objectUrls[url]) return Promise.resolve(objectUrls[url]);\n"
  "\treturn cacheDb().then((d) => new Promise<string>((done) => {\n"
  "\t\tif (!d) { done(url); return; }\n"
  "\t\ttry {\n"
  "\t\t\tconst g = d.transaction('img').objectStore('img').get(url);\n"
  "\t\t\tg.onsuccess = () => {\n"
  "\t\t\t\tconst blob = g.result as Blob | undefined;\n"
  "\t\t\t\tif (blob) { objectUrls[url] = URL.createObjectURL(blob); done(objectUrls[url]); return; }\n"
  "\t\t\t\tdone(url);\n"
  "\t\t\t\tsave(d, url);\n"
  "\t\t\t};\n"
  "\t\t\tg.onerror = () => done(url);\n"
  "\t\t} catch (e) { done(url); }\n"
  "\t}));\n"
  "}\n"),
 ("\t\tconst probe = new Image();\n\t\tprobe.onload = () => style.setProperty(name, `url(\"${src}\")`);\n\t\tprobe.src = src;\n",
  "\t\tcachedSrc(src).then((s) => {\n\t\t\tconst probe = new Image();\n\t\t\tprobe.onload = () => style.setProperty(name, `url(\"${s}\")`);\n\t\t\tprobe.src = s;\n\t\t});\n"),
 ("\t\t\telement.style.backgroundImage = shownCss || `url(\"${shown}\")`;",
  "\t\t\telement.style.backgroundImage = shownCss || `url(\"${objectUrls[shown] || shown}\")`;"),
 ("\t\tconst img = new Image();\n\t\timg.onload = () => {\n\t\t\tif (mine !== token) return;\n\t\t\tshown = list[i];\n\t\t\treleased = false;\n\t\t\tel.style.backgroundImage = `url(\"${list[i]}\")`;\n\t\t\troot.add(HTML_CLASS);\n\t\t\tsetBlur(list[i]);\n\t\t};\n\t\timg.onerror = () => tryAt(i + 1);\n\t\timg.src = list[i];\n",
  "\t\tcachedSrc(list[i]).then((src) => {\n\t\t\tif (mine !== token) return;\n\t\t\tconst img = new Image();\n\t\t\timg.onload = () => {\n\t\t\t\tif (mine !== token) return;\n\t\t\t\tshown = list[i];\n\t\t\t\treleased = false;\n\t\t\t\tel.style.backgroundImage = `url(\"${src}\")`;\n\t\t\t\troot.add(HTML_CLASS);\n\t\t\t\tsetBlur(list[i]);\n\t\t\t};\n\t\t\timg.onerror = () => tryAt(i + 1);\n\t\t\timg.src = src;\n\t\t});\n"),
])
print('wpcache applied')
