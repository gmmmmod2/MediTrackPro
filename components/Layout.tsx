
import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Activity, Menu, X, User as UserIcon } from 'lucide-react';
import { usePharmacy } from '../App';

export const Layout: React.FC = () => {
  const { user, logout } = usePharmacy();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: '仪表盘', path: '/dashboard', icon: LayoutDashboard },
    { name: '库存管理', path: '/inventory', icon: Package },
    { name: '销售收银', path: '/sales', icon: ShoppingCart },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl">
        <div className="p-6 flex items-center space-x-2 border-b border-slate-700">
          <Activity className="h-8 w-8 text-primary-500" />
          <span className="text-xl font-bold tracking-wide">医号通</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
             const isActive = location.pathname.startsWith(item.path);
             return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-3 mb-4 px-2 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors group"
            role="button"
            title="管理个人信息"
          >
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold group-hover:bg-primary-600 transition-colors">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate group-hover:text-primary-100">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate group-hover:text-slate-300">
                {user?.role === 'admin' ? '系统管理员' : '药剂师'}
              </p>
            </div>
            <UserIcon className="h-4 w-4 text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 bg-opacity-95 md:hidden flex flex-col p-4">
          <div className="flex justify-between items-center mb-8">
             <div className="flex items-center space-x-2 text-white">
                <Activity className="h-8 w-8 text-primary-500" />
                <span className="text-xl font-bold">医号通</span>
             </div>
             <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">
               <X className="h-8 w-8" />
             </button>
          </div>
          <nav className="flex-1 space-y-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-4 rounded-lg text-lg
                  ${isActive ? 'bg-primary-600 text-white' : 'text-slate-300'}
                `}
              >
                <item.icon className="h-6 w-6" />
                <span>{item.name}</span>
              </NavLink>
            ))}
            <div className="border-t border-slate-700 pt-4 mt-4">
                <NavLink
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center space-x-3 px-4 py-4 rounded-lg text-lg
                    ${isActive ? 'bg-primary-600 text-white' : 'text-slate-300'}
                  `}
                >
                  <UserIcon className="h-6 w-6" />
                  <span>我的资料</span>
                </NavLink>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-primary-600" />
            <span className="font-bold text-slate-800">医号通</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
             <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
