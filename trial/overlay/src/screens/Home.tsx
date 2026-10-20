import {t as tr} from '../lib/i18n';
import {VideoCaption} from '../components/VideoCaption';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'preact/hooks';
import {Clock} from '../components/Clock';
import {Glyph} from '../components/Glyph';

import {Tile, type TileModel} from '../components/Tile';
import {useKeys, clamp, type NavKey} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {Status} from '../components/Status';
import {playNavigationTick, setNavigationSoundMode, stopNavigationSound, type NavigationSoundMode} from '../lib/navigationSound';

export interface HomeRow {
	id: string;
	label: string;
	items: TileModel[];
	emptyText?: string;
	compact?: boolean;
}

interface Props {
	rows: HomeRow[];
	/** the top bar: the Inputs button, then the time pill that opens the menu */
	topItems: TileModel[];
	/** what the time pill's menu lists (LG Home, Settings, Start Screensaver) */
	menuItems: TileModel[];
	active: boolean;
 navigationSounds?: NavigationSoundMode;
	onActivate: (rowId: string, item: TileModel) => void;
	/** show AM/PM beside the time (12-hour clocks) */
	showPeriod?: boolean;
	/** hold OK on an app: move it one place along its row, or take it off the home screen */
	onEdit?: (action: 'move' | 'remove' | 'folder-add' | 'folder-out', rowId: string, key: string, arg?: number | string) => void;
	/** the apps inside each folder, by folder name */
	folders?: Record<string, TileModel[]>;
	/** the weather line shown under the date at the top of the time-pill menu */
	weatherText?: string;
	/** off | down | idle | both: when the dock slides away */
	dockHide?: string;
}


/** the rows whose apps can be moved or removed (Recent is automatic) */
const EDITABLE = ['apps', 'dock'];
const FOLDER_PRESETS = ['Games', 'Tools', 'Media'];
const CTX_ITEMS = ['Move', 'Remove from Home'].concat(FOLDER_PRESETS.map((f) => 'Add to ' + f));
const CTX_FOLDER_ITEMS = ['Take out of Folder'];
const FOLDER_PREFIX = 'folder:';

/** Where the remote's focus is: a row of apps, the top bar, or one of the two open panels. */
type Zone = 'rows' | 'top' | 'menu' | 'ctx' | 'folder';

interface Nav {
	/** false = resting: nothing is focused until the remote (or the pointer) is used */
	engaged: boolean;
	zone: Zone;
	rowIndex: number;
 scrollIndex: number;
	columns: Record<string, number>;
	topIndex: number;
	menuIndex: number;
	ctxIndex: number;
	/** the key of the app being moved with the arrows, or null */
	moving: string | null;
	/** the OK that brought the focus up must not also open the app on release */
	swallowOk: boolean;
	/** a press-and-hold with the pointer just opened the menu: ignore the click that follows */
	suppressClick: boolean;
	/** the open folder (its name) and the focused app in it */
	folder: string;
	folderIndex: number;
	/** where the hold-OK menu was opened from, and where it returns to */
	ctxFrom: 'rows' | 'folder';
	/** who moved the focus last: leaving the dock with the pointer rests the icons, with the keys the focus stays */
	mode: 'key' | 'pointer';
	/** the dock is slid away; any key brings it back */
	dockHidden: boolean;
}

const PANEL_COLUMNS = 3;
const INPUTS_KEY = 'inputs';
const MENU_KEY = 'menu';

/** The home screen, navigated like tvOS:
 *  - Left/Right move along a row; Up/Down move between rows (same column, as far as that row reaches).
 *  - Up from the first row reaches the top bar (Inputs button, time pill); Down goes back to the same app.
 *  - OK on Inputs opens the inputs panel, OK on the time pill opens the menu; Back closes either.
 *  - The second row stays hidden until the remote goes down to it. */
