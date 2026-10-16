import type { ModelBinding } from '../src/data/content';

/** Normalize exporter prefixes/extensions without changing the original clip names. */
export function selectAnimationClips(names: string[]): ModelBinding['clips'] {
  const find = (...patterns: RegExp[]) =>
    patterns.map((pattern) => names.find((name) => pattern.test(name))).find(Boolean);
  const idle = find(
    /^(?:idle1(?:_base)?|idle_base|idle_01_loop)(?:\.anm)?$/i,
    /^[a-z]+_idle1(?:_base)?(?:\.anm)?$/i,
    /(?:^|_)idle(?:_|\d|$)/i,
  );
  return Object.fromEntries(
    Object.entries({
      idle,
      walk: find(
        /^(?:run|run_base)(?:\.anm)?$/i,
        /^[a-z]+_run(?:\.anm)?$/i,
        /^(?:walk|walk_base)(?:\.anm)?$/i,
        /(?:^|_)(?:run|walk)(?:_|\.|$)/i,
      ),
      attack: find(/(?:^|_)attack1(?:_base)?(?:\.anm)?$/i, /(?:^|_)attack/i),
      cast: find(/(?:^|_)spell1(?:_base)?(?:\.anm)?$/i, /(?:^|_)spell/i),
      stunned: find(/stun/i) || idle,
      spawn: find(/respawn/i) || idle,
      death: find(/(?:^|_)death/i),
    }).filter(([, name]) => !!name),
  );
}
