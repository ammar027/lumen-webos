#!/usr/bin/env python3
"""Prepare the optional trial without modifying an existing app checkout."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

from assets import generate_assets

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = 'https://github.com/partridgeworks/webos-launcher.git'
REVISION = '1e2c39b9a988ceb1b258e40e3592bda84a2aa076'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app-dir', type=Path, default=ROOT / 'app')
    args = parser.parse_args()
    target = args.app_dir.resolve()
    if target.exists():
        parser.error(f'{target} already exists; choose a new --app-dir. Nothing was overwritten.')
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['git', 'clone', '--no-checkout', UPSTREAM, str(target)], check=True)
    subprocess.run(['git', '-C', str(target), 'checkout', '--detach', REVISION], check=True)
    shutil.copytree(ROOT / 'trial/overlay', target, dirs_exist_ok=True)
    for name in ['icon.png', 'largeIcon.png', 'splash.png']:
        shutil.copy2(ROOT / 'app-assets/public' / name, target / 'public' / name)
    shutil.copy2(ROOT / 'app-assets/geist-wght.woff2', target / 'src/assets/geist-wght.woff2')
    generate_assets(target)
    (target / '.lumen-trial-source.json').write_text(json.dumps({
        'upstream': UPSTREAM, 'revision': REVISION, 'trialVersion': '0.3.5'
    }, indent=2) + '\n')
    print(f'Trial prepared at {target}. Next: npm --prefix "{target}" ci')


if __name__ == '__main__':
    main()
