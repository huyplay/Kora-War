import type { Origin, Role } from './types';
export const ORIGINS: Record<Origin, {
    name: string;
    icon: string;
    color: string;
    effect: string;
}> = {
    dawn: { name: 'Bình Minh', icon: '☀', color: '#efc776', effect: '2 tướng: toàn đội nhận 55 lá chắn khi xuất trận.' },
    grove: { name: 'Lâm Linh', icon: '❧', color: '#7be6b0', effect: '2 tướng: toàn đội hồi 4 máu mỗi giây.' },
    void: { name: 'Hư Không', icon: '◈', color: '#bf99f4', effect: '2 tướng: toàn đội tăng 15% sát thương.' },
    frost: { name: 'Băng Thệ', icon: '❄', color: '#8fd9ed', effect: '2 tướng: đòn đánh làm chậm kẻ địch 20% trong 1,5 giây.' },
    storm: { name: 'Lôi Đình', icon: 'ϟ', color: '#e6d47a', effect: '2 tướng: mana hồi nhanh hơn 20%.' },
};
export const ROLES: Record<Role, {
    name: string;
    icon: string;
    effect: string;
}> = {
    vanguard: { name: 'Tiên Phong', icon: '⚔', effect: '2 tướng: Tiên Phong tăng 20% tốc đánh.' },
    ranger: { name: 'Du Hiệp', icon: '➶', effect: '2 tướng: Du Hiệp tăng 20% sát thương.' },
    mage: { name: 'Thuật Sư', icon: '✦', effect: '2 tướng: Thuật Sư hồi kỹ năng nhanh hơn 25%.' },
    guardian: { name: 'Hộ Vệ', icon: '⬡', effect: '2 tướng: Hộ Vệ tăng 25% máu tối đa.' },
    support: { name: 'Dẫn Linh', icon: '✧', effect: '2 tướng: Dẫn Linh hồi kỹ năng nhanh hơn 25%.' },
};
