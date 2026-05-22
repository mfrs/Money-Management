const fs = require('fs');

// Patch TransactionsView.tsx
let tx = fs.readFileSync('src/views/TransactionsView.tsx', 'utf-8');
tx = tx.replace('<table className="w-full text-left">', '<table className="w-full text-left hidden md:table">');
if (!tx.includes('{/* Mobile List */}')) {
  tx = tx.replace(/<\/table>\s*<\/div>\s*\{\/\* Pagination \*\/\}/g, `</table>
          {/* Mobile List */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {paged.map((tx) => {
              const cat = getCategoryById(tx.categoryId);
              const wallet = getWalletById(tx.walletId);
              const isDebtTx = !tx.categoryId && tx.type !== 'transfer';
              const IconComp = cat ? getIcon(cat.icon) : isDebtTx ? getIcon('Handshake') : getIcon('HelpCircle');
              const categoryName = tx.type === 'transfer' ? t('common.transfer') : cat ? cat.name : isDebtTx ? tx.debtType === 'DEBT' ? t('common.debt') : t('common.receivable') : 'Unknown';
              const isReversed = tx.isReversed;
              const isReversal = tx.description.startsWith('[REVERSAL]');

              return (
                <div key={tx.id} className={cn("p-4 flex flex-col gap-3 transition-colors relative group", isReversed ? "bg-amber-500/[0.02] text-amber-500/70" : isReversal ? "bg-sky-500/[0.02] text-sky-500/70" : "")}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl glass-dark border flex items-center justify-center shrink-0", isReversed ? "border-amber-500/20 text-amber-400 bg-amber-500/5" : isReversal ? "border-sky-500/20 text-sky-400 bg-sky-500/5" : tx.type === 'income' ? "border-on-surface/5 text-primary" : tx.type === 'transfer' ? "border-on-surface/5 text-secondary" : "border-on-surface/5 text-on-surface/50")}>
                        {tx.type === 'transfer' ? <ArrowUpDown size={16} className="rotate-45" /> : <IconComp size={16} />}
                      </div>
                      <div>
                        <p className={cn("text-sm font-bold leading-tight", isReversed ? "line-through text-on-surface/40" : "text-on-surface")}>
                          {tx.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {isReversed && <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase border border-amber-500/20 tracking-wider">Reversed</span>}
                          {isReversal && <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded uppercase border border-sky-500/20 tracking-wider">Reversal</span>}
                          <span className="text-[9px] font-bold text-on-surface/40 uppercase tracking-widest">{formatDate(tx.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 mt-1">
                      <p className={cn("text-base font-bold font-display tracking-tighter whitespace-nowrap", tx.type === 'income' ? "text-primary" : tx.type === 'transfer' ? "text-secondary" : "text-on-surface/80")}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pl-[52px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest font-mono">ID: TX-{tx.seqId || 'N/A'}</span>
                      <span className="text-[9px] text-on-surface/20">•</span>
                      <span className="text-[9px] font-bold text-on-surface/40 uppercase tracking-widest">{categoryName}</span>
                    </div>
                    <button onClick={() => setDeleteId(tx.id)} className="p-2 text-on-surface/20 hover:text-error transition-colors -mr-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {paged.length === 0 && (
              <div className="px-10 py-16 text-center text-on-surface/20 text-sm uppercase tracking-widest">
                {searchQuery ? 'No transactions match your search' : 'No transactions yet'}
              </div>
            )}
          </div>
        </div>
        {/* Pagination */}`);
}
fs.writeFileSync('src/views/TransactionsView.tsx', tx);

// Patch LedgerView.tsx
let lg = fs.readFileSync('src/views/LedgerView.tsx', 'utf-8');

