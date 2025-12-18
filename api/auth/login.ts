import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma';
import { signToken, cors } from '../_lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role.toLowerCase(),
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
  }
}
