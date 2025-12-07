
import React, { useState } from 'react';
import { usePharmacy } from '../App';
import { User, Shield, Key, Save, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, updateUser } = usePharmacy();
  
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState(user?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) {
      toast.error('所有字段均为必填项');
      return;
    }
    
    updateUser({
      ...user,
      name,
      password
    });
    
    toast.success('个人信息更新成功');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">个人信息</h1>
          <p className="text-slate-500">管理您的账户详情与安全设置。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: ID Card */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center h-full">
            <div className="h-32 w-32 bg-primary-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
               <span className="text-4xl font-bold text-primary-600">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">{user.name}</h2>
            <div className="flex items-center space-x-2 text-slate-500 mb-6">
               <Shield className="h-4 w-4 text-emerald-500" />
               <span className="capitalize">{user.role === 'admin' ? '系统管理员' : '药剂师'}</span>
            </div>
            
            <div className="w-full border-t border-slate-100 pt-6 text-left space-y-3">
               <div>
                  <label className="text-xs uppercase text-slate-400 font-bold">用户 ID</label>
                  <p className="font-mono text-sm text-slate-600">{user.id}</p>
               </div>
               <div>
                  <label className="text-xs uppercase text-slate-400 font-bold">用户名</label>
                  <p className="font-mono text-sm text-slate-600">@{user.username}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="col-span-1 md:col-span-2">
           <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
                 <UserCircle className="h-5 w-5 text-primary-600" />
                 <h3 className="text-lg font-semibold text-slate-800">编辑资料</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                   <input 
                     type="text" 
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">角色权限</label>
                   <input 
                     type="text" 
                     value={user.role === 'admin' ? '系统管理员' : '药剂师'}
                     disabled
                     className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-3 cursor-not-allowed"
                   />
                   <p className="text-xs text-slate-400 mt-1">角色权限无法直接更改。请联系管理员。</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 pt-4">
                 <Key className="h-5 w-5 text-primary-600" />
                 <h3 className="text-lg font-semibold text-slate-800">安全设置</h3>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
                 <div className="relative">
                   <input 
                     type={showPassword ? "text" : "password"} 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full border border-slate-200 rounded-lg p-3 pr-20 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                   />
                   <button 
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary-600 hover:text-primary-800"
                   >
                     {showPassword ? "隐藏" : "显示"}
                   </button>
                 </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="h-5 w-5" />
                  <span>保存更改</span>
                </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
