import {LAYOUT} from '../theme/tokens';
import {clamp} from '../hooks/useKeys';
import {Tile, type TileModel} from './Tile';

interface Props {
	label: string;
	items: TileModel[];
	focused: boolean;
	selected: number;
	emptyText?: string;
	compact?: boolean;
	/** a row revealed only when the remote navigates down to it (tvOS-style) */
	hidden?: boolean;
	/** resting: no tile is focused (nothing lifted or named) until the remote is used */
	rest?: boolean;
	/** the pointer left this row */
	onLeave?: () => void;
	onSelect: (index: number) => void;
	onActivate: (index: number) => void;
}

const VIEWPORT_WIDTH = LAYOUT.screenWidth - 2 * LAYOUT.edgePadding;

/** Horizontal strip of tiles. Centred when it fits; otherwise a carousel that keeps
 *  the selected tile in the middle (clamped at the ends). */
export function Row ({label, items, focused, selected, emptyText, compact, hidden, rest, onLeave, onSelect, onActivate}: Props) {
	const size = compact ? LAYOUT.dockTileSize : LAYOUT.tileSize;
	const gap = compact ? LAYOUT.dockTileGap : LAYOUT.tileGap;
	const STEP = size + gap;
	const total = items.length * STEP - gap;
	const fits = total <= VIEWPORT_WIDTH;
	const offset = fits ? 0 : clamp(selected * STEP + size / 2 - VIEWPORT_WIDTH / 2, 0, total - VIEWPORT_WIDTH);

	return (
		<section class={`row${focused || rest ? ' row--focused' : ''}${compact ? ' row--dock' : ''}${hidden ? ' row--hidden' : ''}`} style={`--row-w:${total}px`} onMouseLeave={onLeave}>
			<h2 class="row__label">{label}</h2>
			<div class="row__viewport">
				{items.length === 0
					? <div class="row__empty">{emptyText || 'Nothing here yet'}</div>
					: <div class={`row__track${fits ? ' row__track--centered' : ''}`} style={{transform: `translateX(${-offset}px)`}}>
						{items.map((item, i) => (
							<Tile
								key={item.key}
								model={item}
								focused={focused && !rest && i === selected}
								onHover={() => onSelect(i)}
								onActivate={() => onActivate(i)}
							/>
						))}
					</div>}
			</div>
		</section>
	);
}
