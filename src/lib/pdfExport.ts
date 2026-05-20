import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatCurrencyShort } from './types';

// ─── Color Palette (Professional Light Theme for PDF) ───
type RGB = [number, number, number];

const C = {
  // Backgrounds
  white:      [255, 255, 255] as RGB,
  pageBg:     [248, 249, 252] as RGB,
  cardBg:     [255, 255, 255] as RGB,
  headerBg:   [17, 24, 39] as RGB,
  tableHead:  [30, 41, 59] as RGB,
  tableRow1:  [248, 250, 252] as RGB,
  tableRow2:  [241, 245, 249] as RGB,
  // Accents
  primary:    [59, 130, 246] as RGB,
  primaryDk:  [37, 99, 235] as RGB,
  secondary:  [99, 102, 241] as RGB,
  green:      [22, 163, 74] as RGB,
  greenBg:    [220, 252, 231] as RGB,
  red:        [220, 38, 38] as RGB,
  redBg:      [254, 226, 226] as RGB,
  amber:      [217, 119, 6] as RGB,
  amberBg:    [254, 243, 199] as RGB,
  // Text
  textDark:   [15, 23, 42] as RGB,
  textBody:   [51, 65, 85] as RGB,
  textMuted:  [100, 116, 139] as RGB,
  textLight:  [148, 163, 184] as RGB,
  // Borders
  border:     [226, 232, 240] as RGB,
  borderLight:[241, 245, 249] as RGB,
};

const PAGE_W = 210;
const PAGE_H = 297;
const M = 16; // margin
const CW = PAGE_W - M * 2; // content width = 178mm

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function drawPageBg(pdf: jsPDF) {
  pdf.setFillColor(...C.pageBg);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function newPageWithBg(pdf: jsPDF): number {
  pdf.addPage();
  drawPageBg(pdf);
  return M + 5;
}

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 20) {
    return newPageWithBg(pdf);
  }
  return y;
}

function hexToRgb(hex: string): RGB {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : C.primary;
}

// ─── Reusable drawing primitives ───

function drawRoundedCard(pdf: jsPDF, x: number, y: number, w: number, h: number, opts?: { fill?: RGB; border?: RGB; shadow?: boolean }) {
  const fill = opts?.fill || C.cardBg;
  const border = opts?.border || C.border;
  const r = 3;

  // Subtle depth via slightly darker bottom-right border
  if (opts?.shadow !== false) {
    pdf.setFillColor(200, 205, 215);
    pdf.roundedRect(x + 0.3, y + 0.5, w, h, r, r, 'F');
  }

  pdf.setFillColor(...fill);
  pdf.roundedRect(x, y, w, h, r, r, 'F');
  pdf.setDrawColor(...border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, r, r, 'S');
}

function drawHeaderBanner(pdf: jsPDF, title: string, subtitle: string, dateStr: string, appName?: string): number {
  // Dark banner
  const bannerH = 36;
  pdf.setFillColor(...C.headerBg);
  pdf.rect(0, 0, PAGE_W, bannerH, 'F');

  // Accent line
  pdf.setFillColor(...C.primary);
  pdf.rect(0, bannerH, PAGE_W, 1.2, 'F');

  // App name / brand
  const brand = appName || 'STASHLY';
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(brand, M, 10);

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, M, 22);

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(180, 190, 210);
  pdf.text(subtitle, M, 30);

  // Date on right
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(180, 190, 210);
  const dw = pdf.getTextWidth(dateStr);
  pdf.text(dateStr, PAGE_W - M - dw, 22);

  return bannerH + 1.2 + 10; // y after banner + spacing
}

function drawSectionHeader(pdf: jsPDF, y: number, title: string, accentColor?: RGB): number {
  y = ensureSpace(pdf, y, 14);
  const color = accentColor || C.primary;

  // Accent bar
  pdf.setFillColor(...color);
  pdf.rect(M, y, 3, 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...C.textDark);
  pdf.text(title, M + 7, y + 6);

  return y + 14;
}

