// Inline SVG line icons used by the Misc row and the settings badge.

export type GlyphName = 'house' | 'gear' | 'inputs' | 'screensaver' | 'sliders' | 'wifi' | 'ethernet' | 'muted' | 'timer' | 'folder' | 'speaker' | 'picture' | 'power' | 'restart' | 'back' | 'gamepad' | 'av';

export function Glyph ({name}: {name: GlyphName}) {
	return (
		<svg class="tile__glyph" viewBox="0 0 24 24" aria-hidden="true">
			{name === 'back'
                ? <path d="m14.5 5-7 7 7 7" />
                : name === 'gamepad'
                ? <path d="M7 6h10c2 0 3 2 3.5 5l1 5c.5 3-2 4-4 1l-1.5-2H8l-1.5 2c-2 3-4.5 2-4-1l1-5C4 8 5 6 7 6ZM7 9v4M5 11h4M16 10h.1M18 12h.1" />
                : name === 'av'
                ? <path d="M4 5h5v8H4zM6.5 13v6M15 5h5v8h-5zM17.5 13v6M4 9h5M15 9h5" />
                : name === 'house'
				? <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8M10 20v-6h4v6" />
				: name === 'wifi'
				? <path d="M2.5 9a14 14 0 0 1 19 0M5.6 12.5a9.5 9.5 0 0 1 12.8 0M8.8 16a5 5 0 0 1 6.4 0M12 19.4h.01" />
				: name === 'ethernet'
				? <path d="M4 6h16v8h-3v3.5h-3V14h-4v3.5H7V14H4zM8 9.2v2.2M12 9.2v2.2M16 9.2v2.2" />
				: name === 'muted'
				? <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5" />
				: name === 'timer'
				? <path d="M12 8v4.5l3 1.8M12 4.5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM9.5 2.5h5" />
				: name === 'speaker'
				? <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
				: name === 'picture'
				? <path d="M3.5 5.5h17v11h-17zM8 20h8M12 16.5V20" />
				: name === 'power'
				? <path d="M12 3.5v8M7 6.5a7.5 7.5 0 1 0 10 0" />
				: name === 'restart'
				? <path d="M19 12a7 7 0 1 1-2.2-5.1M19 4.5V8h-3.5" />
				: name === 'folder'
				? <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
				: name === 'sliders'
				? <path d="M4 7h8M16 7h4M4 17h4M12 17h8M12 4.5v5M8 14.5v5" />
				: name === 'screensaver'
				? <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
				: name === 'inputs'
				? <path d="M3.5 7.5h17v7.2a2 2 0 0 1-2 2h-3.2l-1 2.3H9.7l-1-2.3H5.5a2 2 0 0 1-2-2zM8 10.5v2.4M12 10.5v2.4M16 10.5v2.4" />
				: <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />}
		</svg>
	);
}

export function CheckMark () {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M5 12.5l4.5 4.5L19 7.5" />
		</svg>
	);
}
