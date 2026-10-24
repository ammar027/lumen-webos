import {useRef, useState} from 'preact/hooks';
import {t as tr} from '../lib/i18n';
import {useKeys, clamp, type NavKey} from '../hooks/useKeys';
import type {AppEntry} from '../lib/apps';

interface Props {
	/** the apps that are open now (Lumen itself left out) */
	apps: AppEntry[];
	onOpen: (id: string, title: string) => void;
	onCloseApp: (id: string) => void;
	onCloseAll: () => void;
	onExit: () => void;
}

/** Recent Apps, after the Apple TV app switcher: a card per open app. Left/Right pick, Up closes the app, OK opens it, Down reaches Close all. */
export function AppSwitcher ({apps, onOpen, onCloseApp, onCloseAll, onExit}: Props) {
	const [index, setIndex] = useState(0);
	const [onAll, setOnAll] = useState(false);
	const now = useRef({index: 0, onAll: false, n: 0});
	now.current = {index, onAll, n: apps.length};
	const pick = (i: number) => { now.current.index = i; setIndex(i); };
	const all = (v: boolean) => { now.current.onAll = v; setOnAll(v); };

	useKeys((key: NavKey) => {
		const {index: i, onAll: a, n} = now.current;
		if (key === 'back') { onExit(); return true; }
		if (n === 0) { if (key === 'enter') onExit(); return true; }
		if (key === 'left' && !a) pick(clamp(i - 1, 0, n - 1));
		else if (key === 'right' && !a) pick(clamp(i + 1, 0, n - 1));
		else if (key === 'down') all(true);
		else if (key === 'up') { if (a) all(false); else { const app = apps[i]; if (app) { onCloseApp(app.id); pick(clamp(i, 0, n - 2)); } } }
		else if (key === 'enter') { if (a) onCloseAll(); else if (apps[i]) onOpen(apps[i].id, apps[i].title); }
		return true;
	});

	return (
		<div class="switcher">
			<h1 class="switcher__title">{tr('Recent Apps')}</h1>
			{apps.length === 0
				? <p class="switcher__empty">{tr('No other apps are open')}</p>
				: <div class="switcher__cards">
					{apps.map((a, i) => (
						<div key={a.id} class={`switcher__card${i === index && !onAll ? ' switcher__card--focus' : ''}`} onMouseEnter={() => { all(false); pick(i); }} onClick={() => onOpen(a.id, a.title)}>
							<div class="switcher__art" style={a.iconUrl ? `background-image:url("${a.iconUrl}")` : `background:${a.color || '#3b4256'}`}>{a.iconUrl ? '' : a.title.charAt(0)}</div>
							<span class="switcher__name">{a.title}</span>
						</div>
					))}
				</div>}
			<div class="switcher__hint">{apps.length > 0 ? tr('Up closes an app, OK opens it') : ''}</div>
			{apps.length > 0 && <div class={`switcher__all${onAll ? ' switcher__all--focus' : ''}`} onClick={onCloseAll}>{tr('Close all')}</div>}
		</div>
	);
}
