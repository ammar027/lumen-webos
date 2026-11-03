import {useLayoutEffect, useRef} from 'preact/hooks';

interface Props {
	text: string;
	active: boolean;
	class?: string;
}

export function ScrollingText ({text, active, class: className = ''}: Props) {
	const viewport = useRef<HTMLSpanElement>(null);
	const content = useRef<HTMLSpanElement>(null);
	useLayoutEffect(() => {
		if (!active || !viewport.current || !content.current) return;
		const box = viewport.current, line = content.current;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let animation: Animation | undefined, distance = -1;
		const update = () => {
			const reduced = motion.matches || document.documentElement.classList.contains('reduce-motion');
			const next = reduced || document.hidden ? 0 : Math.max(0, line.offsetWidth - box.clientWidth);
			if (next === distance) return;
			distance = next;
			if (animation) animation.cancel();
			if (distance <= 1) return;
			const pause = 1200, travel = Math.max(1000, distance / 30 * 1000), duration = 2 * (pause + travel);
			const start = 'translateX(0)', end = `translateX(-${distance}px)`;
			animation = line.animate([
				{transform: start, offset: 0},
				{transform: start, offset: pause / duration},
				{transform: end, offset: (pause + travel) / duration},
				{transform: end, offset: (2 * pause + travel) / duration},
				{transform: start, offset: 1}
			], {duration, iterations: Infinity, easing: 'linear'});
		};
		const size = new ResizeObserver(update);
		size.observe(box); size.observe(line);
		const settings = new MutationObserver(update);
		settings.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
		motion.addListener(update);
		document.addEventListener('visibilitychange', update);
		update();
		return () => {
			if (animation) animation.cancel();
			size.disconnect(); settings.disconnect();
			motion.removeListener(update);
			document.removeEventListener('visibilitychange', update);
		};
	}, [active, text]);
	return <span ref={viewport} class={`scroll-text ${className}`}>{active ? <span ref={content} class="scroll-text__content">{text}</span> : text}</span>;
}
