/** A small weather symbol for the weather line ("Clear", "Partly cloudy", "Rain"...). Night (7 pm to 6 am) turns clear into a moon. */
export function WeatherIcon ({text}: {text: string}) {
	const t = text.toLowerCase();
	const h = new Date().getHours();
	const night = h >= 19 || h < 6;
	const common = {viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'wicon', 'aria-hidden': true} as const;
	const cloud = <path d="M9 23h14a5 5 0 0 0 .6-9.96A7 7 0 0 0 10 12.5 5.2 5.2 0 0 0 9 23z" />;
	const sun = <g><circle cx="16" cy="16" r="5" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="16" y1="4.5" x2="16" y2="7.5" transform={`rotate(${a} 16 16)`} />)}</g>;
	const moon = <path d="M22 20.5A9 9 0 0 1 11.5 10 9 9 0 1 0 22 20.5z" />;
	if (/thunder|storm/.test(t)) return <svg {...common}>{cloud}<path d="M16 23l-2.5 4.5h4L15 31" /></svg>;
	if (/snow|sleet|ice/.test(t)) return <svg {...common}>{cloud}<path d="M11 27h.01M16 28h.01M21 27h.01" /></svg>;
	if (/rain|drizzle|shower/.test(t)) return <svg {...common}>{cloud}<path d="M12 26.5l-1 2.5M17 26.5l-1 2.5M22 26.5l-1 2.5" /></svg>;
	if (/fog|mist|haze|smoke|dust/.test(t)) return <svg {...common}><path d="M6 12h20M4 17h24M8 22h16" /></svg>;
	if (/partly|mostly clear|few clouds|scattered/.test(t)) return <svg {...common}><g transform="translate(-3 -4) scale(.72)">{night ? moon : sun}</g><g transform="translate(5 4) scale(.8)">{cloud}</g></svg>;
	if (/cloud|overcast/.test(t)) return <svg {...common}>{cloud}</svg>;
	return <svg {...common}>{night ? moon : sun}</svg>;
}
