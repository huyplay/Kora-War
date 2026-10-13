"""Offline integrity checks; not a verification of external claims or gameplay parity."""
from pathlib import Path
from urllib.parse import unquote
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs'
errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

def read(name):
    return json.loads((DOC / 'data' / name).read_text(encoding='utf-8'))

sources = read('source-registry.json')
source_ids = {s['id'] for s in sources}
features = read('feature-inventory.json')
feature_ids = {f['id'] for f in features}
require(len(source_ids) == len(sources), 'Duplicate source IDs')
require(len(feature_ids) == len(features), 'Duplicate feature IDs')
require(len(features) == 95, 'Expected 95 historical research inventory rows')
for f in features:
    require(set(f['source_ids']) <= source_ids, f"Unknown source in {f['id']}")
catalog = read('card-catalog.json')
for card in catalog['cards']:
    require(set(card['source_ids']) <= source_ids, f"Unknown source in {card['id']}")
    for field in ['category', 'rarity', 'cost', 'hp', 'damage', 'attack_speed', 'movement_speed', 'attack_range', 'target_types', 'special_abilities', 'level_scaling', 'animation', 'effects']:
        require(field in card, f"Missing {field} in {card['id']}")
        if card.get(field) is None:
            require(bool(card['null_reasons'].get(field)), f"Null without reason: {card['id']}.{field}")
require(len({c['id'] for c in catalog['cards']}) == len(catalog['cards']), 'Duplicate card IDs')
parity = read('parity-matrix.json')
require({p['feature_id'] for p in parity} == feature_ids, 'Parity matrix does not cover inventory')
for p in DOC.rglob('*.md'):
    body = p.read_text(encoding='utf-8')
    require(body.count('```') % 2 == 0, f'Unclosed code fence: {p.name}')
    for target in re.findall(r'\]\(([^)]+)\)', body):
        target = target.split('#')[0].strip('<>')
        if not target or re.match(r'^[a-z]+:', target, re.I):
            continue
        require((p.parent / unquote(target)).exists(), f'Broken local link: {p.relative_to(ROOT)} -> {target}')
for case in read('test-cases.json')['documented_battle']:
    require(case['source_id'] in source_ids, f"Unknown source: {case['id']}")
    require(set(case['features']) <= feature_ids, f"Unknown feature: {case['id']}")
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print(f'PASS: {len(list(DOC.rglob("*.md")))} Markdown files, {len(sources)} source IDs, {len(features)} historical features, {len(catalog["cards"])} candidate cards; internal links and null provenance checked.')
