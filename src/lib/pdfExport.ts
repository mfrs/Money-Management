import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatCurrencyShort } from './types';

// ─── Color Constants ───
const COLORS = {
  darkBg: [15, 15, 25] as [number, number, number],
  cardBg: [25, 25, 40] as [number, number, number],
  headerBg: [35, 35, 55] as [number, number, number],
  primary: [59, 130, 246] as [number, number, number],
  secondary: [99, 102, 241] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightGray: [180, 180, 200] as [number, number, number],
  mutedGray: [120, 120, 145] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  divider: [45, 45, 65] as [number, number, number],
};

const PAGE_MARGIN = 20;
const CONTENT_WIDTH_A4 = 210 - PAGE_MARGIN * 2; // 170mm

// ─── Utility Helpers ───

function addPageBackground(pdf: jsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setFillColor(...COLORS.darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
}

function drawRoundedRect(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: [number, number, number]
) {
  pdf.setFillColor(...fillColor);
  pdf.roundedRect(x, y, w, h, r, r, 'F');
}

function ensureSpace(pdf: jsPDF, currentY: number, needed: number): number {
  if (currentY + needed > pdf.internal.pageSize.getHeight() - 20) {
    pdf.addPage();
    addPageBackground(pdf);
    return PAGE_MARGIN + 10;
  }
  return currentY;
}

// ─── Report Header ───

function drawReportHeader(
  pdf: jsPDF,
  title: string,
  subtitle: string,
  dateStr: string
): number {
  let y = PAGE_MARGIN;

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...COLORS.white);
  pdf.text(title.toUpperCase(), PAGE_MARGIN, y + 8);
  y += 14;

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.mutedGray);
  pdf.text(subtitle, PAGE_MARGIN, y + 4);

  // Date on the right
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.lightGray);
  const dateWidth = pdf.getTextWidth(dateStr);
  pdf.text(dateStr, 210 - PAGE_MARGIN - dateWidth, PAGE_MARGIN + 8);

  y += 10;

  // Divider line
  pdf.setDrawColor(...COLORS.divider);
  pdf.setLineWidth(0.3);
  pdf.line(PAGE_MARGIN, y, 210 - PAGE_MARGIN, y);

  return y + 8;
}

// ─── Metric Cards ───

function drawMetricCards(
  pdf: jsPDF,
  y: number,
  metrics: { label: string; value: string; sub: string }[]
): number {
  y = ensureSpace(pdf, y, 35);
  const cardWidth = (CONTENT_WIDTH_A4 - 8) / 3;
  const cardHeight = 30;

  metrics.forEach((metric, i) => {
    const x = PAGE_MARGIN + i * (cardWidth + 4);
    drawRoundedRect(pdf, x, y, cardWidth, cardHeight, 3, COLORS.cardBg);

    // Border
    pdf.setDrawColor(...COLORS.divider);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');

    // Label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.mutedGray);
    pdf.text(metric.label.toUpperCase(), x + 8, y + 10);

    // Value
    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.white);
    pdf.text(metric.value, x + 8, y + 20);

    // Sub
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.primary);
    pdf.text(metric.sub, x + 8, y + 26);
  });

  return y + cardHeight + 8;
}

// ─── Section Title ───

function drawSectionTitle(pdf: jsPDF, y: number, title: string): number {
  y = ensureSpace(pdf, y, 15);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...COLORS.white);
  pdf.text(title.toUpperCase(), PAGE_MARGIN, y + 5);

  pdf.setDrawColor(...COLORS.primary);
  pdf.setLineWidth(0.8);
  pdf.line(PAGE_MARGIN, y + 8, PAGE_MARGIN + 30, y + 8);

  return y + 16;
}

// ─── Breakdown Bars ───

