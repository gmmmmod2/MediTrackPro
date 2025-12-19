import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const envCheck = {
    hasDbUrl: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
  };

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      success: false,
      message: 'DATABASE_URL 环境变量未设置',
      env: envCheck,
    });
  }

  try {
    const [userCount, drugCount, saleCount] = await Promise.all([
      prisma.user.count(),
      prisma.drug.count(),
      prisma.saleRecord.count(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'API 运行正常',
      data: {
        database: 'connected',
        users: userCount,
        drugs: drugCount,
        sales: saleCount,
        env: envCheck,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      message: '数据库连接失败',
      error: error.message,
      env: envCheck,
    });
  }
}
