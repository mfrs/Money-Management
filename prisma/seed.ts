import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding WealthManager database...');

  // Clear existing data in correct order
  await prisma.journalLine.deleteMany();
  await prisma.journal.deleteMany();
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

  // Create Transactions via Journal & JournalLines
  const createJournalEntry = async (
    description: string,
    amount: number,
    type: 'expense' | 'income',
    categoryId: string,
    walletId: string,
    date: Date,
    note: string
  ) => {
    const lines = [];
    if (type === 'expense') {
      lines.push({ walletId, amount, type: 'CREDIT' });
      lines.push({ categoryId, amount, type: 'DEBIT' });
    } else {
      lines.push({ walletId, amount, type: 'DEBIT' });
      lines.push({ categoryId, amount, type: 'CREDIT' });
    }

    await prisma.journal.create({
      data: {
        description,
        date,
        note,
        userId: uid,
        lines: {
          create: lines
        }
      }
    });
  };

  await createJournalEntry('Warung Nasi Padang', 45000, 'expense', food.id, gopay.id, d(0, 12, 30), 'Lunch');
  await createJournalEntry('Salary Deposit', 12500000, 'income', salary.id, bca.id, d(1, 9, 0), 'Monthly salary');
  await createJournalEntry('Pertamina SPBU', 300000, 'expense', transport.id, bca.id, d(2, 18, 15), 'Full tank');
  await createJournalEntry('Cinema XXI', 150000, 'expense', entertainment.id, gopay.id, d(3, 20, 0), 'Movie night');
  await createJournalEntry('Superindo', 850000, 'expense', groceries.id, bca.id, d(5, 10, 45), 'Weekly groceries');
  await createJournalEntry('PLN Token Listrik', 500000, 'expense', utilities.id, bca.id, d(7, 14, 0), 'Electricity');
  await createJournalEntry('Grab Car', 85000, 'expense', transport.id, gopay.id, d(7, 8, 30), 'To office');
  await createJournalEntry('GoFood - McDonalds', 78000, 'expense', food.id, gopay.id, d(7, 19, 0), 'Dinner');
  await createJournalEntry('Freelance Web Design', 3500000, 'income', freelance.id, bca.id, d(14, 10, 0), 'Project Alpha');
  await createJournalEntry('Kost / Rent', 3500000, 'expense', housing.id, bca.id, d(14, 8, 0), 'Monthly rent');
  await createJournalEntry('Apotek K-24', 125000, 'expense', health.id, cash.id, d(21, 16, 30), 'Medicine');
  await createJournalEntry('Uniqlo', 450000, 'expense', shopping.id, bca.id, d(21, 13, 0), 'New shirts');
  await createJournalEntry('Dividen Saham', 750000, 'income', investment.id, mandiri.id, d(30, 9, 0), 'Quarterly dividend');
  await createJournalEntry('Indomaret', 185000, 'expense', groceries.id, cash.id, d(30, 11, 0), 'Snacks & drinks');
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
