export type Origin = 'dawn' | 'grove' | 'void' | 'frost' | 'storm';
export type Role = 'vanguard' | 'ranger' | 'mage' | 'guardian' | 'support';
export interface Hero {
    id: string;
    name: string;
    title: string;
    origin: Origin;
    role: Role;
    cost: number;
    hp: number;
    attack: number;
    range: number;
    speed: number;
    interval: number;
    ability: string;
    description: string;
    skillCooldown: number;
    color: number;
    accent: number;
    weapon: 'sword' | 'bow' | 'staff' | 'hammer' | 'daggers';
}
