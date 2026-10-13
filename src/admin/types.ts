import type { ContentConfig } from '../data/content';
import type { ManagedAsset } from '../services/api';
export interface State {
  version: number;
  revision: number;
  draft: ContentConfig;
  published: ContentConfig;
  assets: ManagedAsset[];
  players: {
    id: string;
    gold: number;
    created: string;
  }[];
  audit: {
    action: string;
    detail: string;
    created: string;
  }[];
  revisions: {
    id: number;
    created: string;
  }[];
}
export const sections = [
  ['overview', '◈', 'Tổng quan'],
  ['heroes', '♜', 'Nhân vật'],
  ['assets', '⬡', 'Thư viện asset'],
  ['map', '▧', 'Màn chơi'],
  ['vfx', '✧', 'Hiệu ứng'],
  ['economy', '◉', 'Vật phẩm & tiền'],
  ['players', '♙', 'Người chơi'],
  ['history', '↶', 'Phiên bản'],
];