lg = lg.replace('<table className="w-full text-left">', '<table className="w-full text-left hidden md:table">');
if (!lg.includes('{/* Mobile List */}')) {
  lg = lg.replace(/<\/table>\s*<\/div>\s*<\/div>\s*\{\/\* Detail Journal Modal \*\/\}/g, `</table>
          {/* Mobile List */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {filteredJournals.map((journal) => {
              const isReversed = journal.isReversed;
              const isReversal = journal.description.startsWith('[REVERSAL]');
              return (
                <div 
                  key={journal.id} 
                  onClick={() => setSelectedJournal(journal)}
                  className={cn(
                    "p-4 flex flex-col gap-3 transition-colors cursor-pointer group relative",
                    isReversed ? "bg-amber-500/[0.02] text-amber-500/70" : isReversal ? "bg-sky-500/[0.02] text-sky-500/70" : ""
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-bold text-on-surface/75 uppercase tracking-widest">
                          {new Date(journal.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB')}
                        </span>
                        <span className="text-[9px] font-bold text-on-surface/40 uppercase tracking-widest font-mono">
                          JRN-{journal.id.substring(journal.id.length - 6).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-xs font-bold leading-tight", isReversed ? "line-through text-on-surface/40" : "text-on-surface")}>
                          {journal.description}
                        </p>
                        {isReversed && <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">Reversed</span>}
                        {isReversal && <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 uppercase tracking-wider">Reversal</span>}
                      </div>
                      {journal.note && <p className="text-[9px] text-on-surface/40 mt-1.5">{journal.note}</p>}
                    </div>
                    <div className="text-right shrink-0 mt-1">
                      <p className="text-sm font-bold font-display tracking-tighter text-on-surface whitespace-nowrap">
                        {formatCurrency(journal.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredJournals.length === 0 && (
              <div className="px-8 py-16 text-center text-on-surface/20 text-sm uppercase tracking-widest">
                {t('ledger.noEntries')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Journal Modal */}`);
}

lg = lg.replace('<table className="w-full text-left">', '<table className="w-full text-left hidden md:table">');
if (!lg.includes('{/* Mobile Lines List */}')) {
  lg = lg.replace(/<\/table>\s*<\/div>\s*<\/div>\s*<\/motion\.div>/g, `</table>
                  {/* Mobile Lines List */}
                  <div className="md:hidden flex flex-col divide-y divide-on-surface/10 bg-on-surface/[0.01]">
                    {selectedJournal.lines.map((l: any) => {
                      let accountName = 'Unknown';
                      let accountCategory = '';
                      if (l.walletId) {
                        const w = wallets.find(w => w.id === l.walletId);
                        accountName = w ? w.name : 'Unknown';
                        accountCategory = 'ASSET';
                      } else if (l.categoryId) {
                        const c = categories.find(c => c.id === l.categoryId);
                        accountName = c ? c.name : 'Unknown';
                        accountCategory = c?.type === 'income' ? 'REVENUE' : 'EXPENSE';
                      }

                      return (
                        <div key={l.id} className="p-4 bg-on-surface/[0.01] flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-xs font-bold text-on-surface uppercase tracking-wider">{accountName}</p>
                              <p className="text-[9px] text-on-surface/40 uppercase tracking-widest mt-0.5">[{accountCategory}]</p>
                            </div>
                            <div className="text-right shrink-0 mt-1">
                              {l.type === 'DEBIT' ? (
                                <p className="text-xs font-bold text-secondary font-display whitespace-nowrap">Db: {formatCurrency(l.amount)}</p>
                              ) : (
                                <p className="text-xs font-bold text-primary font-display whitespace-nowrap">Cr: {formatCurrency(l.amount)}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-on-surface font-medium">{selectedJournal.description}</p>
                        </div>
                      );
                    })}
                    <div className="p-4 border-t-2 border-on-surface/10 bg-on-surface/[0.02] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-on-surface/40 uppercase tracking-[0.3em]">TOTAL</span>
                      <div className="text-right space-y-1">
                        <p className="text-xs font-bold text-secondary font-display tabular-nums">Db: {formatCurrency(selectedJournal.lines.filter((l:any) => l.type === 'DEBIT').reduce((s:number, l:any) => s + l.amount, 0))}</p>
                        <p className="text-xs font-bold text-primary font-display tabular-nums">Cr: {formatCurrency(selectedJournal.lines.filter((l:any) => l.type === 'CREDIT').reduce((s:number, l:any) => s + l.amount, 0))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>`);
}

fs.writeFileSync('src/views/LedgerView.tsx', lg);
