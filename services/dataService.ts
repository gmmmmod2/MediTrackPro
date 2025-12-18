/**
 * MediTrack Pro - 数据服务层
 * 
 * 重构版本：从 localStorage 模拟改为真实 API 调用
 * 
 * 使用方法：
 * 1. 替换原有的 services/dataService.ts
 * 2. 确保后端 API 已部署
 */

import { Drug, SaleRecord, User, SaleItem } from '../types';

// API 基础路径 - 在 Vercel 上会自动指向 /api
const API_BASE = '/api';

// Token 存储键
const TOKEN_KEY = 'meditrack_auth_token';
const USER_KEY = 'meditrack_user';

// ==================== 工具函数 ====================

/**
 * 获取存储的 Token
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 设置 Token
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * 清除 Token
 */
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * 获取存储的用户信息
 */
export const getStoredUser = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

/**
 * 设置用户信息
 */
export const setStoredUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * 带认证的 fetch 封装
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  // 如果 token 过期，清除并跳转登录
  if (response.status === 401) {
    clearToken();
    window.location.href = '/#/login';
    throw new Error('登录已过期，请重新登录');
  }

  return response;
}

/**
 * 处理 API 响应
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.message || '请求失败');
  }
  
  return data.data;
}

// ==================== 用户认证 API ====================

export const authService = {
  /**
   * 用户登录
   */
  login: async (username: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '登录失败');
    }

    // 保存 token 和用户信息
    setToken(data.data.token);
    setStoredUser(data.data.user);

    return data.data;
  },

  /**
   * 用户注册
   */
  register: async (userData: { username: string; password: string; name: string; role: string }): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    return { success: data.success, message: data.message };
  },

  /**
   * 登出
   */
  logout: (): void => {
    clearToken();
  },

  /**
   * 检查是否已登录
   */
  isAuthenticated: (): boolean => {
    return !!getToken();
  },

  /**
   * 获取当前用户
   */
  getCurrentUser: (): User | null => {
    return getStoredUser();
  },
};

// ==================== 药品 API ====================

export const drugService = {
  /**
   * 获取所有药品（活跃状态）
   */
  getDrugs: async (): Promise<Drug[]> => {
    const response = await fetchWithAuth('/drugs');
    return handleResponse<Drug[]>(response);
  },

  /**
   * 获取已删除的药品（回收站）
   */
  getDeletedDrugs: async (): Promise<Drug[]> => {
    const response = await fetchWithAuth('/drugs?deleted=true');
    return handleResponse<Drug[]>(response);
  },

  /**
   * 添加单个药品
   */
  addDrug: async (drug: Omit<Drug, 'id' | 'history'>): Promise<Drug> => {
    const response = await fetchWithAuth('/drugs', {
      method: 'POST',
      body: JSON.stringify(drug),
    });
    return handleResponse<Drug>(response);
  },

  /**
   * 批量添加药品
   */
  batchAddDrugs: async (drugs: Omit<Drug, 'id' | 'history'>[]): Promise<Drug[]> => {
    const response = await fetchWithAuth('/drugs', {
      method: 'POST',
      body: JSON.stringify(drugs),
    });
    return handleResponse<Drug[]>(response);
  },

  /**
   * 更新药品
   */
  updateDrug: async (drug: Drug): Promise<Drug> => {
    const response = await fetchWithAuth(`/drugs/${drug.id}`, {
      method: 'PUT',
      body: JSON.stringify(drug),
    });
    return handleResponse<Drug>(response);
  },

  /**
   * 删除药品（移至回收站）
   */
  deleteDrug: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`/drugs/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<void>(response);
  },

  /**
   * 批量删除药品
   */
  batchDeleteDrugs: async (ids: string[]): Promise<{ count: number }> => {
    const response = await fetchWithAuth('/drugs/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return handleResponse<{ count: number }>(response);
  },

  /**
   * 恢复药品（从回收站）
   */
  restoreDrug: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`/drugs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'restore' }),
    });
    await handleResponse<void>(response);
  },

  /**
   * 彻底删除药品
   */
  permanentlyDeleteDrug: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`/drugs/${id}?permanent=true`, {
      method: 'DELETE',
    });
    await handleResponse<void>(response);
  },

  /**
   * 切换药品锁定状态
   */
  toggleDrugLock: async (id: string): Promise<{ isLocked: boolean }> => {
    const response = await fetchWithAuth(`/drugs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'toggleLock' }),
    });
    return handleResponse<{ isLocked: boolean }>(response);
  },
};

// ==================== 销售 API ====================

export const salesService = {
  /**
   * 获取销售记录
   */
  getSales: async (limit: number = 100, offset: number = 0): Promise<SaleRecord[]> => {
    const response = await fetchWithAuth(`/sales?limit=${limit}&offset=${offset}`);
    return handleResponse<SaleRecord[]>(response);
  },

  /**
   * 创建销售记录
   */
  addSale: async (items: SaleItem[], customerName?: string): Promise<SaleRecord> => {
    const response = await fetchWithAuth('/sales', {
      method: 'POST',
      body: JSON.stringify({ items, customerName }),
    });
    return handleResponse<SaleRecord>(response);
  },
};

// ==================== 用户 API ====================

export const userService = {
  /**
   * 获取当前用户信息
   */
  getProfile: async (): Promise<User> => {
    const response = await fetchWithAuth('/users/me');
    return handleResponse<User>(response);
  },

  /**
   * 更新用户信息
   */
  updateProfile: async (data: { name?: string; password?: string }): Promise<User> => {
    const response = await fetchWithAuth('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const user = await handleResponse<User>(response);
    setStoredUser(user);
    return user;
  },
};

// ==================== 兼容旧版 dataService ====================
// 这部分是为了兼容你现有代码中的调用方式
// 建议逐步迁移到上面的新 API

export const dataService = {
  // 药品
  getDrugs: async () => drugService.getDrugs(),
  saveDrugs: () => console.warn('saveDrugs 已弃用，数据自动保存到数据库'),
  getDeletedDrugs: async () => drugService.getDeletedDrugs(),
  saveDeletedDrugs: () => console.warn('saveDeletedDrugs 已弃用'),

  // 销售
  getSales: async () => salesService.getSales(),
  addSale: async (sale: SaleRecord) => {
    return salesService.addSale(sale.items, sale.customerName);
  },

  // 用户 - 保持同步方式以兼容现有代码
  getUsers: (): User[] => {
    console.warn('getUsers 已弃用，用户数据存储在数据库中');
    return [];
  },
  
  registerUser: async (user: Omit<User, 'id'>): Promise<{ success: boolean; message: string }> => {
    return authService.register({
      username: user.username,
      password: user.password || '',
      name: user.name,
      role: user.role,
    });
  },

  loginUser: async (username: string, password: string): Promise<User | undefined> => {
    try {
      const result = await authService.login(username, password);
      return result.user;
    } catch {
      return undefined;
    }
  },

  updateUser: async (user: User) => {
    return userService.updateProfile({ name: user.name, password: user.password });
  },
};

export default dataService;
