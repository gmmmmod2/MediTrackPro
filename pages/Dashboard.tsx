
import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, AlertTriangle, Package, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { analyzeInventory } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { drugs, sales } = usePharmacy();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Statistics Calculation ---
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalSalesCount = sales.length;
  const lowStockDrugs = drugs.filter(d => d.stock <= d.minStockThreshold);
  const lowStockCount = lowStockDrugs.length;
  const totalInventoryValue = drugs.reduce((acc, drug) => acc + (drug.price * drug.stock), 0);

  // Prepare chart data (Sales over last 7 entries for simplicity)
  const salesChartData = sales.slice(0, 7).reverse().map(s => ({
    name: new Date(s.timestamp).toLocaleDateString('zh-CN', { weekday: 'short' }),
    amount: s.totalAmount
  }));

  // Prepare inventory category data
  const categoryData: Record<string, number> = {};
  drugs.forEach(d => {
    categoryData[d.category] = (categoryData[d.category] || 0) + 1;
  });
  const barChartData = Object.keys(categoryData).map(key => ({
    name: key,
    count: categoryData[key]
  }));

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeInventory(drugs, sales);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 mt-1">药房运营表现与库存健康概览。</p>
        </div>
        <button 
          onClick={handleAiAnalysis}
          disabled={isAnalyzing}
          className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
        >
          {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          <span>{isAnalyzing ? '分析中...' : 'AI 智能运营分析'}</span>
        </button>
      </div>

      {/* AI Analysis Result Card */}
      {aiAnalysis && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-6 shadow-sm animate-fade-in">
           <div className="flex items-center space-x-2 mb-4 text-violet-700">
             <Sparkles className="h-5 w-5" />
             <h3 className="font-semibold text-lg">AI 战略摘要</h3>
           </div>
           <div className="prose prose-violet max-w-none text-slate-700">
             <ul className="list-disc pl-5 space-y-2">
               {aiAnalysis.split('\n').filter(line => line.trim().length > 0).map((line, idx) => (
                 <li key={idx} className="leading-relaxed">{line.replace(/^- /, '')}</li>
               ))}
             </ul>
           </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="总营收" 
          value={`¥${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard 
          title="总销售笔数" 
          value={totalSalesCount}
          icon={TrendingUp}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="库存预警" 
          value={lowStockCount}
          icon={AlertTriangle}
          color="bg-amber-100 text-amber-600"
          highlight={lowStockCount > 0}
        />
        <StatCard 
          title="药品总数" 
          value={drugs.length}
          icon={Package}
          color="bg-slate-100 text-slate-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">近期销售趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">库存分类分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
       {/* Mobile AI Button (Sticky) */}
       <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button 
           onClick={handleAiAnalysis}
           className="bg-violet-600 text-white p-4 rounded-full shadow-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
        >
          {isAnalyzing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
        </button>
      </div>

    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string; highlight?: boolean }> = ({ title, value, icon: Icon, color, highlight }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border ${highlight ? 'border-amber-200 ring-2 ring-amber-100' : 'border-slate-100'} transition-transform hover:-translate-y-1`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

export default Dashboard;
