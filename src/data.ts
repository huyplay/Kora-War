export type Origin = 'dawn' | 'grove' | 'void' | 'frost' | 'storm';
export type Role = 'vanguard' | 'ranger' | 'mage' | 'guardian' | 'support';
export interface Hero {
  id: string; name: string; title: string; origin: Origin; role: Role;
  cost: number; hp: number; attack: number; range: number; speed: number;
  interval: number; ability: string; description: string; skillCooldown: number;
  color: number; accent: number; weapon: 'sword'|'bow'|'staff'|'hammer'|'daggers';
}
export const ORIGINS: Record<Origin, {name: string; icon: string; color: string; effect: string}> = {
  dawn: {name:'Bình Minh',icon:'☀',color:'#efc776',effect:'2 tướng: toàn đội nhận 55 lá chắn khi xuất trận.'},
  grove: {name:'Lâm Linh',icon:'❧',color:'#7be6b0',effect:'2 tướng: toàn đội hồi 4 máu mỗi giây.'},
  void: {name:'Hư Không',icon:'◈',color:'#bf99f4',effect:'2 tướng: toàn đội tăng 15% sát thương.'},
  frost: {name:'Băng Thệ',icon:'❄',color:'#8fd9ed',effect:'2 tướng: đòn đánh làm chậm kẻ địch 20% trong 1,5 giây.'},
  storm: {name:'Lôi Đình',icon:'ϟ',color:'#e6d47a',effect:'2 tướng: mana hồi nhanh hơn 20%.'},
};
export const ROLES: Record<Role, {name: string; icon: string; effect: string}> = {
  vanguard: {name:'Tiên Phong',icon:'⚔',effect:'2 tướng: Tiên Phong tăng 20% tốc đánh.'},
  ranger: {name:'Du Hiệp',icon:'➶',effect:'2 tướng: Du Hiệp tăng 20% sát thương.'},
  mage: {name:'Thuật Sư',icon:'✦',effect:'2 tướng: Thuật Sư hồi kỹ năng nhanh hơn 25%.'},
  guardian: {name:'Hộ Vệ',icon:'⬡',effect:'2 tướng: Hộ Vệ tăng 25% máu tối đa.'},
  support: {name:'Dẫn Linh',icon:'✧',effect:'2 tướng: Dẫn Linh hồi kỹ năng nhanh hơn 25%.'},
};
export const HEROES: Hero[] = [
  {id:'solan',name:'Solan',title:'Kiếm sĩ rạng đông',origin:'dawn',role:'vanguard',cost:3,hp:360,attack:38,range:1.05,speed:1.1,interval:1.15,ability:'Nhật Trảm',description:'Chém vòng cung, gây 85 sát thương cho địch trong phạm vi 2,4m.',skillCooldown:7,color:0xe5bc70,accent:0xffe7a3,weapon:'sword'},
  {id:'aurelia',name:'Aurelia',title:'Người giữ bình minh',origin:'dawn',role:'support',cost:3,hp:230,attack:23,range:3.5,speed:0.88,interval:1.4,ability:'Ánh Sáng Hộ Mệnh',description:'Ban 70 lá chắn cho đồng minh gần nhất còn sống trong phạm vi 5m.',skillCooldown:8,color:0xe6d4a1,accent:0xffffcc,weapon:'staff'},
  {id:'lyra',name:'Lyra',title:'Cung thủ tán rừng',origin:'grove',role:'ranger',cost:2,hp:185,attack:31,range:4.6,speed:1.1,interval:1.2,ability:'Mưa Tên',description:'Bắn một loạt tên, gây 65 sát thương lên tối đa 3 địch phía trước.',skillCooldown:7.5,color:0x59b893,accent:0xb3ffd1,weapon:'bow'},
  {id:'brann',name:'Brann',title:'Cổ thụ thức tỉnh',origin:'grove',role:'guardian',cost:4,hp:610,attack:27,range:1.25,speed:0.66,interval:1.65,ability:'Rễ Nguồn',description:'Hồi 95 máu cho bản thân và 55 máu cho đồng minh gần trong phạm vi 3m.',skillCooldown:9,color:0x8b9e65,accent:0x96edaa,weapon:'hammer'},
  {id:'nyx',name:'Nyx',title:'Lưỡi đao hư ảnh',origin:'void',role:'vanguard',cost:3,hp:260,attack:48,range:1.05,speed:1.5,interval:0.95,ability:'Ám Kích',description:'Gây 120 sát thương lên mục tiêu thấp máu nhất trong phạm vi 3m.',skillCooldown:8,color:0x9b72b8,accent:0xe0b5ff,weapon:'daggers'},
  {id:'vesper',name:'Vesper',title:'Kẻ dệt tinh vân',origin:'void',role:'mage',cost:5,hp:245,attack:43,range:4.1,speed:0.78,interval:1.5,ability:'Hố Sao',description:'Gây 90 sát thương và làm chậm 50% toàn bộ địch trong phạm vi 3m quanh mục tiêu.',skillCooldown:10,color:0x7967b3,accent:0xd2a5ff,weapon:'staff'},
  {id:'kael',name:'Kael',title:'Vệ binh sương giá',origin:'frost',role:'guardian',cost:4,hp:540,attack:32,range:1.15,speed:0.75,interval:1.4,ability:'Băng Giáp',description:'Nhận 140 lá chắn và đóng băng địch gần trong 1,2 giây.',skillCooldown:10,color:0x74afc5,accent:0xb1f1ff,weapon:'sword'},
  {id:'mira',name:'Mira',title:'Lời thì thầm băng',origin:'frost',role:'support',cost:3,hp:225,attack:25,range:3.8,speed:0.9,interval:1.5,ability:'Suối Ngọc',description:'Hồi 80 máu cho tối đa 3 đồng minh bị thương trong phạm vi 5m.',skillCooldown:8,color:0xa3cce0,accent:0xe0ffff,weapon:'staff'},
  {id:'raiko',name:'Raiko',title:'Sứ giả cuồng phong',origin:'storm',role:'ranger',cost:3,hp:230,attack:30,range:4.2,speed:1.3,interval:1.0,ability:'Liên Tiễn',description:'Tia sét nhảy qua tối đa 3 mục tiêu, gây 70 sát thương mỗi mục tiêu.',skillCooldown:8,color:0x6687b3,accent:0xffe894,weapon:'bow'},
  {id:'orin',name:'Orin',title:'Người gọi sấm',origin:'storm',role:'mage',cost:4,hp:280,attack:40,range:3.8,speed:0.85,interval:1.35,ability:'Thiên Lôi',description:'Gây 100 sát thương lên mục tiêu và làm choáng 1 giây.',skillCooldown:9,color:0xbd985f,accent:0xffe17a,weapon:'hammer'},
];
export const HERO_MAP = Object.fromEntries(HEROES.map(h => [h.id,h])) as Record<string, Hero>;
export const DEFAULT_DECK = ['solan','lyra','brann','aurelia'];
export const ENEMY_DECK = ['kael','nyx','vesper','mira'];
export const LANES = [-4.8,0,4.8];
export function traits(deck: string[]) {
  const counts: Record<string,number> = {};
  for (const id of deck) { const h=HERO_MAP[id]; if(h) { counts[h.origin]=(counts[h.origin]||0)+1;counts[h.role]=(counts[h.role]||0)+1; } }
  return counts;
}
