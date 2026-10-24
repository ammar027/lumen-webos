#!/usr/bin/env python3
"""Fifty-third patch layer: issue #4 (webOS 25): with the second row open, a resting Magic Remote pointer made the page jump back to the first row. Reproduced in headless
Chrome: press Down with the pointer resting where the first row slides to, and 240 ms later the rows bounce back. The browser fires a mouse-enter on whatever slides under a
still pointer. Now a mouse-enter only counts when the pointer's position really changed since the previous mouse event."""
import os
p = os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/screens/Home.tsx')
s = open(p).read()
a = "	const idleTimer = useRef(0);"
assert a in s
s = s.replace(a, """	// false while the browser only reports a mouse-enter because the layout moved under a resting pointer (the position has not changed)
	const realPointer = useRef(true);
	useEffect(() => {
		let lastX = -1, lastY = -1;
		const track = (e: MouseEvent) => { realPointer.current = e.clientX !== lastX || e.clientY !== lastY; lastX = e.clientX; lastY = e.clientY; };
		window.addEventListener('mouseover', track, true);
		window.addEventListener('mousemove', track, true);
		return () => { window.removeEventListener('mouseover', track, true); window.removeEventListener('mousemove', track, true); };
	}, []);

""" + a, 1)
b = "onSelect={(col) => { if (overlay) return;"
assert b in s
s = s.replace(b, "onSelect={(col) => { if (overlay || !realPointer.current) return;", 1)
c = "const topPointer = (i: number) => () => { if (!overlay) {"
assert c in s
s = s.replace(c, "const topPointer = (i: number) => () => { if (!overlay && realPointer.current) {", 1)
open(p, 'w').write(s)
