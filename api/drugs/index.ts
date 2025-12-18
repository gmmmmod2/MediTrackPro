import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { getAuthUser, cors } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }

  // GET - 获取药品列表
  if (req.method === 'GET') {
    try {
      const includeDeleted = req.query.deleted === 'true';

      const drugs = await prisma.drug.findMany({
        where: { isDeleted: includeDeleted },
        include: {
          createdBy: { select: { name: true } },
          deletedBy: { select: { name: true } },
          history: {
            include: { changedBy: { select: { name: true } } },
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = drugs.map(drug => ({
        id: drug.id,
        code: drug.code,
        name: drug.name,
        category: drug.category,
        manufacturer: drug.manufacturer,
        price: drug.price,
        stock: drug.stock,
        minStockThreshold: drug.minStockThreshold,
        expiryDate: drug.expiryDate.toISOString().split('T')[0],
        description: drug.description,
        sideEffects: drug.sideEffects,
        isLocked: drug.isLocked,
        createdAt: drug.createdAt.toISOString(),
        createdBy: drug.createdBy?.name || '系统',
        deletedAt: drug.deletedAt?.toISOString(),
        deletedBy: drug.deletedBy?.name,
        history: drug.history.map(h => ({
          timestamp: h.timestamp.toISOString(),
          changedBy: h.changedBy.name,
          changes: h.changes,
        })),
      }));

      return res.status(200).json({ success: true, data: formatted });
    } catch (error: any) {
      console.error('Get drugs error:', error);
      return res.status(500).json({ success: false, message: '获取药品失败: ' + error.message });
    }
  }

  // POST - 添加药品
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (Array.isArray(body)) {
        const drugs = await Promise.all(
          body.map((d: any) =>
            prisma.drug.create({
              data: {
                code: d.code,
                name: d.name,
                category: d.category,
                manufacturer: d.manufacturer,
                price: parseFloat(d.price),
                stock: parseInt(d.stock),
                minStockThreshold: parseInt(d.minStockThreshold) || 10,
                expiryDate: new Date(d.expiryDate),
                description: d.description || null,
                createdById: user.userId,
              },
            })
          )
        );
        return res.status(200).json({ success: true, data: drugs, message: `添加了 ${drugs.length} 个药品` });
      }

      const { code, name, category, manufacturer, price, stock, minStockThreshold, expiryDate, description } = body;

      const existing = await prisma.drug.findUnique({ where: { code } });
      if (existing) {
        return res.status(400).json({ success: false, message: '药品编码已存在' });
      }

      const drug = await prisma.drug.create({
        data: {
          code,
          name,
          category,
          manufacturer,
          price: parseFloat(price),
          stock: parseInt(stock),
          minStockThreshold: parseInt(minStockThreshold) || 10,
          expiryDate: new Date(expiryDate),
          description: description || null,
          createdById: user.userId,
        },
      });

      return res.status(200).json({
        success: true,
        message: '药品添加成功',
        data: {
          ...drug,
          expiryDate: drug.expiryDate.toISOString().split('T')[0],
          createdAt: drug.createdAt.toISOString(),
          createdBy: user.name,
          history: [],
        },
      });
    } catch (error: any) {
      console.error('Add drug error:', error);
      return res.status(500).json({ success: false, message: '添加药品失败: ' + error.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
