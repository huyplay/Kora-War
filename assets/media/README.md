# Curated audio, textures and effects

`python tools/download-media.py` caches selected Kenney / JaggedStone SFX and a Poly Haven diffuse texture under `.data/source-assets/media`. Sources, licenses and SHA-256 are recorded. Only selected files are downloaded; game clients load locally hosted assets by ID.

`python tools/download-polyhaven-prop.py` packages the official Poly Haven Moon Rock 02 glTF and its 1K textures into a self-contained GLB (3,304 triangles, approximately 1.45 MiB). The importer adds two decorative edge props once; their transforms remain editable in Studio. Props do not participate in simulation collisions.

Save the official GegX sampler ZIP as `.data/source-assets/media/gegx-sampler.zip`, then run `python tools/prepare-gegx-vfx.py`. It checks and extracts six 1024×128 PNG sheets from the manifest, records SHA-256/license/fps in `gegx-report.json`, and keeps binaries outside Git. The importer fills missing event bindings for spawn/skill/heal/death/pulse, preserving custom event choices. Studio can select an atlas, columns, rows and animation FPS for each event. Invalid sheet divisions are rejected on publication; failed loads retain the global/procedural fallback.

`npx tsx tools/import-media-assets.ts --apply` imports verified files and fills **missing** audio/stone bindings, then publishes a revision. Existing custom bindings are retained. Without `--apply`, it only imports into the library. Back up the database before any publish.

- [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio): CC0.
- [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds): CC0.
- [JaggedStone Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx): CC0.
- [Poly Haven Medieval Blocks 03](https://polyhaven.com/a/medieval_blocks_03): CC0, diffuse 1K. No displacement mesh is generated.
- [GegX Free Spell VFX Sampler](https://gegx.itch.io/free-spell-vfx-sampler): permits use/modification in games; do not redistribute a standalone asset pack. Six sheets are imported locally; source files remain outside Git. Upload additional horizontal PNG sheets via Studio (8 columns, 1 row).
- [Sonniss GDC](https://gdc.sonniss.com/): use selected clips under its bundle license, not CC0. Do not distribute a standalone SFX library. The multi-GB source bundle is not a runtime dependency.

The current renderer supports GLB props, diffuse terrain textures, transparent sprite atlases and short WAV/Ogg audio. Unity materials, particle prefabs and shader graphs require conversion; they are not browser-readable assets. WAV offers a fallback when a mobile browser cannot decode Ogg. Runtime audio falls back to synthesized tones when an asset fails.

## Arena PBR and spell presentation — 14 October 2026

Run `python tools/download-arena-media.py` for the six selected 1K JPG color/normal/roughness maps (2.63 MiB combined). Each download is checked against the official Poly Haven MD5 and recorded with SHA-256 in `arena-texture-report.json`.

Run `python tools/download-polyhaven-prop.py --asset moon_rock_01 --report assets/media/arena-prop-report.json` for the additional edge rock: 18,668 triangles and 1,704,936 bytes. The original Moon Rock 02 default remains available. The higher-poly Boulder 01 was rejected by the importer's existing mobile budget.

With these files and the prepared GegX sheets present, `npx tsx tools/apply-arena-media.ts` backs up the SQLite database, imports/reuses assets by checksum, applies the approved arena/spell/audio bindings and publishes a revision. It preserves unrelated draft changes. This script intentionally changes visual/audio settings; it does not merely fill missing bindings. Follow with `npm run assets:sync` and `npm run assets:verify` when using the asset service.

- [Cobblestone Floor 02](https://polyhaven.com/a/cobblestone_floor_02), [Castle Brick 02 White](https://polyhaven.com/a/castle_brick_02_white), [Moon Rock 01](https://polyhaven.com/a/moon_rock_01): CC0 via the official API.
- Studio supports normal/roughness channels for stone/wall and separate spell atlases. Every channel participates in reference/archive validation. Spell and event sheets are validated before publication.
- Rendering uses mipmaps/anisotropic filtering on tiled terrain and bounded camera zoom. GegX 128px frames use linear sampling without atlas mip bleed. Asset binaries stay in local managed storage, not this repository.
