"""Extract selected runtime sheets from the official sampler, keeping the source pack out of Git."""
from pathlib import Path
from zipfile import ZipFile
import csv
import hashlib
import io
import json
import struct

root = Path('.data/source-assets/media')
archive = root / 'gegx-sampler.zip'
if not archive.exists():
    raise SystemExit('Download the free sampler from https://gegx.itch.io/free-spell-vfx-sampler and save it as .data/source-assets/media/gegx-sampler.zip')
records = []
with ZipFile(archive) as pack:
    prefix = 'free-spell-vfx-sampler/'
    manifest = csv.DictReader(io.StringIO(pack.read(prefix + 'MANIFEST.csv').decode('utf-8-sig')))
    for item in manifest:
        path = item['file']
        if '..' in Path(path).parts or Path(path).is_absolute():
            raise ValueError('Unsafe archive manifest path')
        data = pack.read(prefix + path)
        width, height = struct.unpack('>II', data[16:24])
        if data[:8] != b'\x89PNG\r\n\x1a\n' or (width, height) != (1024, 128):
            raise ValueError('Unexpected sampler sheet dimensions')
        name = 'gegx-' + Path(path).name
        (root / name).write_bytes(data)
        records.append(dict(file=name, sourceUrl='https://gegx.itch.io/free-spell-vfx-sampler',
            author='GegX', license='GegX sampler license: game use and modification permitted; no standalone redistribution',
            sha256=hashlib.sha256(data).hexdigest(), bytes=len(data), columns=8, rows=1, fps=int(item['fps'])))
    (root / 'gegx-LICENSE.txt').write_bytes(pack.read(prefix + 'LICENSE.txt'))
Path('assets/media/gegx-report.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
print(f'Prepared {len(records)} GegX sprite sheets; source files remain in the ignored cache.')
