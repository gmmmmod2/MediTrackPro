
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Drug, SaleRecord, User } from './types';
import { dataService } from './services/dataService';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { Toaster } from 'react-hot-toast';

// --- Context Setup ---
interface PharmacyContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  drugs: Drug[];
  sales: SaleRecord[];
  addDrug: (d: Drug) => void;
  updateDrug: (d: Drug) => void;
  deleteDrug: (id: string) => void;
  batchDeleteDrugs: (ids: string[]) => void;
  toggleDrugLock: (id: string) => void;
  recordSale: (s: SaleRecord) => void;
  refreshData: () => void;
  updateUser: (u: User) => void;
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
  const [sales, setSales] = useState<SaleRecord[]>([]);

  // Initialize data
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setDrugs(dataService.getDrugs());
    setSales(dataService.getSales());
  };

  const login = (u: User) => setUser(u);
  const logout = () => setUser(null);

  const addDrug = (drug: Drug) => {
    const newDrugs = [...drugs, drug];
    setDrugs(newDrugs);
    dataService.saveDrugs(newDrugs);
  };

  const updateDrug = (drug: Drug) => {
    const newDrugs = drugs.map(d => d.id === drug.id ? drug : d);
    setDrugs(newDrugs);
    dataService.saveDrugs(newDrugs);
  };

  const deleteDrug = (id: string) => {
    const newDrugs = drugs.filter(d => d.id !== id);
    setDrugs(newDrugs);
    dataService.saveDrugs(newDrugs);
  };

  const batchDeleteDrugs = (ids: string[]) => {
    const newDrugs = drugs.filter(d => !ids.includes(d.id));
    setDrugs(newDrugs);
    dataService.saveDrugs(newDrugs);
  };

  const toggleDrugLock = (id: string) => {
    const newDrugs = drugs.map(d => 
      d.id === id ? { ...d, isLocked: !d.isLocked } : d
    );
    setDrugs(newDrugs);
    dataService.saveDrugs(newDrugs);
  };

  const recordSale = (sale: SaleRecord) => {
    // 1. Save Sale
    const newSales = dataService.addSale(sale);
    setSales(newSales);
    
    // 2. Update Inventory
    const updatedDrugs = [...drugs];
    sale.items.forEach(item => {
      const drugIndex = updatedDrugs.findIndex(d => d.id === item.drugId);
      if (drugIndex > -1) {
        updatedDrugs[drugIndex] = {
          ...updatedDrugs[drugIndex],
          stock: updatedDrugs[drugIndex].stock - item.quantity
        };
      }
    });
    setDrugs(updatedDrugs);
    dataService.saveDrugs(updatedDrugs);
  };

  const updateUser = (updatedUser: User) => {
    dataService.updateUser(updatedUser);
    if (user && user.id === updatedUser.id) {
      setUser(updatedUser);
    }
  };

  return (
    <PharmacyContext.Provider value={{ user, login, logout, drugs, sales, addDrug, updateDrug, deleteDrug, batchDeleteDrugs, toggleDrugLock, recordSale, refreshData, updateUser }}>
      {children}
    </PharmacyContext.Provider>
  );
};

// --- Protected Route Wrapper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = usePharmacy();
  const location = useLocation();

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
