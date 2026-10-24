#!/usr/bin/env python3
"""Fifty-fifth patch layer: two ideas from @xcv58's webOS 5 trial (PR #8), brought into Lumen on their own.
1. Icons: the fast one-shot read stays (nothing changes on a TV where it works). Image type is now read from the data instead of assuming PNG, and any icon the
   one-shot read missed (webOS 5's shell cuts off big outputs, one bad file spoils the batch) is read again in small pieces, one icon at a time, so one failure no longer loses the rest.
2. Inputs: a port the TV only calls "Input Source 3" is shown as "HDMI 3" (or "AV")."""
import os
APP = os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/lib/')

p = APP + 'apps.ts'
s = open(p).read()
old_mime = "const url = `data:image/png;base64,${match[2]}`;"
assert old_mime in s and 'iconMime' not in s
s = s.replace(old_mime, "const url = `data:${iconMime(match[2])};base64,${match[2]}`;")
old_tail = """		writeIconCache(cache);
		return result;
	}).catch(() => result);
}
"""
new_tail = """	}).catch(() => undefined).then(() => {
		// anything the one-shot read missed: again in small pieces, a few at a time, each failure on its own
		const left = missing.filter((m) => !result[m.id]);
		return readInPieces(left, result, cache);
	}).then(() => {
		writeIconCache(cache);
		return result;
	});
}

function iconMime (b64: string): string {
	return b64.indexOf('/9j/') === 0 ? 'image/jpeg' : b64.indexOf('UklGR') === 0 ? 'image/webp' : 'image/png';
}

/** Slow path for icons the single read missed: size first, then 24 KB pieces (a TV's shell cuts off larger outputs). Icons over 2 MB are skipped. */
async function readInPieces (list: {id: string; path: string}[], result: Record<string, string>, cache: Record<string, string>): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < list.length) {
			const m = list[next++];
			try {
				const size = Number((await exec(`stat -c %s ${shellQuote(m.path)} 2>/dev/null`)).trim());
				if (!size || size > 2 * 1024 * 1024) continue;
				let encoded = '';
				for (let at = 0; at < size; at += 24576) {
					const piece = (await exec(`dd if=${shellQuote(m.path)} bs=24576 skip=${at / 24576} count=1 2>/dev/null | base64 | tr -d '\\\\n'`)).trim();
					if (!/^[A-Za-z0-9+\\/]+={0,2}$/.test(piece)) throw new Error('bad piece');
					encoded += piece;
				}
				// the pieces are base64 of whole 24576-byte blocks, so they join without padding in the middle
				const url = `data:${iconMime(encoded)};base64,${encoded}`;
				result[m.id] = url;
				cache[m.path] = url;
			} catch { /* this icon stays on its catalogue picture */ }
		}
	};
	await Promise.all([worker(), worker(), worker()]);
}
"""
assert old_tail in s
s = s.replace(old_tail, new_tail)
open(p, 'w').write(s)

p = APP + 'inputs.ts'
s = open(p).read()
assert 'inputName' not in s
s = s.replace("\t\t\t\tlabel: d.label,\n", "\t\t\t\tlabel: inputName(d),\n")
s = s.replace("function listExternalInputs", """/** Some TVs only call a port "Input Source 3": say what it is instead. A name the user chose is kept. */
export function inputName (d: {id: string; label: string; port: number}): string {
	if (!/^Input Source\\s*\\d+$/i.test(d.label)) return d.label;
	if (/^HDMI_\\d+$/.test(d.id)) return 'HDMI ' + d.port;
	if (/^AV_\\d+$/.test(d.id)) return 'AV';
	return d.label;
}

function listExternalInputs""", 1)
open(p, 'w').write(s)
print('ok')
