
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePharmacy } from '../App';
import { Drug, SaleItem, SaleRecord } from '../types';
import { Plus, Trash, Search, ShoppingCart, CheckCircle, Info, History, X, FileText, User, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDrugInfo } from '../services/geminiService';

// --- Shared Constants ---
const inputClassName = "w-full border border-slate-300 bg-white rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm";

const Sales: React.FC = () => {
  const { drugs, sales, user, recordSale } = usePharmacy();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-800">销售管理</h1>
           <p className="text-slate-500">
             {activeTab === 'pos' ? '收银台销售录入' : '历史销售记录查询与追溯'}
           </p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pos' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            收银台
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            历史查询
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <SalesPOS drugs={drugs} user={user} recordSale={recordSale} />
      ) : (
        <SalesHistory sales={sales} drugs={drugs} />
      )}
    </div>
  );
};

// ==========================================
// Sub-Component: Sales POS (Point of Sale)
// ==========================================

interface SalesPOSProps {
  drugs: Drug[];
  user: any;
  recordSale: (sale: SaleRecord) => void;
}

const SalesPOS: React.FC<SalesPOSProps> = ({ drugs, user, recordSale }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  
  // Unified Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [aiTip, setAiTip] = useState<string | null>(null);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter logic for unified search
  const filteredDrugs = useMemo(() => {
    if (!searchTerm) return [];
    return drugs.filter(d => 
      d.stock > 0 && 
      (d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       d.code.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 8); // Limit results
  }, [drugs, searchTerm]);

  const handleSelectDrug = (drug: Drug) => {
    setSelectedDrug(drug);
    setSearchTerm(drug.name);
    setIsDropdownOpen(false);
    // AI Tip
    getDrugInfo(drug.name).then(info => setAiTip(info));
  };

  const handleAddToCart = () => {
    if (!selectedDrug) return;
    
    if (quantity > selectedDrug.stock) {
      toast.error(`库存不足，仅剩 ${selectedDrug.stock} 件`);
      return;
    }

    const existingItem = cart.find(item => item.drugId === selectedDrug.id);
    if (existingItem) {
       if (existingItem.quantity + quantity > selectedDrug.stock) {
        toast.error('超出库存上限');
        return;
       }
       setCart(cart.map(item => item.drugId === selectedDrug.id ? {
         ...item,
         quantity: item.quantity + quantity,
         total: (item.quantity + quantity) * item.priceAtSale
       } : item));
    } else {
      setCart([...cart, {
        drugId: selectedDrug.id,
        drugName: selectedDrug.name,
        quantity: quantity,
        priceAtSale: selectedDrug.price,
        total: quantity * selectedDrug.price
      }]);
    }

    // Reset Entry
    setSelectedDrug(null);
    setSearchTerm('');
    setQuantity(1);
    setAiTip(null);
    toast.success('已加入购物车');
  };

  const removeFromCart = (drugId: string) => {
    setCart(cart.filter(item => item.drugId !== drugId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const sale: SaleRecord = {
      id: `SALE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: cart,
      totalAmount: cartTotal,
      cashierName: user?.name || '未知',
      customerName: customerName.trim() || '散客'
    };

    recordSale(sale);
    setCart([]);
    setCustomerName('');
    setAiTip(null);
    toast.success('销售录入完成!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left: Input Area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center space-x-2">
             <Plus className="h-5 w-5 text-primary-600" />
             <span>新增商品</span>
           </h2>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Unified Search / Select */}
              <div className="md:col-span-2 relative" ref={searchContainerRef}>
                 <label className="block text-sm font-medium text-slate-700 mb-1">搜索/选择药品</label>
                 <div className="relative">
                   <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                   <input 
                     type="text"
                     className={inputClassName + " pl-10"}
                     placeholder="输入名称或编码 (例如: 阿莫西林)"
                     value={searchTerm}
                     onChange={(e) => {
                       setSearchTerm(e.target.value);
                       setIsDropdownOpen(true);
                       setSelectedDrug(null); 
                     }}
                     onFocus={() => setIsDropdownOpen(true)}
                   />
                 </div>
                 
                 {/* Dropdown Results */}
                 {isDropdownOpen && searchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                       {filteredDrugs.length === 0 ? (
                         <div className="p-3 text-sm text-slate-400 text-center">未找到相关药品</div>
                       ) : (
                         filteredDrugs.map(drug => (
                           <div 
                             key={drug.id}
                             onClick={() => handleSelectDrug(drug)}
                             className="p-3 hover:bg-primary-50 cursor-pointer border-b border-slate-50 last:border-0"
                           >
                             <div className="flex justify-between items-center">
                               <span className="font-medium text-slate-800">{drug.name}</span>
                               <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{drug.code}</span>
                             </div>
                             <div className="flex justify-between text-xs text-slate-500 mt-1">
                               <span>厂商: {drug.manufacturer}</span>
                               <span className={drug.stock < 10 ? 'text-red-500 font-bold' : 'text-slate-500'}>
                                 库存: {drug.stock} | ¥{drug.price.toFixed(2)}
                               </span>
                             </div>
                           </div>
                         ))
                       )}
                    </div>
                 )}
              </div>

              {/* Quantity */}
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">数量</label>
                 <input 
                   type="number"
                   min="1"
                   className={inputClassName}
                   value={quantity}
                   onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                 />
              </div>
           </div>

           {/* Selected Info & Add Button */}
           <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex-1 text-sm text-slate-600">
                 {selectedDrug ? (
                   <div>
                     已选: <span className="font-bold text-primary-700">{selectedDrug.name}</span>
                     <span className="mx-2 text-slate-300">|</span>
                     单价: ¥{selectedDrug.price}
                     <span className="mx-2 text-slate-300">|</span>
                     小计: <span className="font-bold text-slate-800">¥{(selectedDrug.price * quantity).toFixed(2)}</span>
                   </div>
                 ) : (
                   <span className="text-slate-400">请搜索并选择药品以添加...</span>
                 )}
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={!selectedDrug}
                className="w-full sm:w-auto px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>加入清单</span>
              </button>
           </div>
           
           {/* AI Tip */}
           {aiTip && selectedDrug && (
             <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start space-x-2 text-sm text-blue-800 animate-fade-in">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p><span className="font-semibold">药师提示:</span> {aiTip}</p>
             </div>
           )}
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col h-full lg:sticky lg:top-6">
         <div className="flex items-center space-x-2 mb-6 pb-4 border-b">
           <ShoppingCart className="h-6 w-6 text-primary-600" />
           <h2 className="text-xl font-bold text-slate-800">当前订单</h2>
         </div>

         <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
           {cart.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
               <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
               <p>清单为空</p>
             </div>
           ) : (
             cart.map((item, idx) => (
               <div key={`${item.drugId}-${idx}`} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <div>
                   <p className="font-medium text-slate-800">{item.drugName}</p>
                   <p className="text-sm text-slate-500">{item.quantity} x ¥{item.priceAtSale.toFixed(2)}</p>
                 </div>
                 <div className="flex items-center space-x-3">
                   <span className="font-bold text-slate-700">¥{item.total.toFixed(2)}</span>
                   <button onClick={() => removeFromCart(item.drugId)} className="text-slate-400 hover:text-red-500 transition-colors">
                     <Trash className="h-4 w-4" />
                   </button>
                 </div>
               </div>
             ))
           )}
         </div>

         <div className="mt-6 pt-6 border-t border-dashed border-slate-300 space-y-4">
           {/* Customer Input */}
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">顾客姓名 (选填)</label>
             <div className="relative">
               <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <input 
                 type="text"
                 className={inputClassName + " pl-9 py-2 text-sm"}
                 placeholder="例如: 李雷"
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
               />
             </div>
           </div>

           <div className="flex justify-between items-center text-xl">
             <span className="font-bold text-slate-800">总计</span>
             <span className="font-bold text-emerald-600">¥{cartTotal.toFixed(2)}</span>
           </div>
           
           <button 
             onClick={handleCheckout}
             disabled={cart.length === 0}
             className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all flex justify-center items-center space-x-2"
           >
             <CheckCircle className="h-6 w-6" />
             <span>确认结账</span>
           </button>
         </div>
      </div>
    </div>
  );
};

// ==========================================
// Sub-Component: Sales History
// ==========================================

interface SalesHistoryProps {
  sales: SaleRecord[];
  drugs: Drug[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, drugs }) => {
  // Filter States
  const [filterDrugName, setFilterDrugName] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  
  // Modal State
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  // Filter Logic
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchDrug = filterDrugName 
        ? sale.items.some(item => item.drugName.toLowerCase().includes(filterDrugName.toLowerCase())) 
        : true;
      
      const matchCashier = filterCashier 
        ? sale.cashierName.toLowerCase().includes(filterCashier.toLowerCase()) 
        : true;
        
      const matchCustomer = filterCustomer
        ? (sale.customerName || '').toLowerCase().includes(filterCustomer.toLowerCase())
        : true;

      let matchDate = true;
      if (filterDateStart || filterDateEnd) {
         const saleDate = new Date(sale.timestamp).getTime();
         if (filterDateStart) matchDate = matchDate && saleDate >= new Date(filterDateStart).getTime();
         // End date needs to cover the full day, so we assume 23:59:59 implied or just compare dates
         if (filterDateEnd) {
           const endDate = new Date(filterDateEnd);
           endDate.setHours(23, 59, 59, 999);
           matchDate = matchDate && saleDate <= endDate.getTime();
         }
      }

      return matchDrug && matchCashier && matchCustomer && matchDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, filterDrugName, filterCashier, filterCustomer, filterDateStart, filterDateEnd]);

  // Lookup current stock for an item
  const getCurrentStock = (drugId: string) => {
    const drug = drugs.find(d => d.id === drugId);
    return drug ? drug.stock : 'N/A';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
      {/* Filters Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-4 md:space-y-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
             <input 
               type="text" 
               className={inputClassName + " pl-9 py-2 text-sm"}
               placeholder="按药品名称搜索..."
               value={filterDrugName}
               onChange={(e) => setFilterDrugName(e.target.value)}
             />
          </div>
          <div className="relative">
             <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
             <input 
               type="text" 
               className={inputClassName + " pl-9 py-2 text-sm"}
               placeholder="按收银员搜索..."
               value={filterCashier}
               onChange={(e) => setFilterCashier(e.target.value)}
             />
          </div>
          <div className="relative">
             <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
             <input 
               type="text" 
               className={inputClassName + " pl-9 py-2 text-sm"}
               placeholder="按顾客搜索..."
               value={filterCustomer}
               onChange={(e) => setFilterCustomer(e.target.value)}
             />
          </div>
          <div className="relative">
             <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
             <input 
               type="date" 
               className={inputClassName + " pl-9 py-2 text-sm"}
               value={filterDateStart}
               onChange={(e) => setFilterDateStart(e.target.value)}
               title="开始日期"
             />
          </div>
          <div className="relative">
             <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
             <input 
               type="date" 
               className={inputClassName + " pl-9 py-2 text-sm"}
               value={filterDateEnd}
               onChange={(e) => setFilterDateEnd(e.target.value)}
               title="结束日期"
             />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white sticky top-0 z-10 shadow-sm">
             <tr className="text-slate-500 font-medium">
               <th className="p-4 border-b">单号</th>
               <th className="p-4 border-b">时间</th>
               <th className="p-4 border-b">收银员</th>
               <th className="p-4 border-b">顾客</th>
               <th className="p-4 border-b text-center">商品数</th>
               <th className="p-4 border-b text-right">总金额</th>
               <th className="p-4 border-b text-center">操作</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {filteredSales.length === 0 ? (
               <tr>
                 <td colSpan={7} className="p-8 text-center text-slate-400">没有符合条件的销售记录</td>
               </tr>
             ) : (
               filteredSales.map(sale => (
                 <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-slate-600">{sale.id.split('-')[1]}</td>
                    <td className="p-4 text-slate-600">
                      {new Date(sale.timestamp).toLocaleDateString('zh-CN')} <span className="text-xs text-slate-400">{new Date(sale.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="p-4 text-slate-800">{sale.cashierName}</td>
                    <td className="p-4 text-slate-800">{sale.customerName || '-'}</td>
                    <td className="p-4 text-center">
                       <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                         {sale.items.length}
                       </span>
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-600">¥{sale.totalAmount.toFixed(2)}</td>
                    <td className="p-4 text-center">
                       <button 
                         onClick={() => setSelectedSale(sale)}
                         className="text-primary-600 hover:text-primary-800 hover:bg-primary-50 p-1.5 rounded transition-colors"
                         title="查看详情"
                       >
                          <FileText className="h-4 w-4" />
                       </button>
                    </td>
                 </tr>
               ))
             )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
              {/* Modal Header */}
              <div className="p-6 bg-slate-50 border-b flex justify-between items-start">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      <span>销售详情单</span>
                    </h2>
                    <p className="font-mono text-sm text-slate-500 mt-1">{selectedSale.id}</p>
                 </div>
                 <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-6 w-6" />
                 </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                 {/* Basic Info Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-slate-50 p-3 rounded-lg">
                       <p className="text-slate-500 text-xs uppercase font-bold mb-1">交易时间</p>
                       <p className="font-medium text-slate-800">{new Date(selectedSale.timestamp).toLocaleString('zh-CN')}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                       <p className="text-slate-500 text-xs uppercase font-bold mb-1">收银员</p>
                       <p className="font-medium text-slate-800">{selectedSale.cashierName}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                       <p className="text-slate-500 text-xs uppercase font-bold mb-1">顾客</p>
                       <p className="font-medium text-slate-800">{selectedSale.customerName || '散客'}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                       <p className="text-emerald-600 text-xs uppercase font-bold mb-1">总金额</p>
                       <p className="font-bold text-emerald-700 text-lg">¥{selectedSale.totalAmount.toFixed(2)}</p>
                    </div>
                 </div>

                 {/* Items List */}
                 <div>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center space-x-2">
                       <ShoppingCart className="h-4 w-4" />
                       <span>商品明细与流转追踪</span>
                    </h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                       <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500">
                             <tr>
                                <th className="p-3 border-b">药品名称</th>
                                <th className="p-3 border-b text-right">销售单价</th>
                                <th className="p-3 border-b text-right">数量</th>
                                <th className="p-3 border-b text-right">小计</th>
                                <th className="p-3 border-b text-right">当前库存</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {selectedSale.items.map((item, idx) => (
                                <tr key={idx}>
                                   <td className="p-3 font-medium text-slate-800">
                                     {item.drugName}
                                     <div className="text-xs text-slate-400 font-mono mt-0.5">{item.drugId}</div>
                                   </td>
                                   <td className="p-3 text-right text-slate-600">¥{item.priceAtSale.toFixed(2)}</td>
                                   <td className="p-3 text-right text-slate-800 font-bold">{item.quantity}</td>
                                   <td className="p-3 text-right text-slate-800">¥{item.total.toFixed(2)}</td>
                                   <td className="p-3 text-right text-slate-400 text-xs">
                                      {/* Tracking Current Stock */}
                                      {getCurrentStock(item.drugId)}
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-slate-50 flex justify-end">
                 <button 
                   onClick={() => setSelectedSale(null)}
                   className="px-6 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 font-medium rounded-lg hover:bg-slate-50"
                 >
                   关闭
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Sales;