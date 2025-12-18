import { prisma } from '../_lib/prisma';
import { getAuthUser, jsonResponse, errorResponse, successResponse } from '../_lib/auth';
import bcrypt from 'bcryptjs';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return jsonResponse({});
  }

  const user = await getAuthUser(request);
  if (!user) {
    return errorResponse('未授权访问', 401);
  }

  // GET - 获取当前用户信息
  if (request.method === 'GET') {
    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (!userData) {
        return errorResponse('用户不存在', 404);
      }

      return successResponse({
        id: userData.id,
        username: userData.username,
        name: userData.name,
        role: userData.role.toLowerCase(),
        createdAt: userData.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Get user error:', error);
      return errorResponse('获取用户信息失败', 500);
    }
  }

  // PUT - 更新用户信息
  if (request.method === 'PUT') {
    try {
      const { name, password } = await request.json();

      const updateData: any = {};

      if (name) {
        updateData.name = name;
      }

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(updateData).length === 0) {
        return errorResponse('没有要更新的字段');
      }

      const updated = await prisma.user.update({
        where: { id: user.userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      });

      return successResponse({
        id: updated.id,
        username: updated.username,
        name: updated.name,
        role: updated.role.toLowerCase(),
      }, '用户信息更新成功');

    } catch (error) {
      console.error('Update user error:', error);
      return errorResponse('更新用户信息失败', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
