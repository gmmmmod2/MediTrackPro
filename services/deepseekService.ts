import { Drug, SaleRecord } from "../types";

const API_BASE = '/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const analyzeInventory = async (drugs: Drug[], sales: SaleRecord[]): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'inventory',
        data: { drugs, sales }
      }),
    });
    
    const result = await response.json();
    if (!result.success) {
      return result.message || '分析失败';
    }
    return result.data;
  } catch (error) {
    console.error("AI API Error:", error);
    return "暂时无法生成 AI 分析。请检查您的网络连接。";
  }
};

export const chatWithAI = async (
  messages: ChatMessage[], 
  context: { drugs: Drug[], sales: SaleRecord[] }
): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'chat',
        data: { messages, context }
      }),
    });
    
    const result = await response.json();
    if (!result.success) {
      return result.message || '对话失败';
    }
    return result.data;
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "暂时无法回复，请稍后重试。";
  }
};

export const getDrugInfo = async (drugName: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'drugInfo',
        data: { drugName }
      }),
    });
    
    const result = await response.json();
    if (!result.success) {
      return result.message || '信息不可用';
    }
    return result.data;
  } catch (e) {
    console.error("AI API Error:", e);
    return "信息不可用。";
  }
};