function drawBreakdownBars(
  pdf: jsPDF,
  y: number,
  items: { name: string; amount: string; progress: number; color: string }[]
): number {
  if (items.length === 0) return y;

  y = ensureSpace(pdf, y, items.length * 14 + 10);
  drawRoundedRect(pdf, PAGE_MARGIN, y, CONTENT_WIDTH_A4, items.length * 14 + 10, 4, COLORS.cardBg);

  let iy = y + 8;
  items.forEach((item) => {
    // Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.white);
    pdf.text(item.name, PAGE_MARGIN + 8, iy);

    // Amount
    pdf.setTextColor(...COLORS.lightGray);
    const amountWidth = pdf.getTextWidth(item.amount);
    pdf.text(item.amount, 210 - PAGE_MARGIN - 8 - amountWidth, iy);

    // Progress bar
    const barY = iy + 2;
    const barWidth = CONTENT_WIDTH_A4 - 16;
    pdf.setFillColor(40, 40, 60);
    pdf.roundedRect(PAGE_MARGIN + 8, barY, barWidth, 2.5, 1, 1, 'F');

    // Parse color string to RGB
    const rgb = hexToRgb(item.color) || COLORS.primary;
    pdf.setFillColor(...rgb);
    const fillWidth = Math.max(2, (item.progress / 100) * barWidth);
    pdf.roundedRect(PAGE_MARGIN + 8, barY, fillWidth, 2.5, 1, 1, 'F');

    iy += 14;
  });

  return iy + 4;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

// ─── Insights ───

function drawInsights(
  pdf: jsPDF,
  y: number,
  insights: { title: string; text: string; positive: boolean }[]
): number {
  if (insights.length === 0) return y;

  for (const insight of insights) {
    y = ensureSpace(pdf, y, 22);
    const color = insight.positive ? COLORS.green : COLORS.red;
    const bgColor: [number, number, number] = insight.positive ? [20, 40, 30] : [45, 20, 20];

    drawRoundedRect(pdf, PAGE_MARGIN, y, CONTENT_WIDTH_A4, 18, 3, bgColor);

    // Indicator dot
    pdf.setFillColor(...color);
    pdf.circle(PAGE_MARGIN + 8, y + 7, 2, 'F');

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...color);
    pdf.text(insight.title.toUpperCase(), PAGE_MARGIN + 14, y + 8);

    // Text (wrap)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.lightGray);
    const lines = pdf.splitTextToSize(insight.text, CONTENT_WIDTH_A4 - 24);
    pdf.text(lines, PAGE_MARGIN + 14, y + 14);

    y += 22;
  }
  return y;
}

// ─── Chart Data as Mini-Table ───

function drawChartTable(
  pdf: jsPDF,
  y: number,
  chartData: { name: string; income: number; expenses: number }[],
  lang: string
): number {
  y = ensureSpace(pdf, y, 30);

  const head = [[
    lang === 'id' ? 'BULAN' : 'MONTH',
    lang === 'id' ? 'PEMASUKAN' : 'INCOME',
    lang === 'id' ? 'PENGELUARAN' : 'EXPENSES',
    lang === 'id' ? 'SELISIH' : 'NET'
  ]];

  const body = chartData.map((d) => [
    d.name,
    formatCurrency(d.income),
    formatCurrency(d.expenses),
    formatCurrency(d.income - d.expenses),
  ]);

  autoTable(pdf, {
    startY: y,
    head,
    body,
    theme: 'plain',
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: COLORS.lightGray,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineWidth: 0,
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.mutedGray,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fillColor: COLORS.cardBg,
    },
    alternateRowStyles: {
      fillColor: [30, 30, 48],
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    didDrawPage: () => {
      addPageBackground(pdf);
    },
  });

  return (pdf as any).lastAutoTable.finalY + 8;
}

// ═════════════════════════════════════════════════
// PUBLIC: Export Analytics Report
// ═════════════════════════════════════════════════

export interface AnalyticsReportData {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  burnRate: number;
  txCount: number;
  chartData: { name: string; income: number; expenses: number }[];
  breakdown: { name: string; amount: string; progress: number; color: string }[];
  insights: { title: string; text: string; positive: boolean }[];
  language: string;
}

