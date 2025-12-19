import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: 'DEEPSEEK_API_KEY 未配置' });
  }

  try {
    const { type, data } = req.body || {};
    
    const client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey,
    });

    // 多轮对话
    if (type === 'chat') {
      const { messages = [], context = {} } = data || {};
      const { drugs = [], sales = [] } = context;
      
      const lowStock = drugs.filter((d: any) => d.stock <= d.minStockThreshold).map((d: any) => `${d.name} (剩余 ${d.stock})`);
      
      const systemPrompt = `你是一个专业的药房运营AI助手，名叫"药智通"。你负责帮助药房管理者分析库存、销售数据，并提供专业建议。

当前药房数据概况：
- 药品总数: ${drugs.length}
- 库存预警商品: ${lowStock.length > 0 ? lowStock.join(', ') : '无'}
- 近期交易笔数: ${sales.length}
- 总库存价值: ¥${drugs.reduce((acc: number, d: any) => acc + (d.price * d.stock), 0).toFixed(2)}

请基于以上数据回答用户问题。回答要求：
1. 用中文回答，语气专业友好
2. 回答简洁明了，不超过200字
3. 如果涉及具体药品建议，请基于实际数据
4. 不要使用 markdown 格式`;

      const completion = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
      });

      const result = completion.choices[0]?.message?.content || '抱歉，我无法回答这个问题。';
      return res.status(200).json({ success: true, data: result });
    }

    // 库存分析（首次分析）
    if (type === 'inventory') {
      const { drugs = [], sales = [] } = data || {};
      const lowStock = drugs.filter((d: any) => d.stock <= d.minStockThreshold).map((d: any) => `${d.name} (剩余 ${d.stock})`);
      
      const systemPrompt = '你是一个专业的药房库存分析师，请用中文回答。';
      const prompt = `
        你是一个专业的药房库存分析师。
        以下是当前的运营数据：
        
        库存预警商品: ${lowStock.join(', ') || '无'}
        药品总数: ${drugs.length}
        近期交易笔数: ${sales.length}

        请提供一份简明的中文战略摘要（不超过 150 字），重点关注：
        1. 紧急补货建议。
        2. 基于缺货商品的潜在销售趋势（例如：如果抗生素缺货，是否是流感季节？）。
        3. 给药剂师的一条效率提升建议。
        
        请不要使用 markdown 格式（如粗体或斜体），直接使用纯文本列表。
      `;

      const completion = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      });

      const result = completion.choices[0]?.message?.content || '未生成分析结果';
      return res.status(200).json({ success: true, data: result });
    }
    
    // 药品信息查询
    if (type === 'drugInfo') {
      const { drugName } = data || {};
      const systemPrompt = '你是一个专业的药剂师助手，请用中文回答。';
      const prompt = `请用中文简要总结（最多2句话）${drugName} 的主要用途和一个常见副作用。保持专业语气。`;

      const completion = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      });

      const result = completion.choices[0]?.message?.content || '信息不可用';
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(400).json({ success: false, message: '无效的请求类型' });

  } catch (error: any) {
    console.error('DeepSeek API Error:', error);
    return res.status(500).json({ success: false, message: 'AI 服务错误: ' + error.message });
  }
}
