#!/usr/bin/env python3
"""Fifty-fourth patch layer: issue #5 (a webOS 4.4 TV, Chromium 53): the app showed its logo and then a blank screen. A browser that old does not understand ES modules,
so the app's script never runs and nothing can explain why. A classic `nomodule` script runs only in such browsers (modern ones skip it) and shows a plain message."""
import os
p = os.path.expanduser('~/Developer/webos-launcher-tvos/app/index.html')
s = open(p).read()
a = '<script type="module"'
assert a in s and 'lumen-too-old' not in s
msg = """<script nomodule>
(function () {
  function show () {
    var d = document.createElement('div');
    d.id = 'lumen-too-old';
    d.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;text-align:center;padding-top:360px;font-size:34px;line-height:1.5;';
    d.innerHTML = '<div style="font-size:58px;margin-bottom:28px">Lumen can\\'t run on this TV</div>This TV\\'s web browser is too old for Lumen.<br>It needs a newer webOS (tested on webOS 22 and 25).<br><br>Press the Home button to leave.';
    document.body.appendChild(d);
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
</script>
    """
s = s.replace(a, msg + a, 1)
open(p, 'w').write(s)
