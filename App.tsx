import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Drug, SaleRecord, User, SaleItem } from './types';
import { 
  drugService, 
  salesService, 
  userService, 
  authService, 
  getStoredUser 
} from './services/dataService';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// --- Loading Spinner Component ---
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-slate-600">加载中...</p>
    </div>
  </div>
);

// --- Context Setup ---
interface PharmacyContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  drugs: Drug[];
  deletedDrugs: Drug[];
  sales: SaleRecord[];
  loading: boolean;
  addDrug: (d: Omit<Drug, 'id' | 'history'>) => Promise<void>;
  batchAddDrugs: (d: Omit<Drug, 'id' | 'history'>[]) => Promise<void>;
  updateDrug: (d: Drug) => Promise<void>;
  deleteDrug: (id: string) => Promise<void>;
  batchDeleteDrugs: (ids: string[]) => Promise<void>;
  restoreDrug: (id: string) => Promise<void>;
  permanentlyDeleteDrug: (id: string) => Promise<void>;
  toggleDrugLock: (id: string) => Promise<void>;
  recordSale: (sale: SaleRecord) => Promise<void>;
  refreshData: () => Promise<void>;
  updateUser: (u: User) => Promise<void>;
}

const PharmacyContext = createContext<PharmacyContextType | null>(null);

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) throw new Error("usePharmacy must be used within a PharmacyProvider");
  return context;
};

const PharmacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [deletedDrugs, setDeletedDrugs] = useState<Drug[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // 初始化：检查本地存储的用户登录状态
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = getStoredUser();
      if (storedUser && authService.isAuthenticated()) {
        setUser(storedUser);
      }
      setInitialCheckDone(true);
      setLoading(false);
    };
    checkAuth();
  }, []);

  // 当用户登录后加载数据
  useEffect(() => {
    if (user && initialCheckDone) {
      refreshData();
    }
  }, [user, initialCheckDone]);

  // 刷新所有数据
  const refreshData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [drugsData, deletedDrugsData, salesData] = await Promise.all([
        drugService.getDrugs(),
        drugService.getDeletedDrugs(),
        salesService.getSales(),
      ]);
      setDrugs(drugsData);
      setDeletedDrugs(deletedDrugsData);
      setSales(salesData);
    } catch (error: any) {
      console.error('加载数据失败:', error);
      // 如果是认证错误，不显示 toast（会自动跳转登录）
      if (!error.message?.includes('登录')) {
        toast.error(error.message || '数据加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const login = (u: User) => {
    setUser(u);
  };
  
  // 登出
  const logout = () => {
    authService.logout();
    setUser(null);
    setDrugs([]);
    setDeletedDrugs([]);
    setSales([]);
  };

  // 添加单个药品
  const addDrug = async (drug: Omit<Drug, 'id' | 'history'>) => {
    try {
      const newDrug = await drugService.addDrug(drug);
      setDrugs(prev => [newDrug, ...prev]);
    } catch (error: any) {
      toast.error(error.message || '添加失败');
      throw error;
    }
  };

  // 批量添加药品
  const batchAddDrugs = async (newDrugsList: Omit<Drug, 'id' | 'history'>[]) => {
    try {
      const addedDrugs = await drugService.batchAddDrugs(newDrugsList);
      setDrugs(prev => [...addedDrugs, ...prev]);
    } catch (error: any) {
      toast.error(error.message || '批量添加失败');
      throw error;
    }
  };

  // 更新药品
  const updateDrug = async (updatedDrug: Drug) => {
    try {
      const updated = await drugService.updateDrug(updatedDrug);
      setDrugs(prev => prev.map(d => d.id === updated.id ? updated : d));
    } catch (error: any) {
      toast.error(error.message || '更新失败');
      throw error;
    }
  };

  // 删除药品（移至回收站）
  const deleteDrug = async (id: string) => {
    try {
      await drugService.deleteDrug(id);
      const drugToMove = drugs.find(d => d.id === id);
      setDrugs(prev => prev.filter(d => d.id !== id));
      if (drugToMove) {
        const deletedDrug = { 
          ...drugToMove, 
          deletedAt: new Date().toISOString(), 
          deletedBy: user?.name 
        };
        setDeletedDrugs(prev => [deletedDrug, ...prev]);
      }
    } catch (error: any) {
      toast.error(error.message || '删除失败');
      throw error;
    }
  };

  // 批量删除药品
  const batchDeleteDrugs = async (ids: string[]) => {
    try {
      const result = await drugService.batchDeleteDrugs(ids);
      const drugsToMove = drugs.filter(d => ids.includes(d.id));
      setDrugs(prev => prev.filter(d => !ids.includes(d.id)));
      
      const now = new Date().toISOString();
      const deletedItems = drugsToMove.map(d => ({ 
        ...d, 
        deletedAt: now, 
        deletedBy: user?.name 
      }));
      setDeletedDrugs(prev => [...deletedItems, ...prev]);
      
      toast.success(`成功删除 ${result.count} 个药品`);
    } catch (error: any) {
      toast.error(error.message || '批量删除失败');
      throw error;
    }
  };

  // 恢复药品（从回收站）
  const restoreDrug = async (id: string) => {
    try {
      await drugService.restoreDrug(id);
      const drugToRestore = deletedDrugs.find(d => d.id === id);
      setDeletedDrugs(prev => prev.filter(d => d.id !== id));
      
      if (drugToRestore) {
        const { deletedAt, deletedBy, ...cleanedDrug } = drugToRestore;
        setDrugs(prev => [cleanedDrug as Drug, ...prev]);
      }
    } catch (error: any) {
      toast.error(error.message || '恢复失败');
      throw error;
    }
  };

  // 彻底删除药品
  const permanentlyDeleteDrug = async (id: string) => {
    try {
      await drugService.permanentlyDeleteDrug(id);
      setDeletedDrugs(prev => prev.filter(d => d.id !== id));
    } catch (error: any) {
      toast.error(error.message || '删除失败');
      throw error;
    }
  };

  // 切换药品锁定状态
  const toggleDrugLock = async (id: string) => {
    try {
      const result = await drugService.toggleDrugLock(id);
      setDrugs(prev => prev.map(d => 
        d.id === id ? { ...d, isLocked: result.isLocked } : d
      ));
    } catch (error: any) {
      toast.error(error.message || '操作失败');
      throw error;
    }
  };

  // 记录销售
  const recordSale = async (sale: SaleRecord) => {
    try {
      const newSale = await salesService.addSale(sale.items, sale.customerName);
      setSales(prev => [newSale, ...prev]);
      
      // 更新本地库存
      setDrugs(prev => prev.map(drug => {
        const saleItem = sale.items.find(item => item.drugId === drug.id);
        if (saleItem) {
          return { ...drug, stock: drug.stock - saleItem.quantity };
        }
        return drug;
      }));
    } catch (error: any) {
      toast.error(error.message || '销售录入失败');
      throw error;
    }
  };

  // 更新用户信息
  const updateUser = async (updatedUser: User) => {
    try {
      const updated = await userService.updateProfile({ 
        name: updatedUser.name, 
        password: updatedUser.password 
      });
      setUser(prev => prev ? { ...prev, ...updated } : null);
    } catch (error: any) {
      toast.error(error.message || '更新失败');
      throw error;
    }
  };

  // 初始检查未完成时显示加载
  if (!initialCheckDone) {
    return <LoadingSpinner />;
  }

  return (
    <PharmacyContext.Provider value={{ 
      user, 
      login, 
      logout, 
      drugs, 
      deletedDrugs, 
      sales, 
      loading,
      addDrug, 
      batchAddDrugs, 
      updateDrug, 
      deleteDrug, 
      batchDeleteDrugs, 
      restoreDrug, 
      permanentlyDeleteDrug,
      toggleDrugLock, 
      recordSale, 
      refreshData, 
      updateUser 
    }}>
      {children}
    </PharmacyContext.Provider>
  );
};

// --- Protected Route Wrapper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = usePharmacy();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// --- Main App ---
const App: React.FC = () => {
  return (
    <PharmacyProvider>
      <HashRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<Sales />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </HashRouter>
    </PharmacyProvider>
  );
};

export default App;
