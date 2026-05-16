import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding WealthManager database...');

  // Clear existing data in correct order
  await prisma.transaction.deleteMany();
  await prisma.walletAllocation.deleteMany();
  await prisma.fixedExpense.deleteMany();
  await prisma.incomeSource.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Alex Thorne',
      email: 'alex@logic.inf',
      password: hashedPassword,
      currency: 'IDR',
      theme: 'dark',
    },
  });
  console.log('  ✅ User created (alex@logic.inf / password123)');

  const uid = user.id;

  // Create Wallets
  const bca = await prisma.wallet.create({
    data: { name: 'BCA Primary', type: 'bank', account: '**** 1234', balance: 35200000, icon: 'Landmark', color: '#005AA9', userId: uid },
  });
  const gopay = await prisma.wallet.create({
    data: { name: 'Gopay', type: 'ewallet', account: '+62 812***', balance: 1450000, icon: 'Smartphone', color: '#00A5CF', userId: uid },
  });
  const cash = await prisma.wallet.create({
    data: { name: 'Physical Cash', type: 'cash', account: 'Wallet / Safe', balance: 800000, icon: 'Wallet', color: '#9CA3AF', userId: uid },
  });
  const mandiri = await prisma.wallet.create({
    data: { name: 'Mandiri Savings', type: 'savings', account: '**** 8890', balance: 91000000, icon: 'PiggyBank', color: '#F2A900', goal: 120000000, userId: uid },
  });
  console.log('  ✅ Wallets created');

  // Create Categories
  const food = await prisma.category.create({ data: { name: 'Makan', type: 'expense', icon: 'Utensils', color: '#EF4444', budgetLimit: 3000000, userId: uid } });
  const transport = await prisma.category.create({ data: { name: 'Transport', type: 'expense', icon: 'Car', color: '#F59E0B', budgetLimit: 2000000, userId: uid } });
  const entertainment = await prisma.category.create({ data: { name: 'Entertainment', type: 'expense', icon: 'Clapperboard', color: '#4EDEA3', budgetLimit: 1500000, userId: uid } });
  const groceries = await prisma.category.create({ data: { name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#8B5CF6', budgetLimit: 2500000, userId: uid } });
  const utilities = await prisma.category.create({ data: { name: 'Utilities', type: 'expense', icon: 'Bolt', color: '#06B6D4', budgetLimit: 1000000, userId: uid } });
  const housing = await prisma.category.create({ data: { name: 'Housing', type: 'expense', icon: 'Home', color: '#3B82F6', budgetLimit: 5000000, userId: uid } });
  const health = await prisma.category.create({ data: { name: 'Health', type: 'expense', icon: 'Heart', color: '#EC4899', budgetLimit: 1000000, userId: uid } });
  const shopping = await prisma.category.create({ data: { name: 'Shopping', type: 'expense', icon: 'ShoppingCart', color: '#F97316', budgetLimit: 1500000, userId: uid } });
  const salary = await prisma.category.create({ data: { name: 'Salary', type: 'income', icon: 'Banknote', color: '#22C55E', budgetLimit: 0, userId: uid } });
  const freelance = await prisma.category.create({ data: { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#14B8A6', budgetLimit: 0, userId: uid } });
  const investment = await prisma.category.create({ data: { name: 'Investment', type: 'income', icon: 'TrendingUp', color: '#6366F1', budgetLimit: 0, userId: uid } });
  console.log('  ✅ Categories created');

  // Create Transactions
  const now = new Date();
  const d = (daysAgo: number, h: number = 12, m: number = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(h, m, 0, 0);
    return date;
  };

  await prisma.transaction.createMany({
    data: [
      { description: 'Warung Nasi Padang', amount: 45000, type: 'expense', categoryId: food.id, walletId: gopay.id, date: d(0, 12, 30), note: 'Lunch', userId: uid },
      { description: 'Salary Deposit', amount: 12500000, type: 'income', categoryId: salary.id, walletId: bca.id, date: d(1, 9, 0), note: 'Monthly salary', userId: uid },
      { description: 'Pertamina SPBU', amount: 300000, type: 'expense', categoryId: transport.id, walletId: bca.id, date: d(2, 18, 15), note: 'Full tank', userId: uid },
      { description: 'Cinema XXI', amount: 150000, type: 'expense', categoryId: entertainment.id, walletId: gopay.id, date: d(3, 20, 0), note: 'Movie night', userId: uid },
      { description: 'Superindo', amount: 850000, type: 'expense', categoryId: groceries.id, walletId: bca.id, date: d(5, 10, 45), note: 'Weekly groceries', userId: uid },
      { description: 'PLN Token Listrik', amount: 500000, type: 'expense', categoryId: utilities.id, walletId: bca.id, date: d(7, 14, 0), note: 'Electricity', userId: uid },
      { description: 'Grab Car', amount: 85000, type: 'expense', categoryId: transport.id, walletId: gopay.id, date: d(7, 8, 30), note: 'To office', userId: uid },
      { description: 'GoFood - McDonalds', amount: 78000, type: 'expense', categoryId: food.id, walletId: gopay.id, date: d(7, 19, 0), note: 'Dinner', userId: uid },
      { description: 'Freelance Web Design', amount: 3500000, type: 'income', categoryId: freelance.id, walletId: bca.id, date: d(14, 10, 0), note: 'Project Alpha', userId: uid },
      { description: 'Kost / Rent', amount: 3500000, type: 'expense', categoryId: housing.id, walletId: bca.id, date: d(14, 8, 0), note: 'Monthly rent', userId: uid },
      { description: 'Apotek K-24', amount: 125000, type: 'expense', categoryId: health.id, walletId: cash.id, date: d(21, 16, 30), note: 'Medicine', userId: uid },
      { description: 'Uniqlo', amount: 450000, type: 'expense', categoryId: shopping.id, walletId: bca.id, date: d(21, 13, 0), note: 'New shirts', userId: uid },
      { description: 'Dividen Saham', amount: 750000, type: 'income', categoryId: investment.id, walletId: mandiri.id, date: d(30, 9, 0), note: 'Quarterly dividend', userId: uid },
      { description: 'Indomaret', amount: 185000, type: 'expense', categoryId: groceries.id, walletId: cash.id, date: d(30, 11, 0), note: 'Snacks & drinks', userId: uid },
    ],
  });
  console.log('  ✅ 14 Transactions created');

  // Create Budget data
  await prisma.incomeSource.createMany({
    data: [
      { name: 'Primary Salary', amount: 12500000, userId: uid },
      { name: 'Freelance (Design)', amount: 3500000, userId: uid },
    ],
  });

  await prisma.fixedExpense.createMany({
    data: [
      { name: 'Rent / Kost', amount: 3500000, term: '01-MONTH', icon: 'Building2', autoPay: true, userId: uid },
      { name: 'Internet IndiHome', amount: 450000, term: '12-MONTH', icon: 'Wifi', autoPay: true, userId: uid },
      { name: 'Spotify Premium', amount: 55000, term: '01-MONTH', icon: 'Music', autoPay: false, userId: uid },
    ],
  });

  await prisma.walletAllocation.create({
    data: { walletId: mandiri.id, amount: 3000000, userId: uid },
  });

  console.log('  ✅ Budget data created');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📧 Login: alex@logic.inf');
  console.log('🔑 Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