export function Home ({rows, topItems, menuItems, active, navigationSounds = 'off', onActivate, showPeriod, onEdit, folders, weatherText, dockHide}: Props) {
	const nav = useRef<Nav>({engaged: true, zone: 'rows', rowIndex: 0, scrollIndex: 0, columns: {}, topIndex: 0, menuIndex: 0, ctxIndex: 0, moving: null, swallowOk: false, suppressClick: false, folder: '', folderIndex: 0, ctxFrom: 'rows', mode: 'key', dockHidden: false});
	const latest = useRef({rows, topItems, menuItems, onActivate, onEdit, folders, dockHide});
	latest.current = {rows, topItems, menuItems, onActivate, onEdit, folders, dockHide};
	const [, setLate] = useState(false);   // the rows below the first are drawn a moment after launch
	useEffect(() => { const id = window.setTimeout(() => setLate(true), 3500); return () => window.clearTimeout(id); }, []);
	const [, redraw] = useState(0);
	const render = () => redraw((n) => n + 1);

 useLayoutEffect(() => {
  setNavigationSoundMode(active ? navigationSounds : 'off');
  const hidden = () => {if(document.hidden)stopNavigationSound();else setNavigationSoundMode(active ? navigationSounds : 'off');};
  document.addEventListener('visibilitychange',hidden);
  return () => {setNavigationSoundMode('off');document.removeEventListener('visibilitychange',hidden);};
 },[active,navigationSounds]);

	// coming back to the launcher from another app: rest again
	useEffect(() => {
		const rest = () => {
			if (document.hidden) return;
			const n = nav.current;
			n.dockHidden = false; // retain app focus and grid position on return
			render();
		};
		document.addEventListener('visibilitychange', rest);
		return () => document.removeEventListener('visibilitychange', rest);
	}, []);

	// the idle timer follows the option; moving the pointer brings a hidden dock back
	useEffect(() => {
		const m = nav.current;
		if (dockHide === 'off' || dockHide === 'idle' || !dockHide) { if (dockHide !== 'idle' && m.dockHidden) { m.dockHidden = false; render(); } }
		armIdle();
		const show = () => { const k = nav.current; if (k.dockHidden) { k.dockHidden = false; armIdle(); render(); } };
		window.addEventListener('mousemove', show);
		return () => { window.removeEventListener('mousemove', show); window.clearTimeout(idleTimer.current); };
	}, [dockHide]);

	// while an app is being moved, keep the focus on it as it changes places (it may cross from one row to the next)
	useEffect(() => {
		const n = nav.current;
		if (!n.moving) return;
		for (let r = 0; r < rows.length; r++) {
			const c = rows[r].items.findIndex((t) => t.key === n.moving);
			if (c >= 0) { n.rowIndex = r; n.scrollIndex = r; n.columns[rows[r].id] = c; render(); return; }
		}
	}, [rows]);

	// a folder that has become empty closes
	useEffect(() => {
		const n = nav.current;
		if (n.zone === 'folder' && !((folders || {})[n.folder] || []).length) { n.zone = 'rows'; render(); }
	}, [folders]);

	const columnOf = (row: HomeRow) => clamp(nav.current.columns[row.id] || 0, 0, Math.max(0, row.items.length - 1));

	const activateTop = (i: number) => {
		const n = nav.current;
		const item = latest.current.topItems[i];
		if (!item) return;
		if (item.key === INPUTS_KEY) { n.zone = 'top'; n.engaged = true; render(); latest.current.onActivate('top', item); }
		else if (item.key === MENU_KEY) { n.menuIndex = 0; n.zone = 'menu'; render(); }
		else latest.current.onActivate('top', item);
	};
	const activateMenu = (i: number) => {
		const item = latest.current.menuItems[i];
		if (!item) return;
		nav.current.zone = 'top';
		render();
		latest.current.onActivate('menu', item);
	};
	const activateCtx = (i: number) => {
		const n = nav.current;
		setLate(true);
		const {rows: allRows, folders: fl, onEdit: edit} = latest.current;
		if (n.ctxFrom === 'folder') {
			const inside = ((fl || {})[n.folder] || [])[n.folderIndex];
			n.zone = 'folder';
			if (inside && edit) edit('folder-out', n.folder, inside.key);
			render();
			return;
		}
		const row = allRows[clamp(n.rowIndex, 0, allRows.length - 1)];
		const item = row && row.items[columnOf(row)];
		n.zone = 'rows';
		if (!item) { render(); return; }
		if (i === 0) n.moving = item.key;
		else if (i === 1 && edit) { edit('remove', row.id, item.key); n.columns[row.id] = clamp(columnOf(row), 0, Math.max(0, row.items.length - 2)); }
		else if (edit) edit('folder-add', row.id, item.key, FOLDER_PRESETS[i - 2]);
		render();
	};

	/** OK on a tile in a row: a folder opens, anything else is handed to the app */
	const activateRowItem = (rowId: string, item: TileModel) => {
		const n = nav.current;
		if (item.key.indexOf(FOLDER_PREFIX) === 0) { n.folder = item.key.slice(FOLDER_PREFIX.length); n.folderIndex = 0; n.zone = 'folder'; render(); return; }
		latest.current.onActivate(rowId, item);
	};

	/** a short OK press: open / activate whatever is focused */
	const press = () => {
		const n = nav.current;
		if (n.swallowOk) { n.swallowOk = false; return; }
		if (!n.engaged) return;
		const {rows: allRows, topItems: tops, onActivate: act} = latest.current;
		if (n.zone === 'menu') activateMenu(n.menuIndex);
		else if (n.zone === 'ctx') activateCtx(n.ctxIndex);
		else if (n.zone === 'folder') {
			const inside = ((latest.current.folders || {})[n.folder] || [])[n.folderIndex];
			if (inside) { n.zone = 'rows'; render(); act('folder', inside); }
		}
		else if (n.zone === 'top') { if (tops[n.topIndex]) activateTop(n.topIndex); }
		else if (n.moving) { n.moving = null; render(); }
		else {
			const row = allRows[clamp(n.rowIndex, 0, allRows.length - 1)];
			const item = row && row.items[columnOf(row)];
			if (item) activateRowItem(row.id, item);
		}
	};

	/** holding OK on an app opens its menu */
	const longPress = () => {
		const n = nav.current;
		if (n.engaged && n.zone === 'folder') { n.ctxFrom = 'folder'; n.ctxIndex = 0; n.zone = 'ctx'; render(); return; }
		if (!n.engaged || n.zone !== 'rows' || n.moving) return;
		const {rows: allRows} = latest.current;
		const row = allRows[clamp(n.rowIndex, 0, allRows.length - 1)];
		const held = row && row.items[columnOf(row)];
		if (!row || !EDITABLE.some((id) => row.id.indexOf(id) === 0) || !held || held.key.indexOf(FOLDER_PREFIX) === 0) return;
		n.ctxFrom = 'rows'; n.ctxIndex = 0; n.zone = 'ctx'; render();
	};
	useOkPress({onPress: press, onLongPress: longPress}, active);

	const holdTimer = useRef(0);
	const holdStart = () => {
		window.clearTimeout(holdTimer.current);
		holdTimer.current = window.setTimeout(() => { const n = nav.current; n.suppressClick = true; longPress(); }, 600);
	};
	const holdCancel = () => window.clearTimeout(holdTimer.current);

	const pointerLeft = () => {
		holdCancel();
		const n = nav.current;
		if (n.mode === 'pointer' && n.zone !== 'menu') { n.engaged = false; render(); }
	};

	const idleTimer = useRef(0);
	const armIdle = () => {
		window.clearTimeout(idleTimer.current);
		const mode = latest.current.dockHide;
		if (mode !== 'idle' && mode !== 'both') return;
		idleTimer.current = window.setTimeout(() => {
			const m = nav.current;
			if (m.zone === 'rows' && !m.moving && !document.hidden) { m.dockHidden = true; render(); }
		}, 8000);
	};

	const navigate = useCallback((key: NavKey): boolean => {
		const n = nav.current;
		setLate(true);
		const {rows: allRows, topItems: tops, menuItems: menu, onEdit: edit, folders: fl} = latest.current;
		n.mode = 'key';

		if (n.dockHidden) { n.dockHidden = false; armIdle(); render(); return true; }   // the key that brings the dock back does nothing else
		armIdle();
		if (!n.engaged) { n.engaged = true; if (key === 'enter') { n.swallowOk = true; render(); return true; } }   // the first press only brings the focus up
		if (key === 'enter') return true;   // handled by useOkPress (press vs hold)

		if (n.zone === 'menu') {
			switch (key) {
				case 'up': n.menuIndex = clamp(n.menuIndex - 1, 0, menu.length - 1); break;
				case 'down': n.menuIndex = clamp(n.menuIndex + 1, 0, menu.length - 1); break;
				case 'back': n.zone = 'top'; break;
			}
			render();
			return true;
		}
		if (n.zone === 'folder') {
			const last = ((fl || {})[n.folder] || []).length - 1;
			switch (key) {
				case 'left': n.folderIndex = clamp(n.folderIndex - 1, 0, last); break;
				case 'right': n.folderIndex = clamp(n.folderIndex + 1, 0, last); break;
				case 'up': if (n.folderIndex - PANEL_COLUMNS >= 0) n.folderIndex -= PANEL_COLUMNS; break;
				case 'down': if (n.folderIndex + PANEL_COLUMNS <= last) n.folderIndex += PANEL_COLUMNS; break;
				case 'back': n.zone = 'rows'; break;
			}
			render();
			return true;
		}
		if (n.zone === 'ctx') {
			const count = (n.ctxFrom === 'folder' ? CTX_FOLDER_ITEMS : CTX_ITEMS).length;
			switch (key) {
				case 'up': n.ctxIndex = clamp(n.ctxIndex - 1, 0, count - 1); break;
				case 'down': n.ctxIndex = clamp(n.ctxIndex + 1, 0, count - 1); break;
				case 'back': n.zone = n.ctxFrom; break;
			}
			render();
			return true;
		}
		if (n.zone === 'top') {
			switch (key) {
				case 'left': n.topIndex = clamp(n.topIndex - 1, 0, tops.length - 1); break;
				case 'right': n.topIndex = clamp(n.topIndex + 1, 0, tops.length - 1); break;
				case 'down': case 'back': n.zone = 'rows'; break;
			}
			render();
			return true;
		}

		const rowIndex = clamp(n.rowIndex, 0, allRows.length - 1);
		const row = allRows[rowIndex];
		if (!row) return false;
		// like tvOS, moving to another row keeps the same column (as far as that row reaches)
		const moveRow = (next: number) => {
			const target = allRows[next];
			if (!target) return;
			n.columns[target.id] = clamp(columnOf(row), 0, target.items.length - 1);
			n.rowIndex = next;
   n.scrollIndex = next;
		};
		if (n.moving) {
			if (key === 'left' || key === 'right') { if (edit) edit('move', row.id, n.moving, key === 'left' ? -1 : 1); return true; }
			if (key === 'back') n.moving = null;
			render();
			return true;
		}
		switch (key) {
			case 'up': if (rowIndex === 0) n.zone = 'top'; else moveRow(rowIndex - 1); break;
			case 'down':
				moveRow(Math.min(allRows.length - 1, rowIndex + 1));
				break;
			case 'left': n.columns[row.id] = clamp(columnOf(row) - 1, 0, row.items.length - 1); break;
			case 'right': n.columns[row.id] = clamp(columnOf(row) + 1, 0, row.items.length - 1); break;
			case 'back': n.rowIndex = 0; n.scrollIndex = 0; break;
		}
		render();
		return true;
	}, []);

 const handleKey = useCallback((key: NavKey): boolean => {
  const focusedApp = () => {
   const n = nav.current, allRows = latest.current.rows;
   if(!n.engaged || n.dockHidden || n.moving || n.zone !== 'rows')return null;
   const row = allRows[clamp(n.rowIndex,0,allRows.length - 1)];
   const item = row && row.items[columnOf(row)];
   return item ? row.id + '/' + item.key : null;
  };
  const before = focusedApp(), handled = navigate(key), after = focusedApp();
  if((key === 'left' || key === 'right' || key === 'up' || key === 'down') && before && after && before !== after)playNavigationTick();
  return handled;
 },[navigate]);
 useKeys(handleKey, active);

	const n = nav.current;
	const rowIndex = clamp(n.rowIndex, 0, Math.max(0, rows.length - 1));
 const scrollIndex = clamp(n.scrollIndex, 0, Math.max(0, rows.length - 1));
	const overlay = n.zone === 'menu' || n.zone === 'ctx' || n.zone === 'folder';
	const topPointer = (i: number) => () => { if (!overlay) { n.mode = 'pointer'; n.engaged = true; n.zone = 'top'; n.topIndex = i; render(); } };
 useEffect(() => {
  if (n.zone !== 'folder') return;
  const grid=document.querySelector('.panel__grid') as HTMLElement | null;
  const tile=grid && grid.querySelector('.tile--focused') as HTMLElement | null;
  if(!grid||!tile)return;const a=grid.getBoundingClientRect(),b=tile.getBoundingClientRect();
  if(b.bottom>a.bottom-20)grid.scrollTop+=b.bottom-a.bottom+20;
  else if(b.top<a.top+20)grid.scrollTop-=a.top-b.top+20;
 });
	const focusedTop = (i: number) => n.engaged && n.zone === 'top' && i === n.topIndex;
	return (
		<div class={`screen trial-home${scrollIndex >= 1 ? ' screen--lower' : ''}${n.moving ? ' screen--moving' : ''}${n.dockHidden ? ' screen--dockhidden' : ''}`}>
			<Status weatherText={weatherText} showPeriod={showPeriod} />
			<VideoCaption />
			<div class="dockhint" onClick={() => { n.dockHidden = false; render(); }}><svg viewBox="0 0 48 28" aria-hidden="true"><path d="M6 22 24 6l18 16" /></svg></div>
			<div class="topbar">
				{topItems.map((item, i) => item.key === MENU_KEY ? (
					<div
						key={item.key}
						class={`topcap${focusedTop(i) ? ' topcap--focused' : ''}${n.zone === 'menu' ? ' topcap--open' : ''}`}
						onMouseLeave={pointerLeft}
						onMouseEnter={topPointer(i)}
						onClick={() => { n.topIndex = i; activateTop(i); }}
					>
						<Clock showPeriod={showPeriod} />
						<span class="pill__label">{tr(item.label)}</span>
					</div>
				) : (
					<div
						key={item.key}
						class={`pill${focusedTop(i) ? ' pill--focused' : ''}`}
						onMouseLeave={pointerLeft}
						onMouseEnter={topPointer(i)}
						onClick={() => { n.topIndex = i; activateTop(i); }}
					>
						{item.glyph && <Glyph name={item.glyph} />}
						<span class="pill__label">{tr(item.label)}</span>
					</div>
				))}
			</div>

   <div class={`rows trial-rows${n.dockHidden ? ' rows--hidden' : ''}`}
    style={{transform: `translateY(-${scrollIndex > 0 ? 728 + scrollIndex * 286 - 388 : 0}px)`}}
    onMouseDown={() => { n.mode = 'pointer'; holdStart(); }} onMouseUp={holdCancel} onMouseLeave={holdCancel}>
    {rows.map((row, i) => <section key={row.id} class={`trial-row${i === 0 ? ' trial-row--favorites' : ''}${i === 1 && scrollIndex === 0 ? ' trial-row--peek' : ''}`}
      style={{visibility: i > 1 && scrollIndex === 0 ? 'hidden' : 'visible'}}>
     {row.id === 'recent' && <h2 class="trial-row-title">{tr('Recent')}</h2>}
     {row.items.map((item, col) => <Tile key={item.key} model={item}
       focused={n.engaged && n.zone === 'rows' && i === rowIndex && col === columnOf(row)}
       lifted={n.moving === item.key}
       onHover={() => { if (overlay) return; n.mode = 'pointer'; n.engaged = true; n.zone = 'rows'; n.rowIndex = i; n.columns[row.id] = col; render(); }}
       onActivate={() => { holdCancel(); if (n.suppressClick) { n.suppressClick = false; return; } n.engaged = true; n.zone = 'rows'; n.rowIndex = i; n.columns[row.id] = col; render(); activateRowItem(row.id, item); }} />)}
     {!row.items.length && <div class="row__empty">{row.emptyText && tr(row.emptyText)}</div>}
    </section>)}
   </div>
			{n.moving && <div class="movehint">{tr('Move with the arrows · OK to drop')}</div>}
			{n.zone === 'folder' && (
				<>
					<div class="panel-backdrop" onClick={() => { n.zone = 'rows'; render(); }} />
					<div class="panel panel--folder">
						<div class="panel__title">{n.folder}</div>
						<div class="panel__grid" onMouseDown={holdStart} onMouseUp={holdCancel} onMouseLeave={holdCancel}>
							{((folders || {})[n.folder] || []).map((item, i) => (
								<Tile
									key={item.key}
									model={item}
									focused={i === n.folderIndex}
									onHover={() => { n.folderIndex = i; render(); }}
									onActivate={() => { holdCancel(); if (n.suppressClick) { n.suppressClick = false; return; } n.zone = 'rows'; render(); latest.current.onActivate('folder', item); }}
								/>
							))}
						</div>
					</div>
				</>
			)}
			{n.zone === 'ctx' && (
				<>
					<div class="panel-backdrop" onClick={() => { n.zone = n.ctxFrom; render(); }} />
					<div class="panel panel--menu panel--ctx">
						{(n.ctxFrom === 'folder' ? CTX_FOLDER_ITEMS : CTX_ITEMS).map((label, i) => (
							<div
								key={label}
								class={`menu__row${i === n.ctxIndex ? ' menu__row--focused' : ''}`}
								onMouseEnter={() => { n.ctxIndex = i; render(); }}
								onClick={() => activateCtx(i)}
							>
								<span>{tr(label)}</span>
							</div>
						))}
					</div>
				</>
			)}
			{n.zone === 'menu' && (
				<>
					<div class="panel-backdrop" onClick={() => { n.zone = 'top'; render(); }} />
					<div class="panel panel--menu">
						{menuItems.map((item, i) => (
							<div
								key={item.key}
								class={`menu__row${i === n.menuIndex ? ' menu__row--focused' : ''}`}
								onMouseEnter={() => { n.menuIndex = i; render(); }}
								onClick={() => activateMenu(i)}
							>
								{item.glyph && <Glyph name={item.glyph} />}
								<span>{tr(item.label)}</span>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}
