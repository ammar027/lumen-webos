import {useLayoutEffect, useRef, useState} from 'preact/hooks';
import {LAYOUT} from '../theme/tokens';
import {clamp} from '../hooks/useKeys';
import {Tile, type TileModel} from './Tile';

interface Props {
	items: TileModel[];
	/** select: tick badges on chosen items, others dimmed. reorder: plain tiles. */
	mode: 'select' | 'reorder';
	checkedKeys: string[];
	/** index of the tile picked up in re-order mode, or -1 */
	liftedIndex: number;
	focused: boolean;
	selected: number;
	onSelect: (index: number) => void;
	onActivate: (index: number) => void;
}

const VIEWPORT_HEIGHT = 720;          // matches .grid__viewport height in global.css
const LABEL_HEIGHT = 66;              // two-line tile label + its top margin (see .tile__label)
const GRID_ROW_GAP = 36;              // matches .grid__track grid-row-gap
const ROW_STEP = LAYOUT.tileHeight + LABEL_HEIGHT + GRID_ROW_GAP;

/** Full grid of tiles; scrolls vertically to keep the focused row in view. */
export function Grid ({items, mode, checkedKeys, liftedIndex, focused, selected, onSelect, onActivate}: Props) {
 const view=useRef<HTMLDivElement>(null);const [height,setHeight]=useState(VIEWPORT_HEIGHT);
 useLayoutEffect(()=>{if(view.current)setHeight(view.current.clientHeight-40);},[items.length]);
	const rows = Math.ceil(items.length / LAYOUT.gridColumns);
	const total = rows * ROW_STEP - GRID_ROW_GAP;
	const rowIndex = Math.floor(selected / LAYOUT.gridColumns);
	const offset = total <= height ? 0
		: clamp(rowIndex * ROW_STEP - (height - ROW_STEP) / 2, 0, total - height);

	return (
		<div class="grid__viewport" ref={view}>
			<div class="grid__track" style={{transform: `translateY(${-offset}px)`}}>
				{items.map((item, i) => {
					const checked = mode === 'select' && checkedKeys.indexOf(item.key) !== -1;
					return (
						<Tile
							key={item.key}
							model={item}
							focused={focused && i === selected}
							lifted={i === liftedIndex}
							checked={checked}
							dimmed={mode === 'select' && !checked}
							onHover={() => onSelect(i)}
							onActivate={() => onActivate(i)}
						/>
					);
				})}
			</div>
		</div>
	);
}
