export interface QuickReaction {
  id: string;
  kind: 'phrase' | 'emoji';
  text: string;
  label: string;
  enabled: boolean;
  imageAssetId?: string;
}
export interface CommunicationConfig {
  enabled: boolean;
  cooldownSeconds: number;
  displaySeconds: number;
  maxPerMatch: number;
  reactions: QuickReaction[];
}
export function defaultCommunication(): CommunicationConfig {
  return {
    enabled: true,
    cooldownSeconds: 2,
    displaySeconds: 4,
    maxPerMatch: 120,
    reactions: [
      ...[
        ['hello', 'Xin chào!'],
        ['luck', 'Chúc may mắn!'],
        ['thanks', 'Cảm ơn!'],
        ['oops', 'Ôi, nhầm rồi!'],
        ['well-played', 'Hay lắm!'],
        ['good-game', 'Trận đấu hay!'],
      ].map(([id, text]) => ({ id, kind: 'phrase' as const, text, label: text, enabled: true })),
      ...[
        ['happy', '😄', 'Vui vẻ'],
        ['cheer', '🥳', 'Cổ vũ'],
        ['wow', '😮', 'Bất ngờ'],
        ['cry', '😭', 'Buồn quá'],
        ['laugh', '😂', 'Cười'],
        ['respect', '👏', 'Tán thưởng'],
        ['fire', '🔥', 'Bùng cháy'],
        ['heart', '💙', 'Yêu thích'],
      ].map(([id, text, label]) => ({ id, kind: 'emoji' as const, text, label, enabled: true })),
    ],
  };
}
export function communicationOf(content: { communication?: CommunicationConfig }) {
  return content.communication ?? defaultCommunication();
}
export function validateCommunication(c: CommunicationConfig) {
  const keys = (v: object, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));
  const number = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  if (
    !c ||
    !keys(c, ['enabled', 'cooldownSeconds', 'displaySeconds', 'maxPerMatch', 'reactions']) ||
    typeof c.enabled !== 'boolean' ||
    !number(c.cooldownSeconds, 0.5, 10) ||
    !number(c.displaySeconds, 2, 10) ||
    !Number.isInteger(c.maxPerMatch) ||
    !number(c.maxPerMatch, 1, 500) ||
    !Array.isArray(c.reactions) ||
    !c.reactions.length ||
    c.reactions.length > 24 ||
    new Set(c.reactions.map((r) => r?.id)).size !== c.reactions.length
  )
    throw new Error('Cấu hình chat nhanh không hợp lệ.');
  for (const r of c.reactions)
    if (
      !r ||
      !keys(r, ['id', 'kind', 'text', 'label', 'enabled', 'imageAssetId']) ||
      (r.imageAssetId !== undefined && !/^[a-zA-Z0-9_-]{1,80}$/.test(r.imageAssetId)) ||
      !/^[a-z][a-z0-9-]{0,31}$/.test(r.id) ||
      !['phrase', 'emoji'].includes(r.kind) ||
      typeof r.enabled !== 'boolean' ||
      typeof r.text !== 'string' ||
      !r.text.trim() ||
      r.text.length > (r.kind === 'emoji' ? 16 : 80) ||
      typeof r.label !== 'string' ||
      !r.label.trim() ||
      r.label.length > 80
    )
      throw new Error('Nội dung chat nhanh không hợp lệ.');
}
export interface ReactionPacket {
  id: number;
  side: 0 | 1;
  reactionId: string;
  remainingSeconds: number;
}
