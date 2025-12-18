/**
 * Prisma 种子文件
 * 
 * 用于初始化数据库的默认数据
 * 运行: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充初始数据...');

  // 1. 创建默认用户
  const adminPassword = await bcrypt.hash('password', 10);
  const pharmacistPassword = await bcrypt.hash('password', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: '系统管理员',
      role: 'ADMIN',
    },
  });

  const pharmacist = await prisma.user.upsert({
    where: { username: 'pharm' },
    update: {},
    create: {
      username: 'pharm',
      password: pharmacistPassword,
      name: '李药师',
      role: 'PHARMACIST',
    },
  });

  console.log('✅ 用户创建完成:', { admin: admin.username, pharmacist: pharmacist.username });

  // 2. 创建初始药品数据
  const initialDrugs = [
    // 抗生素与消炎
    { code: 'D001', name: '阿莫西林胶囊', category: '抗生素', manufacturer: '华北制药', price: 12.50, stock: 150, minStockThreshold: 50, expiryDate: new Date('2025-12-31'), description: '广谱半合成青霉素。', isLocked: true },
    { code: 'D002', name: '头孢拉定胶囊', category: '抗生素', manufacturer: '白云山制药', price: 22.00, stock: 80, minStockThreshold: 30, expiryDate: new Date('2025-06-30'), description: '适用于敏感菌所致的急性咽炎、扁桃体炎。' },
    { code: 'D003', name: '罗红霉素分散片', category: '抗生素', manufacturer: '扬子江药业', price: 18.50, stock: 60, minStockThreshold: 20, expiryDate: new Date('2024-11-20'), description: '大环内酯类抗生素。' },
    { code: 'D004', name: '诺氟沙星胶囊', category: '抗生素', manufacturer: '修正药业', price: 10.00, stock: 120, minStockThreshold: 40, expiryDate: new Date('2025-08-15'), description: '适用于敏感菌所致的尿路感染、淋病。' },
    { code: 'D005', name: '人工牛黄甲硝唑', category: '牙科用药', manufacturer: '康恩贝', price: 8.50, stock: 200, minStockThreshold: 50, expiryDate: new Date('2026-01-10'), description: '用于急性智齿冠周炎、局部牙槽脓肿。' },

    // 感冒与呼吸系统
    { code: 'D006', name: '感冒灵颗粒', category: '感冒药', manufacturer: '华润三九', price: 15.50, stock: 300, minStockThreshold: 50, expiryDate: new Date('2025-05-20'), description: '解热镇痛。用于感冒引起的头痛，发热。' },
    { code: 'D007', name: '连花清瘟胶囊', category: '感冒药', manufacturer: '以岭药业', price: 24.00, stock: 45, minStockThreshold: 100, expiryDate: new Date('2025-09-01'), description: '清瘟解毒，宣肺泄热。' },
    { code: 'D008', name: '复方氨酚烷胺片', category: '感冒药', manufacturer: '葵花药业', price: 11.00, stock: 150, minStockThreshold: 30, expiryDate: new Date('2025-12-12'), description: '用于缓解普通感冒及流行性感冒引起的发热、头痛。' },
    { code: 'D009', name: '京都念慈菴蜜炼川贝枇杷膏', category: '止咳药', manufacturer: '京都念慈菴', price: 35.00, stock: 90, minStockThreshold: 20, expiryDate: new Date('2026-03-15'), description: '润肺化痰、止咳平喘。' },
    { code: 'D010', name: '盐酸氨溴索口服溶液', category: '止咳药', manufacturer: '勃林格殷格翰', price: 28.50, stock: 65, minStockThreshold: 15, expiryDate: new Date('2025-07-20'), description: '适用于痰液粘稠而不易咳出者。' },

    // 止痛与骨科
    { code: 'D011', name: '布洛芬缓释胶囊', category: '止痛药', manufacturer: '芬必得', price: 18.00, stock: 45, minStockThreshold: 100, expiryDate: new Date('2024-11-30'), description: '用于缓解轻至中度疼痛。' },
    { code: 'D012', name: '对乙酰氨基酚片', category: '止痛药', manufacturer: '必理通', price: 14.50, stock: 180, minStockThreshold: 40, expiryDate: new Date('2025-10-10'), description: '用于普通感冒或流行性感冒引起的发热。' },
    { code: 'D013', name: '云南白药气雾剂', category: '跌打损伤', manufacturer: '云南白药', price: 42.00, stock: 55, minStockThreshold: 15, expiryDate: new Date('2026-02-28'), description: '活血散瘀，消肿止痛。' },
    { code: 'D014', name: '双氯芬酸二乙胺乳胶剂', category: '跌打损伤', manufacturer: '扶他林', price: 32.00, stock: 70, minStockThreshold: 20, expiryDate: new Date('2025-06-15'), description: '用于缓解肌肉、软组织和关节的轻至中度疼痛。' },
    { code: 'D015', name: '麝香壮骨膏', category: '跌打损伤', manufacturer: '羚锐制药', price: 12.00, stock: 200, minStockThreshold: 50, expiryDate: new Date('2025-12-01'), description: '镇痛，消炎。用于风湿痛，关节痛。' },

    // 慢性病与心血管
    { code: 'D016', name: '硝苯地平控释片', category: '心血管', manufacturer: '拜耳医药', price: 38.00, stock: 100, minStockThreshold: 30, expiryDate: new Date('2026-05-10'), description: '治疗高血压、冠心病。' },
    { code: 'D017', name: '苯磺酸氨氯地平片', category: '心血管', manufacturer: '辉瑞制药', price: 45.00, stock: 95, minStockThreshold: 25, expiryDate: new Date('2026-04-20'), description: '高血压、慢性稳定性心绞痛。' },
    { code: 'D018', name: '阿司匹林肠溶片', category: '心血管', manufacturer: '拜耳医药', price: 16.00, stock: 150, minStockThreshold: 40, expiryDate: new Date('2025-11-30'), description: '抑制血小板聚集。' },
    { code: 'D019', name: '二甲双胍片', category: '糖尿病', manufacturer: '格华止', price: 25.00, stock: 130, minStockThreshold: 40, expiryDate: new Date('2025-10-15'), description: '首选的2型糖尿病治疗药物。' },
    { code: 'D020', name: '阿托伐他汀钙片', category: '心血管', manufacturer: '立普妥', price: 55.00, stock: 80, minStockThreshold: 20, expiryDate: new Date('2026-01-01'), description: '降低总胆固醇。' },

    // 消化系统
    { code: 'D021', name: '健胃消食片', category: '消化系统', manufacturer: '江中药业', price: 9.90, stock: 300, minStockThreshold: 60, expiryDate: new Date('2025-08-08'), description: '健胃消食。用于脾胃虚弱所致的食积。' },
    { code: 'D022', name: '奥美拉唑肠溶胶囊', category: '消化系统', manufacturer: '修正药业', price: 19.50, stock: 110, minStockThreshold: 30, expiryDate: new Date('2025-09-20'), description: '用于胃溃疡、十二指肠溃疡。' },
    { code: 'D023', name: '蒙脱石散', category: '消化系统', manufacturer: '思密达', price: 15.00, stock: 140, minStockThreshold: 40, expiryDate: new Date('2026-02-15'), description: '用于成人及儿童急、慢性腹泻。' },
    { code: 'D024', name: '开塞露', category: '消化系统', manufacturer: '广东一力', price: 2.50, stock: 400, minStockThreshold: 50, expiryDate: new Date('2027-01-01'), description: '用于便秘。' },
    { code: 'D025', name: '多潘立酮片', category: '消化系统', manufacturer: '吗丁啉', price: 21.00, stock: 90, minStockThreshold: 20, expiryDate: new Date('2025-12-25'), description: '用于消化不良、腹胀。' },

    // 皮肤与维生素
    { code: 'D026', name: '氯雷他定片', category: '过敏/皮肤', manufacturer: '开瑞坦', price: 26.00, stock: 100, minStockThreshold: 30, expiryDate: new Date('2026-04-10'), description: '用于缓解过敏性鼻炎有关的症状。' },
    { code: 'D027', name: '999皮炎平', category: '过敏/皮肤', manufacturer: '华润三九', price: 16.50, stock: 120, minStockThreshold: 30, expiryDate: new Date('2025-11-11'), description: '用于局限性瘙痒症、神经性皮炎。' },
    { code: 'D028', name: '红霉素软膏', category: '过敏/皮肤', manufacturer: '白云山', price: 3.50, stock: 250, minStockThreshold: 60, expiryDate: new Date('2026-06-06'), description: '用于脓疱疮等化脓性皮肤病。' },
    { code: 'D029', name: '维生素C片', category: '维生素', manufacturer: '养生堂', price: 19.90, stock: 180, minStockThreshold: 50, expiryDate: new Date('2025-10-30'), description: '增强免疫力。' },
    { code: 'D030', name: '葡萄糖酸钙锌口服溶液', category: '维生素', manufacturer: '三精制药', price: 45.00, stock: 60, minStockThreshold: 20, expiryDate: new Date('2025-09-09'), description: '用于治疗缺钙、缺锌。' },
  ];

  for (const drug of initialDrugs) {
    await prisma.drug.upsert({
      where: { code: drug.code },
      update: {},
      create: {
        ...drug,
        createdById: admin.id,
      },
    });
  }

  console.log(`✅ 药品创建完成: ${initialDrugs.length} 个`);

  // 3. 创建示例销售记录
  const drugs = await prisma.drug.findMany({ take: 10 });
  const customers = ['张伟', '王芳', '李娜', '刘强', '陈静', '散客'];

  for (let i = 0; i < 20; i++) {
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const selectedDrugs = drugs.sort(() => Math.random() - 0.5).slice(0, itemCount);
    
    let totalAmount = 0;
    const items = selectedDrugs.map(drug => {
      const qty = Math.floor(Math.random() * 3) + 1;
      const total = drug.price * qty;
      totalAmount += total;
      return {
        drugId: drug.id,
        quantity: qty,
        priceAtSale: drug.price,
        total,
      };
    });

    await prisma.saleRecord.create({
      data: {
        totalAmount,
        customerName: customers[Math.floor(Math.random() * customers.length)],
        cashierId: Math.random() > 0.5 ? admin.id : pharmacist.id,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        items: {
          create: items,
        },
      },
    });
  }

  console.log('✅ 销售记录创建完成: 20 条');

  console.log('🎉 数据库初始化完成！');
  console.log('');
  console.log('默认账户:');
  console.log('  管理员: admin / password');
  console.log('  药剂师: pharm / password');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
