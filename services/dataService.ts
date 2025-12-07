
import { Drug, SaleRecord, User } from '../types';

const INITIAL_DRUGS: Drug[] = [
  {
    id: '1',
    code: 'D001',
    name: '阿莫西林胶囊 500mg',
    category: '抗生素',
    manufacturer: '华北制药',
    price: 12.50,
    stock: 150,
    minStockThreshold: 50,
    expiryDate: '2025-12-31',
    description: '用于治疗敏感菌引起的各种感染，如中耳炎、鼻窦炎、咽炎、扁桃体炎等。',
    isLocked: true,
    createdAt: '2023-01-15T08:00:00.000Z',
    createdBy: '系统管理员'
  },
  {
    id: '2',
    code: 'D002',
    name: '布洛芬缓释胶囊 400mg',
    category: '止痛药',
    manufacturer: '芬必得',
    price: 18.00,
    stock: 45,
    minStockThreshold: 100,
    expiryDate: '2024-11-30',
    description: '用于缓解轻至中度疼痛如头痛、关节痛、偏头痛、牙痛、肌肉痛、神经痛、痛经。也用于普通感冒或流行性感冒引起的发热。',
    isLocked: false,
    createdAt: '2023-02-10T09:00:00.000Z',
    createdBy: '系统管理员'
  },
  {
    id: '3',
    code: 'D003',
    name: '感冒灵颗粒',
    category: '感冒药',
    manufacturer: '华润三九',
    price: 15.50,
    stock: 200,
    minStockThreshold: 30,
    expiryDate: '2025-05-20',
    description: '解热镇痛。用于感冒引起的头痛，发热，鼻塞，流涕，咽痛。',
    isLocked: false,
    createdAt: '2023-03-05T14:30:00.000Z',
    createdBy: '系统管理员'
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    username: 'admin',
    password: 'password', // In a real app, hash this
    role: 'admin',
    name: '系统管理员'
  },
  {
    id: 'user1',
    username: 'pharm',
    password: 'password',
    role: 'pharmacist',
    name: '李药师'
  }
];

const KEYS = {
  DRUGS: 'meditrack_drugs',
  SALES: 'meditrack_sales',
  USERS: 'meditrack_users'
};

export const dataService = {
  getDrugs: (): Drug[] => {
    const data = localStorage.getItem(KEYS.DRUGS);
    if (!data) {
      localStorage.setItem(KEYS.DRUGS, JSON.stringify(INITIAL_DRUGS));
      return INITIAL_DRUGS;
    }
    return JSON.parse(data);
  },

  saveDrugs: (drugs: Drug[]) => {
    localStorage.setItem(KEYS.DRUGS, JSON.stringify(drugs));
  },

  getSales: (): SaleRecord[] => {
    const data = localStorage.getItem(KEYS.SALES);
    return data ? JSON.parse(data) : [];
  },

  addSale: (sale: SaleRecord): SaleRecord[] => {
    const sales = dataService.getSales();
    const newSales = [sale, ...sales];
    localStorage.setItem(KEYS.SALES, JSON.stringify(newSales));
    return newSales;
  },

  // User Management
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  },

  registerUser: (user: User): { success: boolean, message: string } => {
    const users = dataService.getUsers();
    if (users.find(u => u.username === user.username)) {
      return { success: false, message: '用户名已存在' };
    }
    const newUsers = [...users, user];
    localStorage.setItem(KEYS.USERS, JSON.stringify(newUsers));
    return { success: true, message: '注册成功' };
  },

  loginUser: (username: string, password: string): User | undefined => {
    const users = dataService.getUsers();
    return users.find(u => u.username === username && u.password === password);
  },

  updateUser: (user: User) => {
    const users = dataService.getUsers();
    const newUsers = users.map(u => u.id === user.id ? user : u);
    localStorage.setItem(KEYS.USERS, JSON.stringify(newUsers));
  }
};
