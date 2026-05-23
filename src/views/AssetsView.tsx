import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, X, TrendingUp, TrendingDown, Home, Car, Gem, Briefcase, Landmark, Calendar, FileText, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatCurrencyShort } from '../lib/types';
import { cn, getLocalDateString } from '../lib/utils';

const loc = {
  en: {
    assetsTitle: 'Asset Portfolio',
    assetsSubtitle: 'Track your investments, properties, vehicles, and total net worth.',
    newAsset: 'New Asset',
    addAsset: 'Add Asset',
    editAsset: 'Edit Asset',
    assetName: 'Asset Name',
    assetType: 'Asset Type',
    purchasePrice: 'Purchase Price',
    currentPrice: 'Current Market Price',
    purchaseDate: 'Purchase Date',
    estimatedRate: 'Annual Change Rate (%)',
    estimatedRateHelp: 'Positive for appreciation (e.g. Gold, Property), negative for depreciation (e.g. Vehicles).',
    notes: 'Notes / Certificate ID',
    saveAsset: 'Save Asset',
    updateAsset: 'Update Asset',
    netWorth: 'Net Worth',
    totalAssets: 'Total Assets',
    totalLiquid: 'Total Liquid (Wallets)',
    empty: 'No Assets Registered',
    emptySub: 'Start tracking your wealth by adding your first investment, vehicle, or property.',
    gainLoss: 'Gain / Loss',
    appreciation: 'Appreciation',
    depreciation: 'Depreciation',
    allAssets: 'All Assets',
    types: {
      investment: 'Investment / Stocks',
      property: 'Real Estate / Property',
      vehicle: 'Vehicle',
      gold: 'Gold / Precious Metals',
      other: 'Other Asset'
    }
  },
  id: {
    assetsTitle: 'Portofolio Aset',
    assetsSubtitle: 'Pantau investasi, properti, kendaraan, dan total kekayaan bersih Anda.',
    newAsset: 'Aset Baru',
    addAsset: 'Tambah Aset',
    editAsset: 'Ubah Aset',
    assetName: 'Nama Aset',
    assetType: 'Tipe Aset',
    purchasePrice: 'Harga Beli',
    currentPrice: 'Harga Pasar Saat Ini',
    purchaseDate: 'Tanggal Pembelian',
    estimatedRate: 'Tingkat Kenaikan Tahunan (%)',
    estimatedRateHelp: 'Positif untuk kenaikan nilai (Apresiasi: Emas, Rumah), negatif untuk penurunan nilai (Depresiasi: Kendaraan).',
    notes: 'Catatan / No. Sertifikat',
    saveAsset: 'Simpan Aset',
    updateAsset: 'Perbarui Aset',
    netWorth: 'Kekayaan Bersih',
    totalAssets: 'Total Aset',
    totalLiquid: 'Total Likuid (Dompet)',
    empty: 'Belum Ada Aset Terdaftar',
    emptySub: 'Mulai lacak kekayaan Anda dengan menambahkan investasi, kendaraan, atau properti pertama Anda.',
    gainLoss: 'Keuntungan / Kerugian',
    appreciation: 'Apresiasi',
    depreciation: 'Depresiasi',
    allAssets: 'Semua Aset',
    types: {
      investment: 'Investasi / Saham',
      property: 'Properti / Rumah',
      vehicle: 'Kendaraan',
      gold: 'Emas / Logam Mulia',
      other: 'Aset Lainnya'
    }
  }
};

const ASSET_TYPE_CONFIG = {
  investment: { color: '#6366F1', icon: TrendingUp, bg: 'rgba(99, 102, 241, 0.1)' },
  property: { color: '#3B82F6', icon: Home, bg: 'rgba(59, 130, 246, 0.1)' },
  vehicle: { color: '#F59E0B', icon: Car, bg: 'rgba(245, 158, 11, 0.1)' },
  gold: { color: '#FBBF24', icon: Gem, bg: 'rgba(251, 191, 36, 0.1)' },
  other: { color: '#EC4899', icon: Briefcase, bg: 'rgba(236, 72, 153, 0.1)' },
  liquid: { color: '#10B981', icon: Landmark, bg: 'rgba(16, 185, 129, 0.1)' }
};

