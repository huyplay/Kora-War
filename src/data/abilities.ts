export interface TargetQuery {
    group: 'self' | 'nearEnemies' | 'allies' | 'areaEnemies';
    radius?: number;
    excludeSelf?: boolean;
    woundedOnly?: boolean;
    order?: 'health' | 'healthRatio';
    limit?: number;
}
export interface AbilityEffect {
    kind: 'damage' | 'heal' | 'shield' | 'slow' | 'stun';
    targets: TargetQuery;
    amount: number;
    cap?: number;
    duration?: number;
}
export interface AbilityDefinition {
    trigger: 'enemy' | 'woundedAllies' | 'enemyOrAlly';
    missingHp?: number;
    effects: AbilityEffect[];
}
/** Giá trị và thứ tự hiệu ứng giữ nguyên từ prototype Aetherfall. */
export const ABILITIES: Record<string, AbilityDefinition> = {
    solan: { trigger: 'enemy', effects: [{ kind: 'damage', targets: { group: 'nearEnemies', radius: 2.4 }, amount: 85 }] },
    aurelia: { trigger: 'enemyOrAlly', effects: [{ kind: 'shield', targets: { group: 'allies', order: 'healthRatio', limit: 1 }, amount: 70, cap: 220 }] },
    lyra: { trigger: 'enemy', effects: [{ kind: 'damage', targets: { group: 'nearEnemies', limit: 3 }, amount: 65 }] },
    brann: { trigger: 'woundedAllies', missingHp: 40, effects: [
            { kind: 'heal', targets: { group: 'self' }, amount: 95 },
            { kind: 'heal', targets: { group: 'allies', excludeSelf: true, radius: 3 }, amount: 55 },
        ] },
    nyx: { trigger: 'enemy', effects: [{ kind: 'damage', targets: { group: 'nearEnemies', order: 'health', limit: 1 }, amount: 120 }] },
    vesper: { trigger: 'enemy', effects: [
            { kind: 'damage', targets: { group: 'areaEnemies', radius: 3 }, amount: 90 },
            { kind: 'slow', targets: { group: 'areaEnemies', radius: 3 }, amount: 0.5, duration: 3 },
        ] },
    kael: { trigger: 'enemy', effects: [
            { kind: 'shield', targets: { group: 'self' }, amount: 140, cap: 240 },
            { kind: 'stun', targets: { group: 'nearEnemies', radius: 2.5 }, amount: 0, duration: 1.2 },
        ] },
    mira: { trigger: 'woundedAllies', missingHp: 30, effects: [{ kind: 'heal', targets: { group: 'allies', woundedOnly: true, order: 'healthRatio', limit: 3 }, amount: 80 }] },
    raiko: { trigger: 'enemy', effects: [{ kind: 'damage', targets: { group: 'nearEnemies', limit: 3 }, amount: 70 }] },
    orin: { trigger: 'enemy', effects: [
            { kind: 'damage', targets: { group: 'nearEnemies', limit: 1 }, amount: 100 },
            { kind: 'stun', targets: { group: 'nearEnemies', limit: 1 }, amount: 0, duration: 1 },
        ] },
};
