export interface ExcelJournalEntry {
  dateFormatted: string;
  glAccount: string;
  accountShortText: string;
  docNumber: string;
  costCenter: string;
  transactionType: string;
  regNumber: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  shortText: string;
  userEntry: string;
}

export function exportWalletJournalToCSV(data: {
  walletName: string;
  startDate: string;
  endDate: string;
  entries: ExcelJournalEntry[];
}) {
  const headers = [
    'Tgl. Trans',
    'GL Account',
    'Account Short Tex',
    'Doc Number',
    'Cost Center',
    'Transaction Type',
    'Reg. Number',
    'Debet',
    'Credit',
    'Balance',
    'Description',
    'Short Text',
    'User Entry'
  ];

  // Format numbers in Indonesian locale format (thousand separator '.', decimal ',')
  const formatExcelNumber = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const rows = data.entries.map(e => [
    e.dateFormatted,
    e.glAccount,
    e.accountShortText,
    e.docNumber,
    e.costCenter || '',
    e.transactionType,
    e.regNumber || '',
    formatExcelNumber(e.debit),
    formatExcelNumber(e.credit),
    formatExcelNumber(e.balance),
    e.description,
    e.shortText || '',
    e.userEntry
  ]);

  // Convert to CSV with proper quote escaping
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    )
  ].join('\n');

  // Prefix with UTF-8 BOM (\uFEFF) so Excel automatically recognizes the encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  
  const safeWalletName = data.walletName.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `Ledger_Overview_${safeWalletName}_${data.startDate}_to_${data.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
