
import React, { useState } from 'react';
import { usePharmacy } from '../App';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User as UserIcon, UserPlus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { dataService } from '../services/dataService';
import { User } from '../types';

const Login: React.FC = () => {
  const { login } = usePharmacy();
  const navigate = useNavigate();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'pharmacist'>('pharmacist');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请填写所有必填字段');
      return;
    }

    if (isRegistering) {
      if (!name) {
         toast.error('请输入您的全名');
         return;
      }
      // Register Logic
      const newUser: User = {
        id: `u-${Date.now()}`,
        username,
        password,
        name,
        role
      };

      const result = dataService.registerUser(newUser);
      if (result.success) {
        toast.success('注册成功！请登录。');
        setIsRegistering(false);
        setPassword(''); // clear password for safety
      } else {
        toast.error(result.message);
      }

    } else {
      // Login Logic
      const user = dataService.loginUser(username, password);
      if (user) {
        login(user);
        toast.success(`欢迎回来, ${user.name}!`);
        navigate('/dashboard');
      } else {
        toast.error('用户名或密码错误');
      }
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setUsername('');
    setPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">医号通 (MediTrack Pro)</h1>
          <p className="text-slate-500">
            {isRegistering ? '注册新账号' : '药房销售管理系统'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                   <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                </div>
                <input 
                  type="text" 
                  required={isRegistering}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-800"
                  placeholder="例如：张三"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-800"
                placeholder="请输入用户名"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          {isRegistering && (
            <div className="animate-fade-in">
               <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
               <select 
                 value={role}
                 onChange={(e) => setRole(e.target.value as any)}
                 className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-800"
               >
                 <option value="pharmacist">药剂师</option>
                 <option value="admin">系统管理员</option>
               </select>
               <p className="text-xs text-slate-500 mt-1 ml-1">* 管理员拥有系统设置的完全访问权限。</p>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md hover:shadow-lg mt-4 flex items-center justify-center space-x-2"
          >
            {isRegistering ? (
              <>
                <UserPlus className="h-5 w-5" />
                <span>创建账号</span>
              </>
            ) : (
              <>
                <span>立即登录</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center border-t border-slate-100 pt-6">
           <p className="text-sm text-slate-600 mb-2">
             {isRegistering ? "已有账号?" : "还没有账号?"}
           </p>
           <button 
             onClick={toggleMode}
             className="text-primary-600 hover:text-primary-700 font-semibold text-sm hover:underline"
           >
             {isRegistering ? "返回登录" : "注册新用户"}
           </button>
        </div>

        {!isRegistering && (
          <p className="text-center text-xs text-slate-400 mt-8">
            © 2024 MediTrack Systems. 仅限授权访问。
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
