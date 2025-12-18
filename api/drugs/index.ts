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

  // GET - 获取药品列表
  if (request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const includeDeleted = url.searchParams.get('deleted') === 'true';

      const drugs = await prisma.drug.findMany({
        where: {
          isDeleted: includeDeleted,
        },
        include: {
          createdBy: {
            select: { name: true },
          },
          deletedBy: {
            select: { name: true },
          },
          history: {
            include: {
              changedBy: {
                select: { name: true },
              },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 转换为前端期望的格式
      const formattedDrugs = drugs.map(drug => ({
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
      }));

      return successResponse(formattedDrugs);
    } catch (error) {
      console.error('Get drugs error:', error);
      return errorResponse('获取药品列表失败', 500);
    }
  }

  // POST - 添加药品
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      
      // 检查是否是批量导入
      if (Array.isArray(body)) {
        // 批量添加
        const drugs = await Promise.all(
          body.map(async (drugData: any) => {
            return prisma.drug.create({
              data: {
                code: drugData.code,
                name: drugData.name,
                category: drugData.category,
                manufacturer: drugData.manufacturer,
                price: parseFloat(drugData.price),
                stock: parseInt(drugData.stock),
                minStockThreshold: parseInt(drugData.minStockThreshold) || 10,
                expiryDate: new Date(drugData.expiryDate),
                description: drugData.description || null,
                sideEffects: drugData.sideEffects || null,
                isLocked: drugData.isLocked || false,
                createdById: user.userId,
              },
            });
          })
        );

        return successResponse(drugs, `成功添加 ${drugs.length} 个药品`);
      }

      // 单个添加
      const { code, name, category, manufacturer, price, stock, minStockThreshold, expiryDate, description, sideEffects, isLocked } = body;

      // 检查编码是否已存在
      const existing = await prisma.drug.findUnique({ where: { code } });
      if (existing) {
        return errorResponse('药品编码已存在');
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
          sideEffects: sideEffects || null,
          isLocked: isLocked || false,
          createdById: user.userId,
        },
      });

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
        isLocked: drug.isLocked,
        createdAt: drug.createdAt.toISOString(),
        createdBy: user.name,
        history: [],
      }, '药品添加成功');

    } catch (error) {
      console.error('Add drug error:', error);
      return errorResponse('添加药品失败', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
