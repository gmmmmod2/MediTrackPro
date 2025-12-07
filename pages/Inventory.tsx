
import React, { useState, useMemo, useRef } from 'react';
import { usePharmacy } from '../App';
import { Drug } from '../types';
import { Search, Plus, Edit2, Trash2, Filter, Save, X, AlertCircle, Upload, FileText, Check, AlertTriangle, Lock, Unlock, Calendar, Box, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const Inventory: React.FC = () => {
  const { drugs, addDrug, updateDrug, deleteDrug, batchDeleteDrugs, toggleDrugLock, user } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); 
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [drugToDelete, setDrugToDelete] = useState<Drug | null>(null);

  // Batch Delete State
  const [batchType, setBatchType] = useState<'category' | 'manufacturer' | 'date'>('category');
  const [batchCategory, setBatchCategory] = useState('');
  const [batchManufacturer, setBatchManufacturer] = useState('');
  const [batchDateType, setBatchDateType] = useState<'before' | 'after'>('before');
  const [batchDate, setBatchDate] = useState('');

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialFormState: Omit<Drug, 'id'> = {
    code: '', name: '', category: '', manufacturer: '', 
    price: 0, stock: 0, minStockThreshold: 10, expiryDate: '', description: '', isLocked: false, createdAt: new Date().toISOString()
  };
  const [formData, setFormData] = useState(initialFormState);

  // Derived State
  const categories = useMemo(() => ['All', ...Array.from(new Set(drugs.map(d => d.category)))], [drugs]);
  const manufacturers = useMemo(() => Array.from(new Set(drugs.map(d => d.manufacturer))), [drugs]);

  const filteredDrugs = useMemo(() => {
    return drugs.filter(drug => {
      const matchesSearch = drug.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            drug.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || drug.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [drugs, searchTerm, filterCategory]);

  // --- Handlers ---

  const handleOpenAdd = () => {
    setEditingDrug(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (drug: Drug) => {
    setEditingDrug(drug);
    setFormData({ ...drug });
    setIsModalOpen(true);
  };

  const handleToggleLock = (drug: Drug) => {
    if (user?.role !== 'admin') {
      toast.error('只有管理员可以更改锁定状态');
      return;
    }
    toggleDrugLock(drug.id);
    toast.success(drug.isLocked ? '已解除删除限制' : '已添加删除限制');
  };

  const handleDeleteClick = (drug: Drug) => {
    if (drug.isLocked) {
      toast.error('该药品受删除限制保护，无法删除。请联系管理员解锁。');
      return;
    }
    setDrugToDelete(drug);
    setIsDeleteModalOpen(true);
  };

  const showEntryInfo = (drug: Drug) => {
    toast((t) => (
        <div className="text-sm">
            <p className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> 录入追溯
            </p>
            <p className="text-slate-600">录入人: <span className="font-medium text-slate-800">{drug.createdBy || '未知'}</span></p>
            <p className="text-slate-600">时间: <span className="font-medium text-slate-800">{drug.createdAt ? new Date(drug.createdAt).toLocaleString('zh-CN') : '未知'}</span></p>
        </div>
    ), { duration: 4000, position: 'top-center', style: { minWidth: '200px' } });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDrug) {
      updateDrug({ ...formData, id: editingDrug.id } as Drug);
      toast.success('药品信息更新成功');
    } else {
      addDrug({ 
        ...formData, 
        id: crypto.randomUUID(), 
        createdAt: new Date().toISOString(),
        createdBy: user?.name || '系统管理员'
      } as Drug);
      toast.success('新药品添加成功');
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (drugToDelete) {
      deleteDrug(drugToDelete.id);
      toast.success('药品已删除');
      setIsDeleteModalOpen(false);
      setDrugToDelete(null);
    }
  };

  // --- Batch Delete Logic ---
  const getBatchDeleteTargets = () => {
    let targets: Drug[] = [];
    if (batchType === 'category' && batchCategory) {
       targets = drugs.filter(d => d.category === batchCategory);
    } else if (batchType === 'manufacturer' && batchManufacturer) {
       targets = drugs.filter(d => d.manufacturer === batchManufacturer);
    } else if (batchType === 'date' && batchDate) {
       const dateVal = new Date(batchDate).getTime();
       targets = drugs.filter(d => {
         const dDate = new Date(d.createdAt || 0).getTime();
         return batchDateType === 'before' ? dDate < dateVal : dDate > dateVal;
       });
    }
    return targets;
  };

  const handleBatchDelete = () => {
     const targets = getBatchDeleteTargets();
     const locked = targets.filter(d => d.isLocked);
     const toDelete = targets.filter(d => !d.isLocked);
     
     if (targets.length === 0) {
       toast.error('未找到符合条件的药品');
       return;
     }

     if (toDelete.length === 0 && locked.length > 0) {
       toast.error(`找到 ${locked.length} 条记录，但全部被锁定，无法删除。`);
       return;
     }

     batchDeleteDrugs(toDelete.map(d => d.id));
     
     let msg = `成功删除 ${toDelete.length} 条记录。`;
     if (locked.length > 0) {
       msg += ` 另有 ${locked.length} 条因受保护未删除。`;
     }
     toast.success(msg);
     setIsBatchDeleteModalOpen(false);
  };

  // --- Bulk Import Logic ---
  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        setBulkText(text);
        parseBulkData(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseBulkData = (text: string) => {
    const lines = text.split('\n');
    const parsed = lines.map((line, index) => {
        if (!line.trim()) return null;
        const parts = line.split(',').map(s => s.trim());
        
        const isValidLength = parts.length >= 8;
        const [code, name, category, manufacturer, priceStr, stockStr, thresholdStr, expiry] = parts;
        
        const price = parseFloat(priceStr);
        const stock = parseInt(stockStr);
        const minStockThreshold = parseInt(thresholdStr);
        
        const isValidData = !isNaN(price) && !isNaN(stock) && !isNaN(minStockThreshold) && code && name;

        return {
             id: crypto.randomUUID(),
             code, name, category, manufacturer,
             price, stock, minStockThreshold,
             expiryDate: expiry,
             description: '批量导入数据',
             createdAt: new Date().toISOString(),
             isLocked: false,
             isValid: isValidLength && isValidData,
             error: !isValidLength ? '格式错误: 字段不足' : (!isValidData ? '数据错误: 数值无效' : null)
        };
    }).filter(Boolean);
    setBulkPreview(parsed);
  };

  const confirmBulkImport = () => {
    const validDrugs = bulkPreview.filter(p => p.isValid);
    if (validDrugs.length === 0) {
        toast.error('没有有效的药品数据可导入');
        return;
    }
    validDrugs.forEach(d => {
        const { isValid, error, ...drugData } = d;
        addDrug({
            ...drugData,
            createdBy: user?.name || '系统管理员'
        });
    });
    toast.success(`成功导入 ${validDrugs.length} 条药品数据`);
    setIsBulkModalOpen(false);
    setBulkText('');
    setBulkPreview([]);
  };

  const inputClassName = "w-full border border-slate-300 bg-white rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm";

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">库存管理</h1>
          <p className="text-slate-500">药品录入、查询与库存跟踪</p>
        </div>
        <div className="flex space-x-3">
            <button 
            onClick={() => { setIsBulkModalOpen(true); setBulkText(''); setBulkPreview([]); }}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
            <Upload className="h-5 w-5" />
            <span>批量导入</span>
            </button>
            <button 
            onClick={handleOpenAdd}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
            <Plus className="h-5 w-5" />
            <span>新增药品</span>
            </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索药品名称或编码..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-800"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-slate-500" />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 min-w-[150px]"
          >
            {categories.map(c => <option key={c} value={c} className="text-slate-800 bg-white">{c === 'All' ? '所有分类' : c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold border-b">锁定</th>
                <th className="p-4 font-semibold border-b">编码</th>
                <th className="p-4 font-semibold border-b">名称</th>
                <th className="p-4 font-semibold border-b">分类</th>
                <th className="p-4 font-semibold border-b text-center">过期日期</th>
                <th className="p-4 font-semibold border-b text-right">库存</th>
                <th className="p-4 font-semibold border-b text-right">单价</th>
                <th className="p-4 font-semibold border-b">状态</th>
                <th className="p-4 font-semibold border-b text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrugs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">未找到药品记录。</td>
                </tr>
              ) : (
                filteredDrugs.map(drug => {
                  const isLowStock = drug.stock <= drug.minStockThreshold;
                  return (
                    <tr key={drug.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleToggleLock(drug)}
                          className={`transition-colors ${drug.isLocked ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'}`}
                          title={drug.isLocked ? "已锁定 (仅管理员可解锁)" : "点击锁定"}
                        >
                          {drug.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="p-4 text-slate-600 font-mono text-sm">{drug.code}</td>
                      <td className="p-4 font-medium text-slate-800">{drug.name}</td>
                      <td className="p-4 text-slate-600">
                        <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                          {drug.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 text-center text-sm">{drug.expiryDate}</td>
                      <td className="p-4 text-right font-medium text-slate-800">{drug.stock}</td>
                      <td className="p-4 text-right text-slate-600">¥{drug.price.toFixed(2)}</td>
                      <td className="p-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-medium border border-amber-100">
                            <AlertCircle className="h-3 w-3" />
                            <span>库存预警</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-medium border border-emerald-100">
                            充足
                          </span>
                        )}
                      </td>
                      <td className="p-4 flex justify-center space-x-2">
                        <button 
                          onClick={() => showEntryInfo(drug)}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看录入信息"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(drug)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(drug)}
                          className={`p-2 rounded-lg transition-colors ${drug.isLocked 
                            ? 'text-slate-200 cursor-not-allowed' 
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                          title={drug.isLocked ? "无法删除 (已锁定)" : "删除"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Button for Batch Delete */}
      <button 
        onClick={() => setIsBatchDeleteModalOpen(true)}
        className="fixed bottom-8 right-8 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-transform hover:-translate-y-1 z-40 group"
        title="高级批量删除"
      >
        <Trash2 className="h-6 w-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
          高级删除工具
        </span>
      </button>

      {/* Batch Delete Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="bg-red-50 p-6 border-b border-red-100 flex items-center space-x-3">
               <Trash2 className="h-6 w-6 text-red-600" />
               <h2 className="text-lg font-bold text-red-800">高级批量删除</h2>
             </div>
             
             <div className="p-6 space-y-6">
                <p className="text-sm text-slate-600">
                  请选择批量删除的条件。系统将<span className="font-bold text-red-600">自动跳过</span>处于锁定状态的药品。
                </p>
                
                <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                  {['category', 'manufacturer', 'date'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setBatchType(type as any)}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${batchType === type ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {type === 'category' ? '按分类' : type === 'manufacturer' ? '按厂商' : '按时间'}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   {batchType === 'category' && (
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">选择分类</label>
                       <select 
                         className={inputClassName}
                         value={batchCategory}
                         onChange={(e) => setBatchCategory(e.target.value)}
                       >
                         <option value="">-- 请选择 --</option>
                         {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                     </div>
                   )}

                   {batchType === 'manufacturer' && (
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">选择/输入厂商</label>
                        <input 
                          type="text" 
                          list="manufacturers" 
                          className={inputClassName} 
                          value={batchManufacturer}
                          onChange={(e) => setBatchManufacturer(e.target.value)}
                          placeholder="输入厂商名称"
                        />
                        <datalist id="manufacturers">
                          {manufacturers.map(m => <option key={m} value={m} />)}
                        </datalist>
                     </div>
                   )}

                   {batchType === 'date' && (
                     <div className="space-y-3">
                        <div className="flex space-x-4">
                           <label className="flex items-center space-x-2 cursor-pointer">
                             <input type="radio" checked={batchDateType === 'before'} onChange={() => setBatchDateType('before')} className="text-primary-600" />
                             <span className="text-sm text-slate-700">早于 (含)</span>
                           </label>
                           <label className="flex items-center space-x-2 cursor-pointer">
                             <input type="radio" checked={batchDateType === 'after'} onChange={() => setBatchDateType('after')} className="text-primary-600" />
                             <span className="text-sm text-slate-700">晚于</span>
                           </label>
                        </div>
                        <input 
                          type="date" 
                          className={inputClassName}
                          value={batchDate}
                          onChange={(e) => setBatchDate(e.target.value)}
                        />
                        <p className="text-xs text-slate-400">基于药品入库/创建时间</p>
                     </div>
                   )}
                </div>

                {/* Preview count logic */}
                {(() => {
                   const targets = getBatchDeleteTargets();
                   const lockedCount = targets.filter(d => d.isLocked).length;
                   const deleteCount = targets.length - lockedCount;
                   return targets.length > 0 ? (
                     <div className="text-sm border-l-4 border-amber-400 bg-amber-50 p-3 rounded-r">
                        <p>匹配到 <span className="font-bold">{targets.length}</span> 条记录。</p>
                        <p className="text-slate-500 mt-1">
                          即将删除 <span className="font-bold text-red-600">{deleteCount}</span> 条，
                          保留 <span className="font-bold text-emerald-600">{lockedCount}</span> 条 (已锁定)。
                        </p>
                     </div>
                   ) : null;
                })()}

             </div>

             <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
               <button onClick={() => setIsBatchDeleteModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">取消</button>
               <button 
                 onClick={handleBatchDelete}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm flex items-center space-x-2"
               >
                 <Trash2 className="h-4 w-4" />
                 <span>确认删除</span>
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {editingDrug ? '编辑药品信息' : '新增药品录入'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">药品编码</label>
                  <input required type="text" className={inputClassName} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="例如: D001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">药品名称</label>
                  <input required type="text" className={inputClassName} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例如: 阿莫西林" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                  <input required type="text" className={inputClassName} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="例如: 抗生素" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">生产厂商</label>
                  <input required type="text" className={inputClassName} value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">单价 (¥)</label>
                  <input required type="number" min="0" step="0.01" className={inputClassName} value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">当前库存</label>
                  <input required type="number" min="0" className={inputClassName} value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">库存预警阈值</label>
                  <input required type="number" min="0" className={inputClassName} value={formData.minStockThreshold} onChange={e => setFormData({...formData, minStockThreshold: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">过期日期</label>
                  <input required type="date" className={inputClassName} value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">描述与备注</label>
                <textarea className={inputClassName} rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="药品的适应症或特殊说明..."></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md flex items-center space-x-2">
                  <Save className="h-5 w-5" />
                  <span>保存信息</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                 <div>
                   <h2 className="text-xl font-bold text-slate-800">批量药品导入</h2>
                   <p className="text-sm text-slate-500">支持文件上传 (.txt) 或直接粘贴文本数据</p>
                 </div>
                 <button onClick={() => setIsBulkModalOpen(false)}><X className="h-6 w-6 text-slate-400" /></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                 {/* Format Guide */}
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> 数据格式要求:</p>
                    <p className="mt-1 font-mono text-xs">编码, 名称, 分类, 厂商, 价格, 库存, 预警值, 过期日期(YYYY-MM-DD)</p>
                    <p className="mt-1 text-xs opacity-80">例如: D009, 维生素C片, 补充剂, 养生堂, 19.9, 100, 20, 2025-12-31</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Input Area */}
                    <div className="space-y-4">
                       <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors bg-slate-50">
                          <input 
                            type="file" 
                            accept=".txt" 
                            ref={fileInputRef}
                            onChange={handleFileRead}
                            className="hidden" 
                            id="file-upload"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                             <Upload className="h-8 w-8 text-slate-400 mb-2" />
                             <span className="text-slate-700 font-medium">点击上传文件 (.txt)</span>
                             <span className="text-xs text-slate-400 mt-1">每行一条数据</span>
                          </label>
                       </div>
                       
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">或直接粘贴数据:</label>
                          <textarea 
                            value={bulkText}
                            onChange={(e) => { setBulkText(e.target.value); parseBulkData(e.target.value); }}
                            className="w-full h-40 p-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-800"
                            placeholder="D001, 药品A, ..."
                          ></textarea>
                       </div>
                    </div>

                    {/* Preview Area */}
                    <div className="border rounded-lg flex flex-col overflow-hidden bg-slate-50">
                       <div className="p-3 bg-slate-100 border-b font-semibold text-slate-700 text-sm">
                          数据预览 ({bulkPreview.filter(i => i.isValid).length} 有效 / {bulkPreview.length} 总计)
                       </div>
                       <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[300px]">
                          {bulkPreview.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">暂无数据...</p>}
                          {bulkPreview.map((item, idx) => (
                             <div key={idx} className={`p-2 rounded text-xs border flex justify-between items-start ${item.isValid ? 'bg-white border-slate-200' : 'bg-red-50 border-red-100'}`}>
                                <div>
                                   {item.isValid ? (
                                     <div className="font-mono">
                                        <span className="font-bold text-slate-800">{item.code}</span> - {item.name}
                                     </div>
                                   ) : (
                                     <div className="text-red-600 font-bold">无效数据: {item.error}</div>
                                   )}
                                </div>
                                {item.isValid && <Check className="h-4 w-4 text-emerald-500" />}
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end">
                 <button 
                   onClick={confirmBulkImport}
                   disabled={bulkPreview.filter(p => p.isValid).length === 0}
                   className="bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-primary-700 text-white px-6 py-2 rounded-lg shadow-md transition-colors font-medium flex items-center space-x-2"
                 >
                    <Save className="h-4 w-4" />
                    <span>确认导入有效数据</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && drugToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">确认删除药品?</h3>
              <p className="text-slate-500 mb-6">
                您即将删除 <span className="font-bold text-slate-800">{drugToDelete.name}</span>。
                <br />此操作无法撤销。
              </p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
