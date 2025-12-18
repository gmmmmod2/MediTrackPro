import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { getAuthUser, cors } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, message: '未授权访问' });

  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请提供药品 ID 列表' });
    }

    const locked = await prisma.drug.findMany({
      where: { id: { in: ids }, isLocked: true },
      select: { name: true },
    });

    if (locked.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `以下药品已锁定: ${locked.map(d => d.name).join(', ')}` 
      });
    }

    const result = await prisma.drug.updateMany({
      where: { id: { in: ids }, isLocked: false },
      data: { isDeleted: true, deletedAt: new Date(), deletedById: user.userId },
    });

    return res.status(200).json({ success: true, data: { count: result.count } });
  } catch (error: any) {
    console.error('Batch delete error:', error);
    return res.status(500).json({ success: false, message: '批量删除失败: ' + error.message });
  }
}
