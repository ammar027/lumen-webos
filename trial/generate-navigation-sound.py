#!/usr/bin/env python3
"""Rebuild the original quiet click and silent native-capability probe (no samples)."""
from pathlib import Path
import math
import struct

output = Path(__file__).resolve().parent / 'overlay/public/sounds'
output.mkdir(parents=True, exist_ok=True)
rate, duration = 48000, .026
random, low, samples = 7321, 0, []
for i in range(math.ceil(rate * duration)):
    random = (1664525 * random + 1013904223) & 0xffffffff
    low += .32 * (random / 2147483648 - 1 - low)
    t = i / rate
    envelope = min(1, t / .0008) * math.exp(-t / .0045) * min(1, (duration - t) / .005)
    samples.append(low * envelope)
peak = max(abs(n) for n in samples)
(output / 'navigation-click.pcm').write_bytes(b''.join(
    struct.pack('<h', round(n * .0252 / peak * 32767)) for n in samples))
(output / 'navigation-ready.pcm').write_bytes(bytes(96))
