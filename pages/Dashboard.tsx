
import React, { useState, useEffect, useRef } from 'react';
import { usePharmacy } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, AlertTriangle, Package, TrendingUp, Sparkles, Loader2, X, Send, MessageCircle, Bot, User } from 'lucide-react';
import { analyzeInventory, chatWithAI, ChatMessage } from '../services/deepseekService';

const Dashboard: React.FC = () => {
  const { drugs, sales } = usePharmacy();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // 对话相关状态
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Statistics Calculation ---
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalSalesCount = sales.length;
  const lowStockDrugs = drugs.filter(d => d.stock <= d.minStockThreshold);
  const lowStockCount = lowStockDrugs.length;
  const totalInventoryValue = drugs.reduce((acc, drug) => acc + (drug.price * drug.stock), 0);

  // Prepare chart data (Aggregate sales by Date)
  const salesByDate = sales.reduce((acc, sale) => {
    const dateKey = new Date(sale.timestamp).toLocaleDateString('zh-CN');
    acc[dateKey] = (acc[dateKey] || 0) + sale.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const salesChartData = Object.keys(salesByDate)
    .map(date => ({
      date: date,
      amount: salesByDate[date]
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);

  // Prepare inventory category data
  const categoryData: Record<string, number> = {};
  drugs.forEach(d => {
    categoryData[d.category] = (categoryData[d.category] || 0) + 1;
  });
  const barChartData = Object.keys(categoryData).map(key => ({
    name: key,
    count: categoryData[key]
  }));

  // 滚动到最新消息
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 打开对话并生成初始分析
  const handleOpenChat = async () => {
    setShowChatModal(true);
    if (chatMessages.length === 0) {
      setIsAnalyzing(true);
      const result = await analyzeInventory(drugs, sales);
      setChatMessages([{ role: 'assistant', content: `您好！我是药智通，您的药房AI助手。\n\n以下是当前运营分析：\n\n${result}\n\n请问还有什么我可以帮您的吗？` }]);
      setIsAnalyzing(false);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // 添加用户消息
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);
    
    setIsSending(true);
    try {
      const response = await chatWithAI(newMessages, { drugs, sales });
      setChatMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      setChatMessages([...newMessages, { role: 'assistant', content: '抱歉，我暂时无法回复，请稍后重试。' }]);
    }
    setIsSending(false);
  };

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 关闭对话
  const handleCloseChat = () => {
    setShowChatModal(false);
  };

  // 清空对话
  const handleClearChat = async () => {
    setChatMessages([]);
    setIsAnalyzing(true);
    const result = await analyzeInventory(drugs, sales);
    setChatMessages([{ role: 'assistant', content: `您好！我是药智通，您的药房AI助手。\n\n以下是当前运营分析：\n\n${result}\n\n请问还有什么我可以帮您的吗？` }]);
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
          onClick={handleOpenChat}
          className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          <Sparkles className="h-5 w-5" />
          <span>AI 智能运营分析</span>
        </button>
      </div>

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
          <h3 className="text-lg font-semibold text-slate-800 mb-4">近期销售趋势 (按日汇总)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b'}} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  labelFormatter={(val) => val}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '销售额']}
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
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} allowDecimals={false} />
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
          onClick={handleOpenChat}
          className="bg-violet-600 text-white p-4 rounded-full shadow-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      </div>

      {/* AI Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">药智通 AI 助手</h3>
                  <p className="text-violet-200 text-sm">智能运营分析与问答</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleClearChat}
                  className="text-violet-200 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  清空对话
                </button>
                <button 
                  onClick={handleCloseChat}
                  className="text-violet-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {isAnalyzing && chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-2" />
                    <p className="text-slate-500">正在分析运营数据...</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start space-x-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`p-2 rounded-full ${msg.role === 'user' ? 'bg-violet-600' : 'bg-slate-200'}`}>
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-violet-600 text-white rounded-tr-md' 
                          : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-md'
                      }`}>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div className="p-2 rounded-full bg-slate-200">
                      <Bot className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-white shadow-sm border border-slate-100 rounded-tl-md">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="border-t border-slate-200 p-4 bg-white">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入您的问题，例如：哪些药品需要补货？"
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  disabled={isSending || isAnalyzing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSending || isAnalyzing}
                  className="bg-violet-600 text-white p-3 rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                AI 助手基于当前药房数据提供建议，仅供参考
              </p>
            </div>
          </div>
        </div>
      )}
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
