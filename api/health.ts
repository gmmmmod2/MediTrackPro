import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './_lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

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
        env: {
          hasDbUrl: !!process.env.DATABASE_URL,
          hasJwtSecret: !!process.env.JWT_SECRET,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      message: '数据库连接失败',
      error: error.message,
    });
  }
}
