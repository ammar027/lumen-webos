"""Generate local text cards and abstract fallbacks; no third-party artwork."""
from html import escape
from pathlib import Path

CARDS = [
    ('youtube', 'YouTube', '#424b59', '#18212c'),
    ('disney', 'Disney+', '#10353f', '#071d29'),
    ('appletv', 'Apple TV', '#24272c', '#060708'),
    ('music', 'Apple Music', '#874d67', '#351e3a'),
    ('prime', 'Prime Video', '#23698a', '#123349'),
    ('hulu', 'Hulu', '#244638', '#101e1b'),
    ('jellyfin', 'Jellyfin', '#343b70', '#161b35'),
    ('max', 'HBO Max', '#283b65', '#111a30'),
    ('peacock', 'Peacock', '#424955', '#171c24'),
    ('netflix', 'Netflix', '#65313d', '#261720'),
    ('tubi', 'Tubi', '#594276', '#261e36'),
    ('plex', 'Plex', '#68573a', '#2b261d'),
    ('browser', 'Browser', '#285a7e', '#102337'),
    ('homebrew', 'Homebrew', '#643b60', '#291d35'),
]
COLORS = [('#234d81', '#071020'), ('#25644b', '#091b20'), ('#603e87', '#160c25'),
          ('#8a4e30', '#271417'), ('#46505d', '#10141c')]


def gradient(top, bottom):
    return f'<defs><linearGradient id="g" x2=".2" y2="1"><stop stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient></defs>'


def generate_assets(target: Path):
    cards = target / 'public/iconpack'
    wallpapers = target / 'public/wallpapers'
    cards.mkdir(parents=True, exist_ok=True)
    wallpapers.mkdir(parents=True, exist_ok=True)
    for name, title, top, bottom in CARDS:
        content = f'<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">{gradient(top,bottom)}<path fill="url(#g)" d="M0 0h960v540H0z"/><text x="480" y="288" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="72" font-weight="600">{escape(title)}</text></svg>'
        (cards / f'{name}.svg').write_text(content + '\n')
    for i, (top, bottom) in enumerate(COLORS):
        content = f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">{gradient(top,bottom)}<path fill="url(#g)" d="M0 0h1920v1080H0z"/><ellipse cx="400" cy="200" rx="800" ry="600" fill="white" opacity=".06"/></svg>'
        (wallpapers / f'default-{i}.svg').write_text(content + '\n')
