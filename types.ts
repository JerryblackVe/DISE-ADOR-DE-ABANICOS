
export interface FanTemplate {
  id: string;
  name: string;
  svgUrl: string; // URL to the fan outline/mask
  width: number;
  height: number;
  printAreaPath: string; // SVG path data for the clipping mask
}

export interface DesignElement {
  id: string;
  type: 'image' | 'text' | 'path';
  content?: string; // For text or image URL
  x: number;
  y: number;
  scale: number;
  rotation: number;
  fill?: string;
  fontFamily?: string;
  options?: any;
}

export interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  designThumbnail: string; // Base64 or URL
  designData: any; // JSON export of fabric canvas
  quantity: number;
  status: 'pending' | 'production' | 'shipped';
  createdAt: Date;
}

export enum AppView {
  EDITOR = 'EDITOR',
  CHECKOUT = 'CHECKOUT',
  ADMIN = 'ADMIN',
  SUCCESS = 'SUCCESS'
}

export type FanType = 'cloth' | 'polymer';

export interface CustomFont {
  name: string;
  data: string; // Base64 data URL
}
