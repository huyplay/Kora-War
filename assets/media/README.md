# Curated audio, textures and effects

`python tools/download-media.py` caches selected Kenney / JaggedStone SFX and a Poly Haven diffuse texture under `.data/source-assets/media`. Sources, licenses and SHA-256 are recorded. Only selected files are downloaded; game clients load locally hosted assets by ID.

`python tools/download-polyhaven-prop.py` packages the official Poly Haven Moon Rock 02 glTF and its 1K textures into a self-contained GLB (3,304 triangles, approximately 1.45 MiB). The importer adds two decorative edge props once; their transforms remain editable in Studio. Props do not participate in simulation collisions.

`npx tsx tools/import-media-assets.ts --apply` imports verified files and fills **missing** audio/stone bindings, then publishes a revision. Existing custom bindings are retained. Without `--apply`, it only imports into the library. Back up the database before any publish.

- [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio): CC0.
- [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds): CC0.
- [JaggedStone Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx): CC0.
- [Poly Haven Medieval Blocks 03](https://polyhaven.com/a/medieval_blocks_03): CC0, diffuse 1K. No displacement mesh is generated.
- [GegX Free Spell VFX Sampler](https://gegx.itch.io/free-spell-vfx-sampler): permits use/modification in games; do not redistribute a standalone asset pack. Upload its horizontal PNG sheets via Studio (8 columns, 1 row). Keep source files outside Git.
- [Sonniss GDC](https://gdc.sonniss.com/): use selected clips under its bundle license, not CC0. Do not distribute a standalone SFX library. The multi-GB source bundle is not a runtime dependency.

The current renderer supports GLB props, diffuse terrain textures, transparent sprite atlases and short WAV/Ogg audio. Unity materials, particle prefabs and shader graphs require conversion; they are not browser-readable assets. WAV offers a fallback when a mobile browser cannot decode Ogg. Runtime audio falls back to synthesized tones when an asset fails.
