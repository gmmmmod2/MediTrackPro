import { prisma } from '../_lib/prisma';
import { getAuthUser, jsonResponse, errorResponse, successResponse } from '../_lib/auth';

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

  // GET - 获取销售记录
  if (request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const sales = await prisma.saleRecord.findMany({
        include: {
          cashier: {
            select: { name: true },
          },
          items: {
            include: {
              drug: {
                select: { name: true, code: true },
              },
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      // 转换为前端期望的格式
      const formattedSales = sales.map(sale => ({
        id: sale.id,
        timestamp: sale.timestamp.toISOString(),
        totalAmount: sale.totalAmount,
        cashierName: sale.cashier.name,
        customerName: sale.customerName,
        items: sale.items.map(item => ({
          drugId: item.drugId,
          drugName: item.drug.name,
          quantity: item.quantity,
          priceAtSale: item.priceAtSale,
          total: item.total,
        })),
      }));

      return successResponse(formattedSales);
    } catch (error) {
      console.error('Get sales error:', error);
      return errorResponse('获取销售记录失败', 500);
    }
  }

  // POST - 创建销售记录
  if (request.method === 'POST') {
    try {
      const { items, customerName } = await request.json();

      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse('购物车不能为空');
      }

      // 验证库存并计算总额
      let totalAmount = 0;
      const validatedItems: any[] = [];

      for (const item of items) {
        const drug = await prisma.drug.findUnique({
          where: { id: item.drugId },
        });

        if (!drug) {
          return errorResponse(`药品不存在: ${item.drugId}`);
        }

        if (drug.stock < item.quantity) {
          return errorResponse(`${drug.name} 库存不足，仅剩 ${drug.stock} 件`);
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

      // 创建事务：同时创建销售记录和更新库存
      const sale = await prisma.$transaction(async (tx) => {
        // 1. 创建销售记录
        const saleRecord = await tx.saleRecord.create({
          data: {
            totalAmount,
            customerName: customerName || '散客',
            cashierId: user.userId,
            items: {
              create: validatedItems.map(item => ({
                drugId: item.drugId,
                quantity: item.quantity,
                priceAtSale: item.priceAtSale,
                total: item.total,
              })),
            },
          },
          include: {
            items: true,
            cashier: { select: { name: true } },
          },
        });

        // 2. 更新库存
        for (const item of validatedItems) {
          await tx.drug.update({
            where: { id: item.drugId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }

        return saleRecord;
      });

      return successResponse({
        id: sale.id,
        timestamp: sale.timestamp.toISOString(),
        totalAmount: sale.totalAmount,
        cashierName: sale.cashier.name,
        customerName: sale.customerName,
        items: validatedItems,
      }, '销售录入成功');

    } catch (error) {
      console.error('Create sale error:', error);
      return errorResponse('销售录入失败', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
