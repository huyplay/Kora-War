import { SPELLS, type SpellId } from '../data/spells';
import { escapeHTML } from './dom';
const paths: Record<SpellId, string> = {
  fire: '<path d="M48 16c8 25-18 23-4 43 4-13 16-15 14-27 29 31 11 55-10 55S14 66 48 16Z"/>',
  ice: '<path d="m48 12 17 25-4 34-13 19-17-19-4-34Z"/><path d="m48 12 0 78M27 37l21 14 17-14M31 71l17-20 13 20" fill="none" stroke="#fff"/>',
  lightning: '<path d="M53 10 22 57h23L35 94l39-53H52l12-31Z"/>',
  wind: '<g fill="none" stroke-width="7" stroke-linecap="round"><path d="M16 39h46c29 0 16-33 0-20M16 53h59M25 67h29c26 0 18 27 3 20"/></g>',
  heal: '<path d="M39 20h18v24h24v18H57v24H39V62H15V44h24Z"/><path d="m16 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  shield:
    '<path d="m48 13 30 13-4 36c-3 14-16 23-26 29-10-6-23-15-26-29l-4-36Z"/><path d="M48 26v46M32 47h32" fill="none" stroke="#fff" stroke-width="5"/>',
  weaken:
    '<path d="m48 14 29 21-8 39-21 17-21-17-8-39Z" fill="none" stroke-width="5"/><path d="m53 18-16 29 20 3-15 35 29-44-20-3Z"/>',
  haste:
    '<path d="m24 23 27 27-27 27 17 0 28-27-28-27Z"/><path d="M12 33h14M8 49h26M12 65h14" fill="none" stroke-width="5" stroke-linecap="round"/>',
};
export function spellCard(id: SpellId, index: number, roster = false) {
  const spell = SPELLS[id];
  const art = `<svg class="spell-art" viewBox="0 0 96 104" aria-hidden="true"><circle cx="48" cy="53" r="34" fill="none" stroke="currentColor" opacity=".22"/><g fill="currentColor" stroke="currentColor" stroke-width="2">${paths[id]}</g></svg>`;
  return `<button class="hero-card spell-card ${roster ? 'roster-card' : ''}" data-hero="${id}" style="--hero-color:${spell.color}" aria-label="${spell.name}, ${spell.cost} mana. ${escapeHTML(spell.description)}"><span class="card-cost">${spell.cost}</span>${roster ? '' : `<kbd>${index + 1}</kbd>`}${art}<span class="card-shade"></span><span class="card-name">${spell.name}</span><span class="card-cooldown"></span>${roster ? '<span class="checkmark">✓</span>' : ''}</button>`;
}
