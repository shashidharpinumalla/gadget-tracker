export interface Gadget {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  price: number;
  warrantyMonths: number;
  serialNumber?: string;
  notes?: string;
}

export type PageView = 'home' | 'list' | 'add' | 'analytics';