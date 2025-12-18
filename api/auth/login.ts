import { prisma } from '../_lib/prisma';
import { signToken, jsonResponse, errorResponse, successResponse } from '../_lib/auth';
import bcrypt from 'bcryptjs';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return jsonResponse({});
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return errorResponse('用户名和密码不能为空');
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return errorResponse('用户名或密码错误', 401);
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return errorResponse('用户名或密码错误', 401);
    }

    // 生成 JWT
    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    return successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role.toLowerCase(),
      },
    }, '登录成功');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('服务器错误', 500);
  }
}
