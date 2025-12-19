import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

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
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, message: '未授权访问' });

  // GET - 获取当前用户
  if (req.method === 'GET') {
    try {
      const data = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, username: true, name: true, role: true, createdAt: true },
      });

      if (!data) return res.status(404).json({ success: false, message: '用户不存在' });

      return res.status(200).json({
        success: true,
        data: { ...data, role: data.role.toLowerCase(), createdAt: data.createdAt.toISOString() },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: '获取用户失败: ' + error.message });
    }
  }

  // PUT - 更新用户
  if (req.method === 'PUT') {
    try {
      const { name, password } = req.body || {};
      const updateData: any = {};

      if (name) updateData.name = name;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: '没有要更新的字段' });
      }

      const updated = await prisma.user.update({
        where: { id: user.userId },
        data: updateData,
        select: { id: true, username: true, name: true, role: true },
      });

      return res.status(200).json({
        success: true,
        message: '更新成功',
        data: { ...updated, role: updated.role.toLowerCase() },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: '更新失败: ' + error.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