export function exportAnalyticsReport(data: AnalyticsReportData) {
  const { language: lang } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  addPageBackground(pdf);

  const title = lang === 'id' ? 'Laporan Keuangan' : 'Financial Report';
  const subtitle = lang === 'id'
    ? 'Analitik distribusi keuangan dan pola pengeluaran'
    : 'Analytics breakdown of financial distribution and spending patterns';
  const dateStr = new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let y = drawReportHeader(pdf, title, subtitle, dateStr);

  // ─ Metrics ─
  const savings = Math.max(0, data.totalIncome - data.totalExpenses);
  const savingsRate = data.totalIncome > 0
    ? `${Math.round(((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100)}%`
    : '0%';

  y = drawMetricCards(pdf, y, [
    {
      label: lang === 'id' ? 'Total Tabungan' : 'Total Savings',
      value: formatCurrency(savings),
      sub: savingsRate,
    },
    {
      label: lang === 'id' ? 'Tingkat Konsumsi Harian' : 'Daily Burn Rate',
      value: formatCurrencyShort(data.burnRate),
      sub: lang === 'id' ? '/hari' : '/day',
    },
    {
      label: lang === 'id' ? 'Kekayaan Bersih' : 'Net Worth',
      value: formatCurrency(data.totalBalance),
      sub: `${data.txCount} ${lang === 'id' ? 'transaksi' : 'transactions'}`,
    },
  ]);

  // ─ Income vs Expenses Table ─
  y = drawSectionTitle(pdf, y, lang === 'id' ? 'Pemasukan vs Pengeluaran' : 'Income vs Expenses');
  y = drawChartTable(pdf, y, data.chartData, lang);

  // ─ Expense Breakdown ─
  y = drawSectionTitle(pdf, y, lang === 'id' ? 'Rincian Pengeluaran' : 'Expense Breakdown');
  y = drawBreakdownBars(pdf, y, data.breakdown);

  // ─ Insights ─
  y = drawSectionTitle(pdf, y, lang === 'id' ? 'Wawasan Cerdas' : 'Smart Insights');
  y = drawInsights(pdf, y, data.insights);

  // ─ Footer ─
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.mutedGray);
    pdf.text(
      `${lang === 'id' ? 'Dibuat' : 'Generated'}: ${new Date().toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB')}`,
      PAGE_MARGIN,
      pageH - 10,
    );
    const pageText = `${i} / ${totalPages}`;
    const pw = pdf.getTextWidth(pageText);
    pdf.text(pageText, 210 - PAGE_MARGIN - pw, pageH - 10);
  }

  pdf.save(`Stashly_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ═════════════════════════════════════════════════
// PUBLIC: Export Wallet Journal
// ═════════════════════════════════════════════════

export interface WalletJournalData {
  walletName: string;
  entries: {
    date: string;
    description: string;
    type: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[];
  language: string;
}

export function exportWalletJournal(data: WalletJournalData) {
  const { language: lang } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  addPageBackground(pdf);

  const title = lang === 'id' ? 'Mutasi Rekening' : 'Wallet Journal';
  const subtitle = `${data.walletName} — ${lang === 'id' ? 'Buku Besar Dompet (Double-Entry)' : 'Double-Entry Wallet Ledger'}`;
  const dateStr = new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let y = drawReportHeader(pdf, title, subtitle, dateStr);

  const head = [[
    lang === 'id' ? 'TANGGAL' : 'DATE',
    lang === 'id' ? 'DESKRIPSI' : 'DESCRIPTION',
    lang === 'id' ? 'DEBIT (MASUK)' : 'DEBIT (IN)',
    lang === 'id' ? 'KREDIT (KELUAR)' : 'CREDIT (OUT)',
    lang === 'id' ? 'SALDO' : 'BALANCE',
  ]];

  const body = data.entries.map((e) => [
    new Date(e.date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB'),
    e.description,
    e.debit > 0 ? formatCurrency(e.debit) : '-',
    e.credit > 0 ? formatCurrency(e.credit) : '-',
    formatCurrency(e.runningBalance),
  ]);

  autoTable(pdf, {
    startY: y,
    head,
    body,
    theme: 'plain',
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: COLORS.lightGray,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineWidth: 0,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.mutedGray,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fillColor: COLORS.cardBg,
    },
    alternateRowStyles: {
      fillColor: [30, 30, 48],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30, textColor: COLORS.primary, fontStyle: 'bold' },
    },
    didDrawPage: () => {
      addPageBackground(pdf);
    },
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.mutedGray);
    pdf.text(
      `${lang === 'id' ? 'Dibuat' : 'Generated'}: ${new Date().toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB')}`,
      PAGE_MARGIN,
      pageH - 10,
    );
    const pageText = `${i} / ${totalPages}`;
    const pw = pdf.getTextWidth(pageText);
    pdf.text(pageText, 210 - PAGE_MARGIN - pw, pageH - 10);
  }

  pdf.save(`Stashly_WalletJournal_${data.walletName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ═════════════════════════════════════════════════
// PUBLIC: Export Journal Detail
// ═════════════════════════════════════════════════

export interface JournalDetailData {
  journalId: string;
  description: string;
  note?: string;
  date: string;
  createdAt?: string;
  lines: {
    accountName: string;
    accountCategory: string;
    description: string;
    debit: number;
    credit: number;
  }[];
  language: string;
}

export function exportJournalDetail(data: JournalDetailData) {
  const { language: lang } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  addPageBackground(pdf);

  const title = lang === 'id' ? 'Detail Jurnal' : 'Journal Detail';
  const docNo = `JRN-${data.journalId.substring(data.journalId.length - 6).toUpperCase()}`;
  const subtitle = `No. Doc: ${docNo}`;
  const dateStr = new Date(data.date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let y = drawReportHeader(pdf, title, subtitle, dateStr);

  // ─ Info Card ─
  const infoItems = [
    { label: lang === 'id' ? 'MATA UANG' : 'CURRENCY', value: 'IDR (Rupiah)' },
    { label: lang === 'id' ? 'TGL. DOC' : 'DOC DATE', value: dateStr },
    {
      label: lang === 'id' ? 'TGL. DIINPUT' : 'INSERT DATE',
      value: data.createdAt
        ? new Date(data.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }) +
          ' ' +
          new Date(data.createdAt).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '-',
    },
    { label: 'STATUS', value: 'POSTED' },
    { label: lang === 'id' ? 'KODE VOUCHER' : 'VOUCHER CODE', value: data.journalId.substring(data.journalId.length - 8).toUpperCase() },
  ];

  drawRoundedRect(pdf, PAGE_MARGIN, y, CONTENT_WIDTH_A4, 38, 4, COLORS.cardBg);
  pdf.setDrawColor(...COLORS.divider);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH_A4, 38, 4, 4, 'S');

  const colWidth = CONTENT_WIDTH_A4 / 3;
  infoItems.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const ix = PAGE_MARGIN + col * colWidth + 8;
    const iy = y + 8 + row * 14;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.mutedGray);
    pdf.text(item.label, ix, iy);

    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLORS.white);
    pdf.text(item.value, ix, iy + 5);
  });

  y += 42;

  // Description
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.mutedGray);
  pdf.text((lang === 'id' ? 'KETERANGAN' : 'DESCRIPTION').toUpperCase(), PAGE_MARGIN, y + 3);
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.white);
  pdf.text(data.description, PAGE_MARGIN, y + 10);
  if (data.note) {
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.lightGray);
    pdf.text(data.note, PAGE_MARGIN, y + 16);
    y += 22;
  } else {
    y += 16;
  }

  // ─ Lines Table ─
  const head = [[
    'GL ACCOUNT',
    lang === 'id' ? 'KETERANGAN' : 'DESCRIPTION',
    'DEBET',
    'CREDIT',
  ]];

  const body = data.lines.map((l) => [
    `${l.accountName}\n[${l.accountCategory}]`,
    l.description,
    l.debit > 0 ? formatCurrency(l.debit) : '0',
    l.credit > 0 ? formatCurrency(l.credit) : '0',
  ]);

  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);

  autoTable(pdf, {
    startY: y,
    head,
    body,
    theme: 'plain',
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: COLORS.lightGray,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineWidth: 0,
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.mutedGray,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fillColor: COLORS.cardBg,
    },
    alternateRowStyles: {
      fillColor: [30, 30, 48],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 },
    },
    didDrawPage: () => {
      addPageBackground(pdf);
    },
  });

  y = (pdf as any).lastAutoTable.finalY + 2;

  // Total row
  drawRoundedRect(pdf, PAGE_MARGIN, y, CONTENT_WIDTH_A4, 10, 2, COLORS.headerBg);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.mutedGray);
  pdf.text('T O T A L', PAGE_MARGIN + 6, y + 6.5);

  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.secondary);
  const debitText = formatCurrency(totalDebit);
  pdf.text(debitText, 210 - PAGE_MARGIN - 34 - pdf.getTextWidth(debitText), y + 6.5);

  pdf.setTextColor(...COLORS.primary);
  const creditText = formatCurrency(totalCredit);
  pdf.text(creditText, 210 - PAGE_MARGIN - 4 - pdf.getTextWidth(creditText), y + 6.5);

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.mutedGray);
    pdf.text(
      `${lang === 'id' ? 'Dibuat' : 'Generated'}: ${new Date().toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB')}`,
      PAGE_MARGIN,
      pageH - 10,
    );
    const pageText = `${i} / ${totalPages}`;
    const pw = pdf.getTextWidth(pageText);
    pdf.text(pageText, 210 - PAGE_MARGIN - pw, pageH - 10);
  }

  pdf.save(`Journal_Detail_${data.journalId.substring(0, 8)}.pdf`);
}
