// A small cache in localStorage for what the last launch knew (from the fork's lib/boot.ts, MIT).

/** The last value stored under `key`, or null. */
export function readCache<T> (key: string): T | null {
	try { return JSON.parse(localStorage.getItem(key) || 'null') as T | null; } catch { return null; }
}

export function writeCache (key: string, value: unknown): void {
	try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full: asked again next time */ }
}
