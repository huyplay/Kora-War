"""Acquire a small, original CC0 Poly Haven rock as a self-contained GLB.

Run from the repository root with Python 3 and Pillow:
    python tools/download-polyhaven-prop.py

Source geometry, UVs and PBR materials are preserved. Only texture dimensions
above 1024 are reduced. The API's original MD5 and our SHA-256 are recorded.
No model binary is committed: all downloads live in the ignored .data cache.
"""

import copy
import hashlib
import io
import json
import struct
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".data/source-assets/media"
REPORT = ROOT / "assets/media/polyhaven-prop-report.json"
ASSET = "moon_rock_02"
USER_AGENT = "KoraWarAssetImporter/1.0"
MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_GLB_BYTES = 30 * 1024 * 1024
MAX_TRIANGLES = 20000


def fetch(url):
    if urlparse(url).scheme != "https" or urlparse(url).hostname not in {
        "api.polyhaven.com", "dl.polyhaven.org"
    }:
        raise ValueError(f"Unexpected source URL: {url}")
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=40) as response:
        data = response.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise ValueError("Source exceeds the bounded download budget")
    return data


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def source_file(descriptor, local_name):
    """A cache is reused only when it matches the official file checksum."""
    path = CACHE / "polyhaven" / ASSET / local_name
    if path.exists():
        data = path.read_bytes()
    else:
        data = fetch(descriptor["url"])
    expected_md5 = descriptor["md5"]
    if hashlib.md5(data).hexdigest() != expected_md5:
        raise ValueError(f"Official checksum mismatch: {local_name}")
    if len(data) != descriptor["size"]:
        raise ValueError(f"Official size mismatch: {local_name}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return data, {
        "file": local_name,
        "sourceUrl": descriptor["url"],
        "bytes": len(data),
        "md5": expected_md5,
        "sha256": sha256(data),
    }


def build_glb(document, payloads):
    document = copy.deepcopy(document)
    binary = bytearray()
    original_buffers = []

    def append(data):
        while len(binary) % 4:
            binary.append(0)
        offset = len(binary)
        binary.extend(data)
        return offset

    for buffer in document["buffers"]:
        data = payloads[buffer["uri"]]
        if len(data) < buffer["byteLength"]:
            raise ValueError("Truncated source geometry buffer")
        original_buffers.append((append(data), len(data)))

    for view in document.get("bufferViews", []):
        offset, size = original_buffers[view["buffer"]]
        if view.get("byteOffset", 0) + view["byteLength"] > size:
            raise ValueError("Source buffer view exceeds its geometry buffer")
        view["byteOffset"] = offset + view.get("byteOffset", 0)
        view["buffer"] = 0

    textures = []
    for image in document.get("images", []):
        uri = image.pop("uri")
        data = payloads[uri]
        with Image.open(io.BytesIO(data)) as bitmap:
            original_size = bitmap.size
            if max(bitmap.size) > 1024:
                bitmap.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                compressed = io.BytesIO()
                bitmap.convert("RGB").save(compressed, format="JPEG", quality=90)
                data = compressed.getvalue()
                image["mimeType"] = "image/jpeg"
            width, height = bitmap.size
        offset = append(data)
        image["bufferView"] = len(document["bufferViews"])
        document["bufferViews"].append({"buffer": 0, "byteOffset": offset, "byteLength": len(data)})
        textures.append({"file": uri, "sourceDimensions": list(original_size),
                         "dimensions": [width, height], "runtimeSha256": sha256(data)})

    triangles = 0
    for mesh in document.get("meshes", []):
        for primitive in mesh["primitives"]:
            if primitive.get("mode", 4) != 4:
                raise ValueError("Only triangle primitives are supported by this curated importer")
            accessor = primitive.get("indices", primitive["attributes"]["POSITION"])
            count = document["accessors"][accessor]["count"]
            if count % 3:
                raise ValueError("Triangle accessor count is not divisible by three")
            triangles += count // 3
    if not 0 < triangles <= MAX_TRIANGLES:
        raise ValueError(f"Model exceeds the mobile prop triangle budget: {triangles}")

    document["buffers"] = [{"byteLength": len(binary)}]
    json_chunk = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_chunk += b" " * (-len(json_chunk) % 4)
    binary.extend(b"\0" * (-len(binary) % 4))
    total = 12 + 8 + len(json_chunk) + 8 + len(binary)
    if total > MAX_GLB_BYTES:
        raise ValueError("Result exceeds the dashboard GLB upload budget")
    glb = (struct.pack("<III", 0x46546C67, 2, total)
           + struct.pack("<II", len(json_chunk), 0x4E4F534A) + json_chunk
           + struct.pack("<II", len(binary), 0x004E4942) + binary)
    return glb, triangles, textures


def main():
    files = json.loads(fetch(f"https://api.polyhaven.com/files/{ASSET}"))
    info = json.loads(fetch(f"https://api.polyhaven.com/info/{ASSET}"))
    # The official glTF branch currently contains resolution variants, not LOD
    # variants. Moon Rock 02's published glTF is already below 20k triangles.
    descriptor = files["gltf"]["1k"]["gltf"]
    source_json, main_source = source_file(descriptor, f"{ASSET}_1k.gltf")
    document = json.loads(source_json)
    sources = [main_source]
    payloads = {}
    dependencies = {b["uri"] for b in document.get("buffers", [])}
    dependencies.update(i["uri"] for i in document.get("images", []))
    for uri in sorted(dependencies):
        if uri not in descriptor["include"] or ".." in Path(uri).parts:
            raise ValueError(f"Unlisted external dependency: {uri}")
        payloads[uri], record = source_file(descriptor["include"][uri], uri)
        sources.append(record)
    glb, triangles, textures = build_glb(document, payloads)
    output_file = f"polyhaven-{ASSET.replace('_', '-')}.glb"
    CACHE.mkdir(parents=True, exist_ok=True)
    (CACHE / output_file).write_bytes(glb)
    record = {
        "file": output_file,
        "sha256": sha256(glb),
        "sourceUrl": f"https://polyhaven.com/a/{ASSET}",
        "downloadUrl": descriptor["url"],
        "author": ", ".join(info["authors"]),
        "license": "CC0-1.0",
        "licenseUrl": "https://polyhaven.com/license",
        "name": info["name"],
        "kind": "model",
        "bytes": len(glb),
        "triangles": triangles,
        "resolution": "1k",
        "lod": "Official glTF; API exposes no separate glTF LOD variant",
        "geometryModified": False,
        "sources": sources,
        "textures": textures,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps([record], indent=2) + "\n", encoding="utf-8")
    print(f"Cached {output_file}: {len(glb):,} bytes, {triangles:,} triangles, CC0")


if __name__ == "__main__":
    import argparse
    import re
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asset', default=ASSET)
    parser.add_argument('--report', default=str(REPORT))
    args = parser.parse_args()
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', args.asset):
        raise ValueError('Invalid Poly Haven asset ID')
    ASSET = args.asset
    REPORT = Path(args.report)
    main()