export default function AssetsView() {
  const { assets, addAsset, updateAsset, deleteAsset, totalBalance, language, isSensored } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'investment' | 'property' | 'vehicle' | 'gold' | 'other'>('investment');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [estimatedRate, setEstimatedRate] = useState('0');
  const [notes, setNotes] = useState('');

  const activeLoc = language === 'id' ? loc.id : loc.en;

  // Analytics calculations
  const totalAssetsCurrentVal = useMemo(() => {
    return assets.reduce((sum, item) => sum + item.currentPrice, 0);
  }, [assets]);

  const netWorth = useMemo(() => {
    return totalBalance + totalAssetsCurrentVal;
  }, [totalBalance, totalAssetsCurrentVal]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {
      liquid: totalBalance,
      investment: 0,
      property: 0,
      vehicle: 0,
      gold: 0,
      other: 0,
    };

    assets.forEach(asset => {
      if (asset.type in breakdown) {
        breakdown[asset.type] += asset.currentPrice;
      } else {
        breakdown.other += asset.currentPrice;
      }
    });

    return Object.entries(breakdown).map(([key, val]) => {
      const percentage = netWorth > 0 ? Math.round((val / netWorth) * 100) : 0;
      return {
        key: key as keyof typeof ASSET_TYPE_CONFIG,
        value: val,
        percentage,
        config: ASSET_TYPE_CONFIG[key as keyof typeof ASSET_TYPE_CONFIG]
      };
    }).sort((a, b) => b.value - a.value);
  }, [assets, totalBalance, netWorth]);

  const openAdd = () => {
    setName('');
    setType('investment');
    setPurchasePrice('');
    setCurrentPrice('');
    setPurchaseDate(getLocalDateString());
    setEstimatedRate('0');
    setNotes('');
    setEditingId(null);
    setIsAdding(true);
  };

  const openEdit = (asset: any) => {
    setName(asset.name);
    setType(asset.type);
    setPurchasePrice(asset.purchasePrice.toString());
    setCurrentPrice(asset.currentPrice.toString());
    setPurchaseDate(getLocalDateString(asset.purchaseDate));
    setEstimatedRate(asset.estimatedRate.toString());
    setNotes(asset.notes || '');
    setEditingId(asset.id);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !purchasePrice || !currentPrice) return;

    const data = {
      name,
      type,
      purchasePrice: parseFloat(purchasePrice),
      currentPrice: parseFloat(currentPrice),
      purchaseDate: purchaseDate || new Date().toISOString(),
      estimatedRate: parseFloat(estimatedRate) || 0,
      notes
    };

    if (editingId) {
      await updateAsset(editingId, data);
    } else {
      await addAsset(data);
    }
    setIsAdding(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tighter uppercase">{activeLoc.assetsTitle}</h2>
          <p className="text-on-surface/40 mt-3 text-sm uppercase tracking-widest font-medium">{activeLoc.assetsSubtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-on-surface px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2"
        >
          <Plus size={16} /> {activeLoc.newAsset}
        </button>
      </header>

      {/* Net Worth & Allocation Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Net Worth Box */}
        <div className="glass rounded-[32px] p-8 flex flex-col justify-between relative overflow-hidden group min-h-[220px]">
          <div className="absolute top-0 right-0 w-48 h-48 opacity-10 bg-primary rounded-full blur-[50px] pointer-events-none" />
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">{activeLoc.netWorth}</p>
            <h3 className="text-4xl lg:text-5xl font-display font-bold tracking-tighter text-on-surface truncate">
              {formatCurrency(netWorth, isSensored)}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-th-divider mt-6">
            <div>
              <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest">{activeLoc.totalLiquid}</p>
              <p className="text-md font-bold text-emerald-400 mt-1 truncate">{formatCurrencyShort(totalBalance, isSensored)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest">{activeLoc.totalAssets}</p>
              <p className="text-md font-bold text-indigo-400 mt-1 truncate">{formatCurrencyShort(totalAssetsCurrentVal, isSensored)}</p>
            </div>
          </div>
        </div>

        {/* Allocation breakdown box */}
        <div className="glass rounded-[32px] p-8 lg:col-span-2 flex flex-col justify-between min-h-[220px]">
          <div>
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-4">Allocation Breakdown</p>
            
            {/* Visual allocation progress bar */}
            <div className="w-full h-3 rounded-full flex overflow-hidden mb-6 bg-on-surface/5">
              {categoryBreakdown.map((item) => (
                item.value > 0 && (
                  <div
                    key={item.key}
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.config.color
                    }}
                    className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                    title={`${item.key}: ${item.percentage}%`}
                  />
                )
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryBreakdown.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.config.color }} />
                  <span className="text-[9px] font-bold text-on-surface/40 uppercase tracking-wider truncate max-w-[80px]">
                    {item.key === 'liquid' ? (language === 'id' ? 'Likuid' : 'Liquid') : activeLoc.types[item.key as 'investment']}
                  </span>
                </div>
                <p className="text-sm font-bold text-on-surface tabular-nums">
                  {item.percentage}%
                </p>
                <p className="text-[10px] text-on-surface/30 truncate">
                  {formatCurrencyShort(item.value, isSensored)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Cards list */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-on-surface/40 uppercase tracking-widest ml-2">{activeLoc.allAssets}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => {
            const config = ASSET_TYPE_CONFIG[asset.type as keyof typeof ASSET_TYPE_CONFIG] || ASSET_TYPE_CONFIG.other;
            const Icon = config.icon;
            const gainLossVal = asset.currentPrice - asset.purchasePrice;
            const gainLossPct = asset.purchasePrice > 0 ? (gainLossVal / asset.purchasePrice) * 100 : 0;
            const isProfit = gainLossVal >= 0;

            return (
              <div key={asset.id} className="glass rounded-[32px] p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] blur-[40px] pointer-events-none transition-all duration-500 group-hover:opacity-[0.08]" style={{ backgroundColor: config.color }} />
                
                {/* Top bar with Icon and actions */}
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-on-surface/5" style={{ color: config.color, backgroundColor: config.bg }}>
                    <Icon size={24} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(asset)} className="p-2 text-on-surface/40 hover:text-on-surface bg-surface-container rounded-xl transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteAsset(asset.id)} className="p-2 text-on-surface/40 hover:text-error bg-surface-container rounded-xl transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Name and Type */}
                <div>
                  <h4 className="font-bold text-lg text-on-surface uppercase tracking-widest truncate">{asset.name}</h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-on-surface/5 text-on-surface/50 uppercase tracking-widest inline-block mt-1.5">
                    {activeLoc.types[asset.type as keyof typeof activeLoc.types]}
                  </span>
                </div>

                {/* Rates / Appreciation / Depreciation */}
                <div className="mt-4 flex items-center gap-1.5 text-xs">
                  {asset.estimatedRate > 0 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <TrendingUp size={12} /> +{asset.estimatedRate}%/yr
                    </span>
                  ) : asset.estimatedRate < 0 ? (
                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                      <TrendingDown size={12} /> {asset.estimatedRate}%/yr
                    </span>
                  ) : (
                    <span className="text-on-surface/40 font-bold">
                      0%/yr
                    </span>
                  )}
                  <span className="text-on-surface/20">|</span>
                  <span className="text-on-surface/40 text-[10px] uppercase tracking-wider truncate">
                    {asset.estimatedRate >= 0 ? activeLoc.appreciation : activeLoc.depreciation}
                  </span>
                </div>

                {/* Purchase Price vs Current Market Price */}
                <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-on-surface/5">
                  <div>
                    <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest block">{activeLoc.purchasePrice}</span>
                    <span className="text-sm font-bold text-on-surface block mt-1 truncate">
                      {formatCurrency(asset.purchasePrice, isSensored)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest block">{activeLoc.currentPrice}</span>
                    <span className="text-sm font-bold text-on-surface block mt-1 truncate">
                      {formatCurrency(asset.currentPrice, isSensored)}
                    </span>
                  </div>
                </div>

                {/* Unrealized Gain/Loss badge */}
                <div className="mt-4 pt-4 border-t border-on-surface/5 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest">{activeLoc.gainLoss}</span>
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    isProfit ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
                  )}>
                    {isProfit ? '+' : ''}{formatCurrencyShort(gainLossVal, isSensored)} ({isProfit ? '+' : ''}{gainLossPct.toFixed(1)}%)
                  </span>
                </div>

                {/* Notes footer */}
                {asset.notes && (
                  <div className="mt-4 flex items-start gap-1.5 text-[10px] text-on-surface/40 bg-on-surface/[0.02] p-2 rounded-xl">
                    <FileText size={10} className="shrink-0 mt-0.5" />
                    <span className="truncate">{asset.notes}</span>
                  </div>
                )}
              </div>
            );
          })}

          {assets.length === 0 && (
            <div className="col-span-full py-20 text-center glass rounded-[32px] border-dashed border-2 border-on-surface/10">
              <Landmark size={48} className="mx-auto text-on-surface/20 mb-4" />
              <h3 className="font-bold text-lg text-on-surface uppercase tracking-widest mb-2">{activeLoc.empty}</h3>
              <p className="text-sm text-on-surface/40 font-medium max-w-md mx-auto">{activeLoc.emptySub}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="w-full max-w-lg glass-dark rounded-t-[32px] lg:rounded-[32px] p-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pb-8 border-t lg:border border-on-surface/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-on-surface/40 hover:text-on-surface">
                <X size={20} />
              </button>

              <h3 className="font-display text-2xl font-bold text-on-surface tracking-tighter uppercase mb-8">
                {editingId ? activeLoc.editAsset : activeLoc.newAsset}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.assetName}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rumah Pondok Indah"
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.assetType}</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all appearance-none cursor-pointer"
                  >
                    {Object.keys(activeLoc.types).map((k) => (
                      <option key={k} value={k} className="bg-surface text-on-surface">
                        {activeLoc.types[k as keyof typeof activeLoc.types]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.purchasePrice}</label>
                    <input
                      type="number"
                      required
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0"
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.currentPrice}</label>
                    <input
                      type="number"
                      required
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      placeholder="0"
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                </div>

                {/* Date & Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.purchaseDate}</label>
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.estimatedRate}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedRate}
                      onChange={(e) => setEstimatedRate(e.target.value)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                </div>

                {/* Helper text for Rate */}
                <div className="flex items-start gap-2 bg-on-surface/[0.02] p-3 rounded-2xl">
                  <Info size={14} className="text-on-surface/40 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-on-surface/40 font-medium leading-relaxed">
                    {activeLoc.estimatedRateHelp}
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{activeLoc.notes}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Sertifikat Hak Milik (SHM) No. 12345"
                    rows={2}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-4 mt-4 bg-primary text-on-surface rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl">
                  {editingId ? activeLoc.updateAsset : activeLoc.saveAsset}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
