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
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, message: '未授权访问' });

  // GET - 获取销售记录
  if (req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const sales = await prisma.saleRecord.findMany({
        include: {
          cashier: { select: { name: true } },
          items: { include: { drug: { select: { name: true } } } },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      const formatted = sales.map(s => ({
        id: s.id,
        timestamp: s.timestamp.toISOString(),
        totalAmount: s.totalAmount,
        cashierName: s.cashier.name,
        customerName: s.customerName,
        items: s.items.map(i => ({
          drugId: i.drugId,
          drugName: i.drug.name,
          quantity: i.quantity,
          priceAtSale: i.priceAtSale,
          total: i.total,
        })),
      }));

      return res.status(200).json({ success: true, data: formatted });
    } catch (error: any) {
      console.error('Get sales error:', error);
      return res.status(500).json({ success: false, message: '获取销售记录失败: ' + error.message });
    }
  }

  // POST - 创建销售
  if (req.method === 'POST') {
    try {
      const { items, customerName } = req.body || {};

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: '购物车不能为空' });
      }

      let totalAmount = 0;
      const validatedItems: any[] = [];

      for (const item of items) {
        const drug = await prisma.drug.findUnique({ where: { id: item.drugId } });
        if (!drug) return res.status(400).json({ success: false, message: `药品不存在: ${item.drugId}` });
        if (drug.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `${drug.name} 库存不足` });
        }

        const itemTotal = drug.price * item.quantity;
        totalAmount += itemTotal;
        validatedItems.push({
          drugId: drug.id,
          drugName: drug.name,
          quantity: item.quantity,
          priceAtSale: drug.price,
          total: itemTotal,
        });
      }

      const sale = await prisma.$transaction(async (tx) => {
        const record = await tx.saleRecord.create({
          data: {
            totalAmount,
            customerName: customerName || '散客',
            cashierId: user.userId,
            items: {
              create: validatedItems.map(i => ({
                drugId: i.drugId,
                quantity: i.quantity,
                priceAtSale: i.priceAtSale,
                total: i.total,
              })),
            },
          },
          include: { cashier: { select: { name: true } } },
        });

        for (const item of validatedItems) {
          await tx.drug.update({
            where: { id: item.drugId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        return record;
      });

      return res.status(200).json({
        success: true,
        message: '销售录入成功',
        data: {
          id: sale.id,
          timestamp: sale.timestamp.toISOString(),
          totalAmount: sale.totalAmount,
          cashierName: sale.cashier.name,
          customerName: sale.customerName,
          items: validatedItems,
        },
      });
    } catch (error: any) {
      console.error('Create sale error:', error);
      return res.status(500).json({ success: false, message: '销售录入失败: ' + error.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
