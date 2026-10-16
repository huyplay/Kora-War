import type { GameEvent, Unit } from '../core/types';
export interface CombatAnchor {
  unit: Unit;
  position: { x: number; y: number; z: number };
  scale: number;
}
function matches(hit: GameEvent | undefined, shot: GameEvent) {
  return (
    hit?.type === 'hit' &&
    hit.targetId !== undefined &&
    hit.time === shot.time &&
    hit.side === shot.side &&
    hit.lane === shot.lane &&
    Math.abs(hit.x - (shot.toX ?? shot.x)) < 0.0001
  );
}
/** Modern and historical event streams: units emit shot→hit; towers emit hit→death?→shot. */
export function combatEventAnchors(
  events: readonly GameEvent[],
  index: number,
  anchors: ReadonlyMap<number, CombatAnchor>,
) {
  const event = events[index];
  const source = Array.from(anchors.values())
    .filter(
      (anchor) =>
        anchor.unit.side === event.side &&
        anchor.unit.lane === event.lane &&
        (!event.heroId || anchor.unit.heroId === event.heroId),
    )
    .sort(
      (a, b) =>
        Math.abs(a.unit.x - event.x) - Math.abs(b.unit.x - event.x) ||
        Math.abs(a.unit.attackAt - event.time) - Math.abs(b.unit.attackAt - event.time) ||
        a.unit.id - b.unit.id,
    )[0];
  let targetId = event.targetId;
  if (event.type === 'projectile') {
    const hit = event.heroId
      ? events[index + 1]
      : events[index - 1]?.type === 'death'
        ? events[index - 2]
        : events[index - 1];
    const expected = event.heroId
      ? event.id + 1
      : events[index - 1]?.type === 'death'
        ? event.id - 2
        : event.id - 1;
    if (
      matches(hit, event) &&
      hit.id === expected &&
      (!event.heroId || (source && Math.abs(hit.x - event.x) <= source.unit.range + 0.0001)) &&
      (event.heroId ||
        events[index - 1]?.type !== 'death' ||
        (events[index - 1].id === event.id - 1 &&
          events[index - 1].side !== event.side &&
          events[index - 1].lane === event.lane &&
          Math.abs(events[index - 1].x - (event.toX ?? event.x)) < 0.0001 &&
          events[index - 1].time === event.time))
    )
      targetId = hit.targetId;
  }
  if (event.type === 'death') {
    const hit = events[index - 1];
    if (
      hit?.type === 'hit' &&
      hit.id === event.id - 1 &&
      hit.time === event.time &&
      hit.lane === event.lane &&
      hit.side !== event.side &&
      Math.abs(hit.x - event.x) < 0.0001
    )
      targetId = hit.targetId;
  }
  const target = targetId === undefined ? undefined : anchors.get(targetId);
  return { source, target };
}
