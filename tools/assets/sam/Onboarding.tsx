import {useRef, useState} from 'preact/hooks';
import {ScreenBackdrop} from './ScreenBackdrop';
import {SettingsList, type ListRow, type OptionItem} from './SettingsList';
import {useKeys, clamp, type NavKey} from '../hooks/useKeys';

/** The options asked about, in order: each is a page of its choices, like tvOS setup. */
export const SETUP_STEPS = ['language', 'clock-format', 'dark-mode', 'wp-type', 'photo-saver', 'idle-screensaver', 'text-size'];

interface Props {
	options: OptionItem[];
	onChoose: (optionId: string, index: number) => void;
	onDone: () => void;
}

/** First-run setup. Step 0 welcomes, the next ones each ask one thing, the last one finishes. */
export function Onboarding ({options, onChoose, onDone}: Props) {
	const steps = SETUP_STEPS.map((id) => options.filter((o) => o.id === id)[0]).filter((o) => !!o && !!o.choices);
	const last = steps.length + 1;
	const [step, setStep] = useState(0);
	const [focus, setFocus] = useState(0);
	const now = useRef({step: 0, focus: 0});
	now.current = {step, focus};
	const go = (s: number, f = 0) => { now.current = {step: s, focus: f}; setStep(s); setFocus(f); };
	const opt = step >= 1 && step <= steps.length ? steps[step - 1] : undefined;

	const rows: ListRow[] = step === 0
		? [{key: 'start', label: 'Get started', chevron: true}, {key: 'skip', label: 'Skip setup'}]
		: opt && opt.choices
			? opt.choices.map((c, i): ListRow => ({key: String(i), label: c, ticked: i === opt.choice}))
			: [{key: 'done', label: 'Start using Lumen', chevron: true}];

	const activate = (i: number) => {
		const s = now.current.step;
		if (s === 0) { if (i === 1) onDone(); else go(1); return; }
		if (s === last) { onDone(); return; }
		onChoose(steps[s - 1].id, i);
		go(s + 1, s + 1 <= steps.length ? Math.max(0, steps[s].choice || 0) : 0);
	};
	useKeys((key: NavKey) => {
		const {step: s, focus: f} = now.current;
		if (key === 'back') { if (s > 0) go(s - 1, s - 1 >= 1 ? Math.max(0, steps[s - 2].choice || 0) : 0); return true; }
		if (key === 'up' || key === 'down') { setFocus(clamp(f + (key === 'down' ? 1 : -1), 0, rows.length - 1)); return true; }
		if (key === 'enter') { activate(f); return true; }
		return true;
	});

	return (
		<div class="screen screen--settings">
			<ScreenBackdrop />
			<div class="settings settings--list" key={step}>
				<SettingsList
					title={step === 0 ? 'Welcome to Lumen' : step === last ? 'All set' : opt ? opt.label : ''}
					glyph={step === last ? 'gear' : 'house'}
					description={step === 0 ? 'A few quick questions to set Lumen up. You can change all of it later in Settings.' : step === last ? 'Settings has more. Settings > System > Apple TV defaults resets everything to how tvOS 27 starts.' : opt ? opt.description : ''}
					rows={rows}
					ticks={step >= 1 && step <= steps.length}
					selected={focus}
					onSelect={setFocus}
					onActivate={activate}
				/>
			</div>
		</div>
	);
}
