// The commands Lumen runs as root through the Homebrew Channel's exec service, for Immich (from the fork's lib/root.ts, MIT). Nothing else here builds a shell
// command: each export is one fixed command, and any value that goes into one is checked against a pattern first, then shell-quoted.

import {LUNA} from '../config/constants';
import {isWebOS, lunaCall} from './luna';

/** The TV-side folder shared with tools/tv/watch.sh. */
export const HOMEHOOK = '/var/lib/homehook';

const BASE64 = /^[A-Za-z0-9+\/]*={0,2}$/;
/** Files under HOMEHOOK that Lumen may read. */
const FILES = ['immich.json', 'lumen-config.json'] as const;
export type HomehookFile = typeof FILES[number];

function shellQuote (value: string): string { return `'${value.replace(/'/g, `'\\''`)}'`; }

function run (command: string, timeoutMs = 6000): Promise<string> {
	if (!isWebOS()) return Promise.reject(new Error('not on a TV'));
	return lunaCall<{stdoutString?: string}>(LUNA.homebrewExec, {command}, timeoutMs).then((r) => r.stdoutString || '');
}

/** An Immich server's address (scheme, host and port only) and an API key, as checked before either reaches the shell. */
const IMMICH_BASE = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/;
const IMMICH_KEY = /^[A-Za-z0-9_-]{16,128}$/;
/** The only Immich paths Lumen asks for. */
const IMMICH_PATHS = [
	/^\/api\/server\/version$/,
	/^\/api\/albums$/,
	/^\/api\/search\/random$/,
	/^\/api\/memories\?for=\d{4}-\d{2}-\d{2}$/,
	/^\/api\/assets\/[0-9a-f-]{36}\/thumbnail\?size=thumbnail$/,
	/^\/api\/faces\?id=[0-9a-f-]{36}$/
];

/** One request to an Immich server, made with curl on the TV: Immich sends no CORS headers outside its dev mode, so the app's own fetch would
 *  be refused. A JSON body travels as base64. `as: 'base64'` returns the response body base64-encoded (for a thumbnail). */
export function immichRequest (base: string, key: string, path: string, opts: {body?: object; as?: 'text' | 'base64'} = {}): Promise<string> {
	if (!IMMICH_BASE.test(base) || !IMMICH_KEY.test(key) || !IMMICH_PATHS.some((re) => re.test(path))) return Promise.reject(new Error('refused: immich request'));
	const curl = `curl -sf -m 15 -H ${shellQuote('x-api-key: ' + key)} -H 'accept: application/json'`;
	const url = shellQuote(base + path);
	const command = opts.body
		? `echo ${toBase64(JSON.stringify(opts.body))} | base64 -d | ${curl} -H 'content-type: application/json' --data-binary @- ${url}`
		: `${curl} ${url}`;
	return run(opts.as === 'base64' ? `${command} | base64 | tr -d '\\n'` : command, 20000);
}

/** The ids in every stack on an Immich server, as '<primaryAssetId>' or '=<id>' lines. Only the ids leave the TV. Needs the API key to have stack.read. */
export function immichStackIds (base: string, key: string): Promise<string> {
	if (!IMMICH_BASE.test(base) || !IMMICH_KEY.test(key)) return Promise.reject(new Error('refused: immich request'));
	const curl = `curl -sf -m 15 -H ${shellQuote('x-api-key: ' + key)} -H 'accept: application/json'`;
	return run(`${curl} ${shellQuote(base + '/api/stacks')} | grep -oE '"(primaryAssetId|id)":"[0-9a-f-]{36}"' | sed -e 's/^"primaryAssetId":"//' -e 's/^"id":"/=/' -e 's/"$//'`, 20000);
}

/** Writes text to one of FILES. The text travels as base64, so nothing in it is ever read by the shell. */
export function writeFile (name: HomehookFile, text: string): Promise<void> {
	if (FILES.indexOf(name) === -1) return Promise.reject(new Error('unknown file ' + name));
	const b64 = toBase64(text);
	return run(`mkdir -p ${HOMEHOOK} && echo ${b64} | base64 -d > ${HOMEHOOK}/${name}.tmp && mv ${HOMEHOOK}/${name}.tmp ${HOMEHOOK}/${name}`).then(() => undefined);
}

/** The contents of one of FILES, or '' when it does not exist. */
export function readFile (name: HomehookFile): Promise<string> {
	if (FILES.indexOf(name) === -1) return Promise.reject(new Error('unknown file ' + name));
	return run(`[ -f ${HOMEHOOK}/${name} ] && base64 ${HOMEHOOK}/${name} | tr -d '\\n'; true`).then((out) => fromBase64(out.trim()));
}

function toBase64 (text: string): string {
	const b64 = btoa(unescape(encodeURIComponent(text)));
	if (!BASE64.test(b64)) throw new Error('bad base64');   // cannot happen; the check keeps the command safe if btoa ever changes
	return b64;
}

function fromBase64 (b64: string): string {
	if (!b64) return '';
	if (!BASE64.test(b64)) throw new Error('bad base64 from the TV');
	return decodeURIComponent(escape(atob(b64)));
}
