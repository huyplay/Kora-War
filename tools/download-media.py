"""Curated public asset acquisition. Cache sources; never fetch huge libraries at game runtime."""
from urllib.request import urlopen, Request
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import json, hashlib, re

root = Path('.data/source-assets/media')
root.mkdir(parents=True, exist_ok=True)
report = []

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'KoraWarAssetImporter/1.0'}), timeout=60) as response:
        return response.read()

def save(name, data, source, author, license):
    (root / name).write_bytes(data)
    report.append(dict(file=name, sourceUrl=source, author=author, license=license,
                       sha256=hashlib.sha256(data).hexdigest(), bytes=len(data)))

packs = [
    ('rpg', 'https://kenney.nl/assets/rpg-audio',
     'https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip',
     ['knifeSlice.ogg', 'metalPot1.ogg', 'footstep00.ogg', 'drawKnife1.ogg', 'doorClose_1.ogg']),
    ('interface', 'https://kenney.nl/assets/interface-sounds',
     'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip',
     ['click_001.ogg', 'confirmation_001.ogg', 'error_001.ogg']),
]
for pack, source, url, selected in packs:
    old = Path('.data/source-assets/audio') / (pack + '.zip')
    archive = ZipFile(BytesIO(old.read_bytes() if old.exists() else fetch(url)))
    for name in selected:
        save(pack + '-' + name, archive.read('Audio/' + name), source, 'Kenney', 'CC0-1.0')
    save(pack + '-LICENSE.txt', archive.read('License.txt'), source, 'Kenney', 'CC0-1.0')

source = 'https://opengameart.org/content/magic-spell-sfx'
html = fetch(source).decode()
links = re.findall(r'href="([^"]+magical_[123]\.ogg)"', html)
for url in dict.fromkeys(links):
    save(url.rsplit('/', 1)[-1], fetch(url), source, 'JaggedStone', 'CC0-1.0')

# The official public API permits curated acquisition; send an identifying User-Agent.
asset = 'medieval_blocks_03'
files = json.loads(fetch('https://api.polyhaven.com/files/' + asset))
print('Poly Haven file keys:', list(files))
(root / 'polyhaven-files.json').write_text(json.dumps(files), encoding='utf-8')
diff = files.get('diff', files.get('Diffuse', {}))['1k']['jpg']['url']
save('castle-brick-diffuse.jpg', fetch(diff), 'https://polyhaven.com/a/' + asset, 'Poly Haven', 'CC0-1.0')

(root / 'download-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'Cached {len(report)} curated files ({sum(a["bytes"] for a in report)/1048576:.2f} MiB).')
