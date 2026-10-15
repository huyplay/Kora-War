# Card audio

Three original deterministic synthesized mobile UI cues; no external recordings or samples. Regenerate with `npx tsx tools/generate-card-audio.ts`. Mono PCM 16-bit, 22.05 kHz, 120–300 ms, total under 32 KiB. Manifest records recipe, provenance, byte size and SHA-256.

Runtime bindings live in SQLite `audio.cues` (`card-draw`, `card-wait`, `card-ready`). Run `npx tsx tools/apply-card-audio.ts --apply` to back up the database and add missing bindings. Existing admin choices and historical revisions remain unchanged. The sound service applies master/UI gain, voice limits and cooldown, with a synthesized fallback when offline.
