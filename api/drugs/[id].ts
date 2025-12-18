import { prisma } from '../_lib/prisma';
import { getAuthUser, jsonResponse, errorResponse, successResponse } from '../_lib/auth';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return jsonResponse({});
  }

  // 验证用户身份
  const user = await getAuthUser(request);
  if (!user) {
    return errorResponse('未授权访问', 401);
  }

  // 从 URL 获取药品 ID
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const drugId = pathParts[pathParts.length - 1];

  if (!drugId) {
    return errorResponse('缺少药品 ID');
  }

  // GET - 获取单个药品详情
  if (request.method === 'GET') {
    try {
      const drug = await prisma.drug.findUnique({
        where: { id: drugId },
        include: {
          createdBy: { select: { name: true } },
          deletedBy: { select: { name: true } },
          history: {
            include: { changedBy: { select: { name: true } } },
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      if (!drug) {
        return errorResponse('药品不存在', 404);
      }

      return successResponse({
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
        history: drug.history.map(log => ({
          timestamp: log.timestamp.toISOString(),
          changedBy: log.changedBy.name,
          changes: log.changes as any[],
        })),
      });
    } catch (error) {
      console.error('Get drug error:', error);
      return errorResponse('获取药品详情失败', 500);
    }
  }

  // PUT - 更新药品
  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const { action } = body;

      // 处理特殊操作
      if (action === 'toggleLock') {
        // 切换锁定状态（仅管理员）
        if (user.role !== 'ADMIN') {
          return errorResponse('只有管理员可以更改锁定状态', 403);
        }

        const drug = await prisma.drug.findUnique({ where: { id: drugId } });
        if (!drug) {
          return errorResponse('药品不存在', 404);
        }

        const updated = await prisma.drug.update({
          where: { id: drugId },
          data: { isLocked: !drug.isLocked },
        });

        return successResponse({ isLocked: updated.isLocked }, updated.isLocked ? '已锁定' : '已解锁');
      }

      if (action === 'restore') {
        // 从回收站恢复
        const updated = await prisma.drug.update({
          where: { id: drugId },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedById: null,
          },
        });

        return successResponse({ id: updated.id }, '药品已恢复');
      }

      // 普通更新 - 记录修改历史
      const originalDrug = await prisma.drug.findUnique({ where: { id: drugId } });
      if (!originalDrug) {
        return errorResponse('药品不存在', 404);
      }

      // 计算变更字段
      const changes: any[] = [];
      const fieldsToCheck = ['name', 'code', 'category', 'manufacturer', 'price', 'stock', 'minStockThreshold', 'expiryDate', 'description', 'sideEffects'];
      
      fieldsToCheck.forEach(field => {
        let oldValue = (originalDrug as any)[field];
        let newValue = body[field];

        // 处理日期比较
        if (field === 'expiryDate') {
          oldValue = originalDrug.expiryDate.toISOString().split('T')[0];
          newValue = body.expiryDate;
        }

        if (oldValue !== newValue && newValue !== undefined) {
          changes.push({ field, oldValue, newValue });
        }
      });

      // 准备更新数据
      const updateData: any = {
        name: body.name,
        code: body.code,
        category: body.category,
        manufacturer: body.manufacturer,
        price: parseFloat(body.price),
        stock: parseInt(body.stock),
        minStockThreshold: parseInt(body.minStockThreshold),
        description: body.description || null,
        sideEffects: body.sideEffects || null,
      };

      if (body.expiryDate) {
        updateData.expiryDate = new Date(body.expiryDate);
      }

      // 更新药品
      const updated = await prisma.drug.update({
        where: { id: drugId },
        data: updateData,
      });

      // 如果有变更，记录历史
      if (changes.length > 0) {
        await prisma.modificationLog.create({
          data: {
            drugId: drugId,
            changedById: user.userId,
            changes: changes,
          },
        });
      }

      return successResponse({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        category: updated.category,
        manufacturer: updated.manufacturer,
        price: updated.price,
        stock: updated.stock,
        minStockThreshold: updated.minStockThreshold,
        expiryDate: updated.expiryDate.toISOString().split('T')[0],
        description: updated.description,
        sideEffects: updated.sideEffects,
        isLocked: updated.isLocked,
      }, '药品信息更新成功');

    } catch (error) {
      console.error('Update drug error:', error);
      return errorResponse('更新药品失败', 500);
    }
  }

  // DELETE - 删除药品
  if (request.method === 'DELETE') {
    try {
      const url = new URL(request.url);
      const permanent = url.searchParams.get('permanent') === 'true';

      const drug = await prisma.drug.findUnique({ where: { id: drugId } });
      if (!drug) {
        return errorResponse('药品不存在', 404);
      }

      // 检查锁定状态
      if (drug.isLocked && !permanent) {
        return errorResponse('该药品已锁定，无法删除', 403);
      }

      if (permanent) {
        // 彻底删除（仅管理员）
        if (user.role !== 'ADMIN') {
          return errorResponse('只有管理员可以彻底删除药品', 403);
        }

        await prisma.drug.delete({ where: { id: drugId } });
        return successResponse(null, '药品已彻底删除');
      } else {
        // 软删除 - 移入回收站
        await prisma.drug.update({
          where: { id: drugId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedById: user.userId,
          },
        });

        return successResponse(null, '药品已移至回收站');
      }

    } catch (error) {
      console.error('Delete drug error:', error);
      return errorResponse('删除药品失败', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