function drawFooter(pdf: jsPDF, lang: string) {
  const totalPages = pdf.getNumberOfPages();
  const now = new Date().toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB');
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    // Separator line
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.3);
    pdf.line(M, PAGE_H - 16, PAGE_W - M, PAGE_H - 16);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...C.textLight);
    pdf.text(`${lang === 'id' ? 'Dibuat' : 'Generated'}: ${now}`, M, PAGE_H - 11);

    const pg = `${lang === 'id' ? 'Halaman' : 'Page'} ${i} / ${totalPages}`;
    const pw = pdf.getTextWidth(pg);
    pdf.text(pg, PAGE_W - M - pw, PAGE_H - 11);
  }
}

// Helper for autoTable: only add bg on NEW pages created by the table
function makePageBgHook(pdf: jsPDF) {
  const startPage = pdf.getNumberOfPages();
  return {
    willDrawPage: () => {
      const cur = pdf.getNumberOfPages();
      if (cur > startPage) {
        drawPageBg(pdf);
      }
    },
  };
}

// ════════════════════════════════════════════════════
// ANALYTICS REPORT
// ════════════════════════════════════════════════════

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
  const lang = data.language;
  const pdf = new jsPDF('p', 'mm', 'a4');
  drawPageBg(pdf);

  const dateStr = new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  let y = drawHeaderBanner(
    pdf,
    lang === 'id' ? 'LAPORAN KEUANGAN' : 'FINANCIAL REPORT',
    lang === 'id' ? 'Analitik distribusi keuangan dan pola pengeluaran' : 'Analytics breakdown of financial distribution and spending patterns',
    dateStr,
  );

  // ── Metric Cards ──
  const savings = Math.max(0, data.totalIncome - data.totalExpenses);
  const savingsRate = data.totalIncome > 0
    ? Math.round(((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100)
    : 0;

  const metrics = [
    {
      label: lang === 'id' ? 'TOTAL TABUNGAN' : 'TOTAL SAVINGS',
      value: formatCurrency(savings),
      badge: `${savingsRate}%`,
      badgeColor: savingsRate >= 20 ? C.green : C.amber,
      badgeBg: savingsRate >= 20 ? C.greenBg : C.amberBg,
      accent: C.primary,
    },
    {
      label: lang === 'id' ? 'KONSUMSI HARIAN' : 'DAILY BURN RATE',
      value: formatCurrencyShort(data.burnRate),
      badge: lang === 'id' ? '/hari' : '/day',
      badgeColor: C.textMuted,
      badgeBg: C.borderLight,
      accent: C.secondary,
    },
    {
      label: lang === 'id' ? 'KEKAYAAN BERSIH' : 'NET WORTH',
      value: formatCurrency(data.totalBalance),
      badge: `${data.txCount} txns`,
      badgeColor: C.textMuted,
      badgeBg: C.borderLight,
      accent: [22, 163, 74] as RGB,
    },
  ];

  const cardW = (CW - 8) / 3;
  const cardH = 32;
  metrics.forEach((m, i) => {
    const x = M + i * (cardW + 4);
    drawRoundedCard(pdf, x, y, cardW, cardH);

    // Top accent line
    pdf.setFillColor(...m.accent);
    pdf.rect(x + 6, y + 1, 20, 1.5, 'F');

    // Label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.textMuted);
    pdf.text(m.label, x + 6, y + 10);

    // Value
    pdf.setFontSize(13);
    pdf.setTextColor(...C.textDark);
    pdf.text(m.value, x + 6, y + 20);

    // Badge
    const bw = pdf.getTextWidth(m.badge) + 6;
    pdf.setFillColor(...m.badgeBg);
    pdf.roundedRect(x + 6, y + 23, bw, 5, 1.5, 1.5, 'F');
    pdf.setFontSize(6);
    pdf.setTextColor(...m.badgeColor);
    pdf.text(m.badge, x + 9, y + 26.5);
  });

  y += cardH + 10;

  // ── Income vs Expenses Table ──
  y = drawSectionHeader(pdf, y, lang === 'id' ? 'Pemasukan vs Pengeluaran' : 'Income vs Expenses');

  const chartHead = [[
    lang === 'id' ? 'BULAN' : 'MONTH',
    lang === 'id' ? 'PEMASUKAN' : 'INCOME',
    lang === 'id' ? 'PENGELUARAN' : 'EXPENSES',
    lang === 'id' ? 'SELISIH' : 'NET',
  ]];

  const totalInc = data.chartData.reduce((s, d) => s + d.income, 0);
  const totalExp = data.chartData.reduce((s, d) => s + d.expenses, 0);

  const chartBody = data.chartData.map((d) => [
    d.name,
    formatCurrency(d.income),
    formatCurrency(d.expenses),
    formatCurrency(d.income - d.expenses),
  ]);

  // Summary row
  chartBody.push([
    lang === 'id' ? 'TOTAL' : 'TOTAL',
    formatCurrency(totalInc),
    formatCurrency(totalExp),
    formatCurrency(totalInc - totalExp),
  ]);

  const hook1 = makePageBgHook(pdf);

  autoTable(pdf, {
    startY: y,
    head: chartHead,
    body: chartBody,
    theme: 'grid',
    margin: { left: M, right: M },
    tableLineColor: C.border,
    tableLineWidth: 0.2,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: C.textBody,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      lineColor: C.border,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: [255, 255, 255] as RGB,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fillColor: C.white,
    },
    alternateRowStyles: {
      fillColor: C.tableRow1,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    willDrawCell: (hookData) => {
      // Style the total row
      if (hookData.section === 'body' && hookData.row.index === chartBody.length - 1) {
        hookData.cell.styles.fillColor = C.tableHead;
        hookData.cell.styles.textColor = [255, 255, 255];
        hookData.cell.styles.fontStyle = 'bold';
      }
      // Color net column
      if (hookData.section === 'body' && hookData.column.index === 3 && hookData.row.index < chartBody.length - 1) {
        const d = data.chartData[hookData.row.index];
        if (d) {
          hookData.cell.styles.textColor = d.income - d.expenses >= 0 ? C.green : C.red;
        }
      }
    },
    ...hook1,
  });

  y = (pdf as any).lastAutoTable.finalY + 10;

  // ── Expense Breakdown ──
  if (data.breakdown.length > 0) {
    y = drawSectionHeader(pdf, y, lang === 'id' ? 'Rincian Pengeluaran' : 'Expense Breakdown');
    y = ensureSpace(pdf, y, data.breakdown.length * 12 + 14);

    drawRoundedCard(pdf, M, y, CW, data.breakdown.length * 12 + 10, { shadow: true });

    let iy = y + 8;
    data.breakdown.forEach((item) => {
      // Name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.textDark);
      pdf.text(item.name, M + 8, iy);

      // Amount
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...C.textMuted);
      const aw = pdf.getTextWidth(item.amount);
      pdf.text(item.amount, PAGE_W - M - 8 - aw, iy);

      // Bar background
      const barY = iy + 2;
      const barW = CW - 16;
      pdf.setFillColor(...C.borderLight);
      pdf.roundedRect(M + 8, barY, barW, 2.5, 1, 1, 'F');

      // Bar fill
      const rgb = hexToRgb(item.color);
      pdf.setFillColor(...rgb);
      const fw = Math.max(3, (item.progress / 100) * barW);
      pdf.roundedRect(M + 8, barY, fw, 2.5, 1, 1, 'F');

      iy += 12;
    });

    y = iy + 6;
  }




  // ── Footer ──
  drawFooter(pdf, lang);

  pdf.save(`Stashly_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ════════════════════════════════════════════════════
// WALLET JOURNAL
// ════════════════════════════════════════════════════

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
  const lang = data.language;
  const pdf = new jsPDF('p', 'mm', 'a4');
  drawPageBg(pdf);

  const dateStr = new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  let y = drawHeaderBanner(
    pdf,
    lang === 'id' ? 'MUTASI REKENING' : 'WALLET JOURNAL',
    `${data.walletName} — ${lang === 'id' ? 'Buku Besar Dompet (Double-Entry)' : 'Double-Entry Wallet Ledger'}`,
    dateStr,
  );

  // Summary card
  const totalDebit = data.entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = data.entries.reduce((s, e) => s + e.credit, 0);
  const lastBalance = data.entries.length > 0 ? data.entries[0].runningBalance : 0;

  const summaryW = (CW - 6) / 3;
  const summaryItems = [
    { label: lang === 'id' ? 'TOTAL MASUK' : 'TOTAL IN', value: formatCurrency(totalDebit), color: C.green },
    { label: lang === 'id' ? 'TOTAL KELUAR' : 'TOTAL OUT', value: formatCurrency(totalCredit), color: C.red },
    { label: lang === 'id' ? 'SALDO AKHIR' : 'ENDING BALANCE', value: formatCurrency(lastBalance), color: C.primary },
  ];

  summaryItems.forEach((item, i) => {
    const x = M + i * (summaryW + 3);
    drawRoundedCard(pdf, x, y, summaryW, 22);
    // Top accent
    pdf.setFillColor(...item.color);
    pdf.rect(x + 6, y + 1, 16, 1.2, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    pdf.setTextColor(...C.textMuted);
    pdf.text(item.label, x + 6, y + 9);

    pdf.setFontSize(11);
    pdf.setTextColor(...C.textDark);
    pdf.text(item.value, x + 6, y + 17);
  });

  y += 30;

  // Table
  y = drawSectionHeader(pdf, y, lang === 'id' ? 'Rincian Transaksi' : 'Transaction Details');

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

  const hook = makePageBgHook(pdf);

  autoTable(pdf, {
    startY: y,
    head,
    body,
    theme: 'grid',
    margin: { left: M, right: M },
    tableLineColor: C.border,
    tableLineWidth: 0.2,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: C.textBody,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineColor: C.border,
      lineWidth: 0.15,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: [255, 255, 255] as RGB,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fillColor: C.white,
    },
    alternateRowStyles: {
      fillColor: C.tableRow1,
    },
    columnStyles: {
      0: { cellWidth: 24, fontSize: 7 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 28, textColor: C.green },
      3: { halign: 'right', cellWidth: 28, textColor: C.red },
      4: { halign: 'right', cellWidth: 30, fontStyle: 'bold', textColor: C.primary },
    },
    ...hook,
  });

  drawFooter(pdf, lang);
  pdf.save(`Stashly_WalletJournal_${data.walletName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ════════════════════════════════════════════════════
// JOURNAL DETAIL
// ════════════════════════════════════════════════════

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
  const lang = data.language;
  const pdf = new jsPDF('p', 'mm', 'a4');
  drawPageBg(pdf);

  const docNo = `JRN-${data.journalId.substring(data.journalId.length - 6).toUpperCase()}`;
  const dateStr = new Date(data.date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  let y = drawHeaderBanner(
    pdf,
    lang === 'id' ? 'DETAIL JURNAL' : 'JOURNAL DETAIL',
    `No. Doc: ${docNo}`,
    dateStr,
  );

  // ── Info Grid ──
  const infoItems = [
    { label: lang === 'id' ? 'MATA UANG' : 'CURRENCY', value: 'IDR (Rupiah)' },
    { label: lang === 'id' ? 'TGL. DOKUMEN' : 'DOC DATE', value: dateStr },
    {
      label: lang === 'id' ? 'TGL. DIINPUT' : 'INSERT DATE',
      value: data.createdAt
        ? new Date(data.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          }) + ' ' + new Date(data.createdAt).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-GB', {
            hour: '2-digit', minute: '2-digit',
          })
        : '-',
    },
    { label: 'STATUS', value: 'POSTED' },
    {
      label: lang === 'id' ? 'KODE VOUCHER' : 'VOUCHER CODE',
      value: data.journalId.substring(data.journalId.length - 8).toUpperCase(),
    },
  ];

  const gridCardH = 36;
  drawRoundedCard(pdf, M, y, CW, gridCardH);

  // Draw info items in a 3-column grid
  const colW = CW / 3;
  infoItems.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const ix = M + col * colW + 8;
    const iy = y + 9 + row * 14;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    pdf.setTextColor(...C.textLight);
    pdf.text(item.label, ix, iy);

    pdf.setFontSize(9);
    pdf.setTextColor(...C.textDark);
    pdf.text(item.value, ix, iy + 5.5);
  });

  y += gridCardH + 6;

  // ── Description ──
  drawRoundedCard(pdf, M, y, CW, data.note ? 22 : 16);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(...C.textLight);
  pdf.text(lang === 'id' ? 'KETERANGAN' : 'DESCRIPTION', M + 8, y + 7);

  pdf.setFontSize(10);
  pdf.setTextColor(...C.textDark);
  pdf.text(data.description, M + 8, y + 13);

  if (data.note) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(...C.textMuted);
    pdf.text(data.note, M + 8, y + 19);
    y += 28;
  } else {
    y += 22;
  }

  // ── Journal Lines Table ──
  y = drawSectionHeader(pdf, y, lang === 'id' ? 'Rincian Jurnal' : 'Journal Lines');

  const head = [[
    'GL ACCOUNT',
    lang === 'id' ? 'KETERANGAN' : 'DESCRIPTION',
    'DEBET',
    'CREDIT',
  ]];

  const bodyRows = data.lines.map((l) => [
    `${l.accountName}\n[${l.accountCategory}]`,
    l.description,
    l.debit > 0 ? formatCurrency(l.debit) : '-',
    l.credit > 0 ? formatCurrency(l.credit) : '-',
  ]);

  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);

  // Add total row
  bodyRows.push([
    'T O T A L',
    '',
    formatCurrency(totalDebit),
    formatCurrency(totalCredit),
  ]);

  const hook = makePageBgHook(pdf);

  autoTable(pdf, {
    startY: y,
    head,
    body: bodyRows,
    theme: 'grid',
    margin: { left: M, right: M },
    tableLineColor: C.border,
    tableLineWidth: 0.2,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: C.textBody,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      lineColor: C.border,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: [255, 255, 255] as RGB,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fillColor: C.white,
    },
    alternateRowStyles: {
      fillColor: C.tableRow1,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
    willDrawCell: (hookData) => {
      // Style total row
      if (hookData.section === 'body' && hookData.row.index === bodyRows.length - 1) {
        hookData.cell.styles.fillColor = C.tableHead;
        hookData.cell.styles.textColor = [255, 255, 255];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    ...hook,
  });

  // ── Balance check ──
  y = (pdf as any).lastAutoTable.finalY + 8;
  y = ensureSpace(pdf, y, 14);

  const isBalanced = totalDebit === totalCredit;
  const checkBg = isBalanced ? C.greenBg : C.redBg;
  const checkBorder = isBalanced ? [187, 247, 208] as RGB : [254, 202, 202] as RGB;
  const checkColor = isBalanced ? C.green : C.red;
  const checkText = isBalanced
    ? (lang === 'id' ? '✓ Jurnal ini balance — Debet = Kredit' : '✓ This journal is balanced — Debit = Credit')
    : (lang === 'id' ? '✗ Jurnal tidak balance!' : '✗ Journal is NOT balanced!');

  drawRoundedCard(pdf, M, y, CW, 10, { fill: checkBg, border: checkBorder, shadow: false });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...checkColor);
  pdf.text(checkText, M + 8, y + 6.5);

  drawFooter(pdf, lang);
  pdf.save(`Journal_Detail_${data.journalId.substring(0, 8)}.pdf`);
}
