# Defense warning audio

Two original, deterministic synthesized warnings; no external recordings or samples. Regenerate with `npx tsx tools/generate-defense-audio.ts`. Mono 16-bit PCM / 22.05 kHz, 580–740 ms; combined size below 64 KiB. Manifest contains provenance and SHA-256.

Optional database audio cues: `tower-warning` and `core-warning`. Install with `npx tsx tools/apply-defense-audio.ts --apply`; backup, historical snapshots and existing admin choices are preserved. Volume, rate and warning repeat interval are editable in Content Studio → Audio. Muting master/UI gain silences warnings.
