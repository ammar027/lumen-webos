// Temperature for the time-pill menu. The place is the chosen city, or (Auto) found from the internet connection with ipwho.is
// (no key); the weather comes from open-meteo.com (no key). Cached 30 minutes per place; any failure just shows nothing.

import type {City} from '../config/cities';

export interface Weather {
	temp: number;
	label: string;
	place: string;
}

const MAX_AGE_MS = 30 * 60 * 1000;

function describe (code: number): string {
	if (code === 0) return 'Clear';
	if (code <= 2) return 'Partly cloudy';
	if (code === 3) return 'Cloudy';
	if (code === 45 || code === 48) return 'Fog';
	if (code >= 51 && code <= 67) return 'Rain';
	if (code >= 71 && code <= 77) return 'Snow';
	if (code >= 80 && code <= 82) return 'Showers';
	if (code >= 95) return 'Storm';
	return '';
}

export function readWeather (city: City | null): Promise<Weather> {
	const key = 'launcher-weather-v2-' + (city ? city.name : 'auto');
	try {
		const cached = JSON.parse(localStorage.getItem(key) || 'null') as {t: number; w: Weather} | null;
		if (cached && Date.now() - cached.t < MAX_AGE_MS) return Promise.resolve(cached.w);
	} catch { /* fetch fresh */ }
	const where: Promise<{lat: number; lon: number; place: string}> = city
		? Promise.resolve({lat: city.lat, lon: city.lon, place: city.name})
		: fetch('https://ipwho.is/')
			.then((r) => r.json() as Promise<{success?: boolean; latitude?: number; longitude?: number; city?: string}>)
			.then((p) => {
				if (!p.success || typeof p.latitude !== 'number' || typeof p.longitude !== 'number') throw new Error('no location');
				return {lat: p.latitude, lon: p.longitude, place: p.city || ''};
			});
	return where
		.then((p) => fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code&timezone=auto`)
			.then((r) => r.json() as Promise<{current?: {temperature_2m?: number; weather_code?: number}}>)
			.then((d) => {
				const c = d.current;
				if (!c || typeof c.temperature_2m !== 'number') throw new Error('no weather');
				const w: Weather = {temp: Math.round(c.temperature_2m), label: describe(c.weather_code || 0), place: p.place};
				try { localStorage.setItem(key, JSON.stringify({t: Date.now(), w})); } catch { /* ignore */ }
				return w;
			}));
}
