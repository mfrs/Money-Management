export type Language = 'en' | 'id';

type Dictionary = Record<string, string>;

export const translations: Record<Language, Dictionary> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.wallets': 'Wallets',
    'nav.budget': 'Budget',
    'nav.transactions': 'Transactions',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign Out',
    'nav.darkMode': 'Dark Mode',
    'nav.lightMode': 'Light Mode',

    // TopBar
    'topbar.search': 'Search transactions...',
    'topbar.quickAdd': 'Quick Add',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.income': 'Income',
    'common.expense': 'Expense',
    'common.totalBalance': 'Total Balance',

    // Dashboard
    'dash.burnRate': 'Burn Rate',
    'dash.savingsRate': 'Savings Rate',
    'dash.bufferFund': 'Buffer Fund',
    'dash.budgetAlert': 'Budget Alert',
    'dash.budgetFlow': 'Budget Flow',
    'dash.distribution': 'Distribution',
    'dash.liveLedger': 'Live Ledger',
    'dash.viewAll': 'View All',
    'dash.noTransactions': 'No transactions yet. Use Quick Add to get started!',
    
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.preferences': 'Preferences',
    'settings.language': 'Language',
    'settings.english': 'English',
    'settings.indonesian': 'Indonesian',
    'settings.theme': 'Theme',
    'settings.currency': 'Currency',
    'settings.security': 'Security',
    'settings.changePassword': 'Change Password',
    'settings.currentPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.dangerZone': 'Danger Zone',
    'settings.resetData': 'Reset All Data',
    'settings.resetWarning': 'This will permanently delete all your transactions, wallets, and categories. This action cannot be undone.',

    // Wallets
    'wallets.title': 'Wallets',
    'wallets.all': 'All Wallets',
    'wallets.add': 'Add Wallet',
    'wallets.balance': 'Balance',

    // Budget
    'budget.title': 'Budget Management',
    'budget.income': 'Income Sources',
    'budget.fixed': 'Fixed Expenses',
    'budget.allocations': 'Wallet Allocations',
    'budget.addIncome': 'Add Income Source',
    'budget.addFixed': 'Add Fixed Expense',
    'budget.addAllocation': 'Add Allocation',

    // Reports
    'reports.title': 'Financial Reports',
    'reports.subtitle': 'Analytics breakdown of your financial distribution and spending patterns.',
    'reports.export': 'Export to PDF',
    'reports.exporting': 'Exporting...',
    'reports.incomeVsExpenses': 'Income vs Expenses',
    'reports.expenseBreakdown': 'Expense Breakdown',
    'reports.smartInsights': 'Smart Insights',
  },
  id: {
    // Navigation
    'nav.dashboard': 'Dasbor',
    'nav.wallets': 'Dompet',
    'nav.budget': 'Anggaran',
    'nav.transactions': 'Transaksi',
    'nav.reports': 'Laporan',
    'nav.settings': 'Pengaturan',
    'nav.signOut': 'Keluar',
    'nav.darkMode': 'Mode Gelap',
    'nav.lightMode': 'Mode Terang',

    // TopBar
    'topbar.search': 'Cari transaksi...',
    'topbar.quickAdd': 'Tambah Cepat',

    // Common
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.delete': 'Hapus',
    'common.edit': 'Edit',
    'common.add': 'Tambah',
    'common.income': 'Pemasukan',
    'common.expense': 'Pengeluaran',
    'common.totalBalance': 'Total Saldo',

    // Dashboard
    'dash.burnRate': 'Tingkat Konsumsi',
    'dash.savingsRate': 'Tingkat Tabungan',
    'dash.bufferFund': 'Dana Cadangan',
    'dash.budgetAlert': 'Peringatan Anggaran',
    'dash.budgetFlow': 'Arus Anggaran',
    'dash.distribution': 'Distribusi',
    'dash.liveLedger': 'Buku Besar',
    'dash.viewAll': 'Lihat Semua',
    'dash.noTransactions': 'Belum ada transaksi. Gunakan Tambah Cepat untuk memulai!',

    // Settings
    'settings.title': 'Pengaturan',
    'settings.profile': 'Profil',
    'settings.preferences': 'Preferensi',
    'settings.language': 'Bahasa',
    'settings.english': 'Inggris',
    'settings.indonesian': 'Indonesia',
    'settings.theme': 'Tema',
    'settings.currency': 'Mata Uang',
    'settings.security': 'Keamanan',
    'settings.changePassword': 'Ubah Kata Sandi',
    'settings.currentPassword': 'Kata Sandi Saat Ini',
    'settings.newPassword': 'Kata Sandi Baru',
    'settings.dangerZone': 'Zona Berbahaya',
    'settings.resetData': 'Hapus Semua Data',
    'settings.resetWarning': 'Ini akan menghapus seluruh transaksi, dompet, dan kategori Anda secara permanen. Tindakan ini tidak dapat dibatalkan.',

    // Wallets
    'wallets.title': 'Dompet',
    'wallets.all': 'Semua Dompet',
    'wallets.add': 'Tambah Dompet',
    'wallets.balance': 'Saldo',

    // Budget
    'budget.title': 'Manajemen Anggaran',
    'budget.income': 'Sumber Pemasukan',
    'budget.fixed': 'Pengeluaran Tetap',
    'budget.allocations': 'Alokasi Dompet',
    'budget.addIncome': 'Tambah Sumber Pemasukan',
    'budget.addFixed': 'Tambah Pengeluaran Tetap',
    'budget.addAllocation': 'Tambah Alokasi',

    // Reports
    'reports.title': 'Laporan Keuangan',
    'reports.subtitle': 'Rincian analitik dari distribusi keuangan dan pola pengeluaran Anda.',
    'reports.export': 'Ekspor ke PDF',
    'reports.exporting': 'Mengekspor...',
    'reports.incomeVsExpenses': 'Pemasukan vs Pengeluaran',
    'reports.expenseBreakdown': 'Rincian Pengeluaran',
    'reports.smartInsights': 'Wawasan Cerdas',
  }
};
