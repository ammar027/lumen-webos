#!/usr/bin/env python3
"""Rebuild the original generic cue. Local custom audio is never published here."""
from pathlib import Path
import math
import struct

output = Path(__file__).resolve().parent / 'overlay/public/sounds'
output.mkdir(parents=True, exist_ok=True)
rate, duration = 48000, .180
random, low, samples = 7321, 0, []
for i in range(math.ceil(rate * duration)):
    random = (1664525 * random + 1013904223) & 0xffffffff
    low += .2 * (random / 2147483648 - 1 - low)
    t = i / rate
    envelope = math.sin(math.pi * min(1, t / .110)) ** 2
    # A rounded, gently falling body, with a little texture instead of a sharp tick.
    phase = 2 * math.pi * (410 * t - 180 * t * t)
    samples.append(envelope * (.82 * math.sin(phase) + .1 * math.sin(phase * 1.87) + .08 * low))
peak = max(abs(n) for n in samples)
(output / 'navigation-focus-v1.pcm').write_bytes(b''.join(
    struct.pack('<h', round(n * .0252 / peak * 32767)) for n in samples))
(output / 'navigation-ready.pcm').write_bytes(bytes(96))
