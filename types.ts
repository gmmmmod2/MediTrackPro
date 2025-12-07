
export interface Drug {
  id: string;
  code: string;
  name: string;
  category: string;
  manufacturer: string;
  price: number;
  stock: number;
  minStockThreshold: number;
  expiryDate: string;
  description?: string;
  sideEffects?: string;
  isLocked?: boolean; // Controls deletion restriction
  createdAt?: string; // ISO string for import date tracking
  createdBy?: string; // Name of the user who added this record
}

export interface SaleItem {
  drugId: string;
  drugName: string;
  quantity: number;
  priceAtSale: number;
  total: number;
}

export interface SaleRecord {
  id: string;
  timestamp: string; // ISO string
  items: SaleItem[];
  totalAmount: number;
  cashierName: string;
  customerName?: string; // Added field for tracking who bought the items
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'pharmacist';
  name: string;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  lowStockCount: number;
  totalProducts: number;
}

export type PageView = 'dashboard' | 'inventory' | 'sales' | 'login';
