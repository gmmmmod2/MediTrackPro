import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

const getJwtSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me');

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function getAuthUser(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(authHeader.substring(7), getJwtSecret());
    return payload as any;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }

  const { id } = req.query;
  const drugId = Array.isArray(id) ? id[0] : id;

  if (!drugId) {
    return res.status(400).json({ success: false, message: '缺少药品 ID' });
  }

  // PUT - 更新药品
  if (req.method === 'PUT') {
    try {
      const body = req.body || {};

      if (body.action === 'toggleLock') {
        if (user.role !== 'ADMIN') {
          return res.status(403).json({ success: false, message: '只有管理员可以更改锁定状态' });
        }
        const drug = await prisma.drug.findUnique({ where: { id: drugId } });
        if (!drug) return res.status(404).json({ success: false, message: '药品不存在' });

        const updated = await prisma.drug.update({
          where: { id: drugId },
          data: { isLocked: !drug.isLocked },
        });
        return res.status(200).json({ success: true, data: { isLocked: updated.isLocked } });
      }

      if (body.action === 'restore') {
        await prisma.drug.update({
          where: { id: drugId },
          data: { isDeleted: false, deletedAt: null, deletedById: null },
        });
        return res.status(200).json({ success: true, message: '药品已恢复' });
      }

      // 普通更新
      const original = await prisma.drug.findUnique({ where: { id: drugId } });
      if (!original) return res.status(404).json({ success: false, message: '药品不存在' });

      const changes: any[] = [];
      ['name', 'code', 'category', 'manufacturer', 'price', 'stock', 'minStockThreshold', 'description'].forEach(f => {
        if (body[f] !== undefined && (original as any)[f] !== body[f]) {
          changes.push({ field: f, oldValue: (original as any)[f], newValue: body[f] });
        }
      });

      const updated = await prisma.drug.update({
        where: { id: drugId },
        data: {
          name: body.name,
          code: body.code,
          category: body.category,
          manufacturer: body.manufacturer,
          price: parseFloat(body.price),
          stock: parseInt(body.stock),
          minStockThreshold: parseInt(body.minStockThreshold),
          description: body.description || null,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        },
      });

      if (changes.length > 0) {
        await prisma.modificationLog.create({
          data: { drugId, changedById: user.userId, changes },
        });
      }

      return res.status(200).json({ success: true, message: '更新成功', data: updated });
    } catch (error: any) {
      console.error('Update drug error:', error);
      return res.status(500).json({ success: false, message: '更新失败: ' + error.message });
    }
  }

  // DELETE - 删除药品
  if (req.method === 'DELETE') {
    try {
      const permanent = req.query.permanent === 'true';
      const drug = await prisma.drug.findUnique({ where: { id: drugId } });
      
      if (!drug) return res.status(404).json({ success: false, message: '药品不存在' });
      if (drug.isLocked && !permanent) {
        return res.status(403).json({ success: false, message: '药品已锁定，无法删除' });
      }

      if (permanent) {
        if (user.role !== 'ADMIN') {
          return res.status(403).json({ success: false, message: '只有管理员可以彻底删除' });
        }
        await prisma.drug.delete({ where: { id: drugId } });
        return res.status(200).json({ success: true, message: '已彻底删除' });
      }

      await prisma.drug.update({
        where: { id: drugId },
        data: { isDeleted: true, deletedAt: new Date(), deletedById: user.userId },
      });
      return res.status(200).json({ success: true, message: '已移至回收站' });
    } catch (error: any) {
      console.error('Delete drug error:', error);
      return res.status(500).json({ success: false, message: '删除失败: ' + error.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
