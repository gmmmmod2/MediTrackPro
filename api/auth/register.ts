import { prisma } from '../_lib/prisma';
import { jsonResponse, errorResponse, successResponse } from '../_lib/auth';
import bcrypt from 'bcryptjs';

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

  try {
    const { username, password, name, role } = await request.json();

    // 验证必填字段
    if (!username || !password || !name) {
      return errorResponse('用户名、密码和姓名不能为空');
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return errorResponse('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: role === 'admin' ? 'ADMIN' : 'PHARMACIST',
      },
    });

    return successResponse({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role.toLowerCase(),
    }, '注册成功');

  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('服务器错误', 500);
  }
}
