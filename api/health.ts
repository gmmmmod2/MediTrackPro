import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 首先检查环境变量
  const envCheck = {
    hasDbUrl: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
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
    // 动态导入 prisma 以便捕获导入错误
    const { prisma } = await import('./_lib/prisma');
    
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      env: envCheck,
    });
  }
}
