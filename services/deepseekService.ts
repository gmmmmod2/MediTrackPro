import OpenAI from "openai";
import { Drug, SaleRecord } from "../types";

// Initialize DeepSeek Client (使用 OpenAI SDK)
const apiKey = process.env.DEEPSEEK_API_KEY || '';
let aiClient: OpenAI | null = null;

try {
  if (apiKey) {
    aiClient = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey,
    });
  }
} catch (error) {
  console.error("Failed to initialize DeepSeek client", error);
}

export const analyzeInventory = async (drugs: Drug[], sales: SaleRecord[]): Promise<string> => {
  if (!aiClient) return "AI 服务未配置 (缺少 DEEPSEEK_API_KEY)。";

  const lowStock = drugs.filter(d => d.stock <= d.minStockThreshold).map(d => `${d.name} (剩余 ${d.stock})`);
  const recentSales = sales.slice(0, 10);
  
  const prompt = `
    你是一个专业的药房库存分析师。
    以下是当前的运营数据：
    
    库存预警商品: ${lowStock.join(', ') || '无'}
    药品总数: ${drugs.length}
    近期交易笔数: ${recentSales.length}

    请提供一份简明的中文战略摘要（不超过 150 字），重点关注：
    1. 紧急补货建议。
    2. 基于缺货商品的潜在销售趋势（例如：如果抗生素缺货，是否是流感季节？）。
    3. 给药剂师的一条效率提升建议。
    
    请不要使用 markdown 格式（如粗体或斜体），直接使用纯文本列表。
  `;

  try {
    const completion = await aiClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个专业的药房库存分析师，请用中文回答。" },
        { role: "user", content: prompt }
      ],
    });
    return completion.choices[0]?.message?.content || "未生成分析结果。";
  } catch (error) {
    console.error("DeepSeek API Error:", error);
    return "暂时无法生成 AI 分析。请检查您的网络连接。";
  }
};

export const getDrugInfo = async (drugName: string): Promise<string> => {
  if (!aiClient) return "AI 服务不可用。";

  const prompt = `请用中文简要总结（最多2句话）${drugName} 的主要用途和一个常见副作用。保持专业语气。`;

  try {
    const completion = await aiClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个专业的药剂师助手，请用中文回答。" },
        { role: "user", content: prompt }
      ],
    });
    return completion.choices[0]?.message?.content || "信息不可用。";
  } catch (e) {
    console.error("DeepSeek API Error:", e);
    return "信息不可用。";
  }
};
