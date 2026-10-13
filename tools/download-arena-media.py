"""Acquire selected CC0 1K PBR textures for the arena, using the official API."""
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.data/source-assets/media'
REPORT = ROOT / 'assets/media/arena-texture-report.json'

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'KoraWarAssetImporter/1.0'}), timeout=40) as response:
        data = response.read(6 * 1024 * 1024 + 1)
    if len(data) > 6 * 1024 * 1024:
        raise ValueError('Arena asset exceeds download budget')
    return data

def main():
    records = []
    for asset, slot in [('cobblestone_floor_02', 'stone'), ('castle_brick_02_white', 'wall')]:
        files = json.loads(fetch(f'https://api.polyhaven.com/files/{asset}'))
        info = json.loads(fetch(f'https://api.polyhaven.com/info/{asset}'))
        for semantic, variants in [('diffuse', ('diff', 'Diffuse')), ('normal', ('nor_gl',)), ('roughness', ('rough', 'Rough'))]:
            branch = next(files[key] for key in variants if key in files)
            descriptor = branch['1k']['jpg']
            filename = f'arena-{asset}-{semantic}.jpg'
            destination = CACHE / filename
            data = destination.read_bytes() if destination.exists() else fetch(descriptor['url'])
            if len(data) != descriptor['size'] or hashlib.md5(data).hexdigest() != descriptor['md5']:
                raise ValueError(f'Official checksum mismatch: {filename}')
            CACHE.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
            records.append(dict(file=filename, slot=slot, semantic=semantic, sourceUrl=f'https://polyhaven.com/a/{asset}',
                downloadUrl=descriptor['url'], author=', '.join(info['authors']), license='CC0-1.0',
                licenseUrl='https://polyhaven.com/license', md5=descriptor['md5'],
                sha256=hashlib.sha256(data).hexdigest(), bytes=len(data), resolution='1k'))
    REPORT.write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    print(f'Cached {len(records)} arena textures: {sum(record["bytes"] for record in records) / 1048576:.2f} MiB')

if __name__ == '__main__':
    main()
