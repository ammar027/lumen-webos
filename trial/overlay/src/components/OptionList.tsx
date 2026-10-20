import {t as tr} from '../lib/i18n';
import {useEffect, useRef} from 'preact/hooks';

export interface OptionItem {
	id: string;
	label: string;
	description: string;
	value: boolean;
	/** shown instead of the switch (options that pick from a list) */
	valueText?: string;
}

interface Props {
	options: OptionItem[];
	focused: boolean;
	selected: number;
	onSelect: (index: number) => void;
	onActivate: (index: number) => void;
}

/** Vertical list of options in a fixed-height window that scrolls to keep the selected one in view (the list is longer than the screen). */
export function OptionList ({options, focused, selected, onSelect, onActivate}: Props) {
	const view = useRef<HTMLDivElement>(null);
	const track = useRef<HTMLDivElement>(null);
	const bar = useRef<HTMLDivElement>(null);
	const thumb = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const v = view.current;
		const t = track.current;
		if (!v || !t) return;
		const el = t.children[selected] as HTMLElement | undefined;
		if (!el) return;
		const offset = Math.max(0, Math.min(el.offsetTop - (v.clientHeight - el.offsetHeight) / 2, t.scrollHeight - v.clientHeight));
		t.style.transform = `translateY(${-offset}px)`;
		// scroll indicator: size and place the thumb from the visible share of the list
		const b = bar.current;
		const th = thumb.current;
		if (!b || !th) return;
		const max = t.scrollHeight - v.clientHeight;
		b.style.visibility = max > 4 ? 'visible' : 'hidden';
		const h = Math.max(48, (v.clientHeight / t.scrollHeight) * b.clientHeight);
		th.style.height = `${h}px`;
		th.style.transform = `translateY(${max > 0 ? (offset / max) * (b.clientHeight - h) : 0}px)`;
	}, [selected, options.length]);

	return (
		<div class="options-wrap">
			<div class="options__bar" ref={bar}><div class="options__thumb" ref={thumb} /></div>
		<div class="options" ref={view}>
			<div class="options__track" ref={track}>
				{options.map((o, i) => (
					<div
						key={o.id}
						class={`option${focused && i === selected ? ' option--focused' : ''}`}
						onMouseEnter={() => onSelect(i)}
						onClick={() => onActivate(i)}
					>
						<div class="option__text">
							<div class="option__label">{tr(o.label)}</div>
							<div class="option__description">{o.description}</div>
						</div>
						{o.valueText !== undefined
							? <div class="option__value">{tr(o.valueText)}</div>
							: <div class={`switch${o.value ? ' switch--on' : ''}`} role="switch" aria-checked={o.value}>
								<div class="switch__knob" />
							</div>}
					</div>
				))}
			</div>
		</div>
		</div>
	);
}
