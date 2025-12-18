import { prisma } from '../_lib/prisma';
import { getAuthUser, jsonResponse, errorResponse, successResponse } from '../_lib/auth';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return jsonResponse({});
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const user = await getAuthUser(request);
  if (!user) {
    return errorResponse('未授权访问', 401);
  }

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse('请提供要删除的药品 ID 列表');
    }

    // 检查是否有锁定的药品
    const drugs = await prisma.drug.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, isLocked: true },
    });

    const lockedDrugs = drugs.filter(d => d.isLocked);
    if (lockedDrugs.length > 0) {
      return errorResponse(`以下药品已锁定，无法删除: ${lockedDrugs.map(d => d.name).join(', ')}`);
    }

    // 批量软删除
    const result = await prisma.drug.updateMany({
      where: { 
        id: { in: ids },
        isLocked: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: user.userId,
      },
    });

    return successResponse({ count: result.count }, `成功删除 ${result.count} 个药品`);

  } catch (error) {
    console.error('Batch delete error:', error);
    return errorResponse('批量删除失败', 500);
  }
}
