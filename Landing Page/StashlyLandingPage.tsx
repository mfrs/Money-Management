import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Database, 
  MessageSquare, 
  Wallet, 
  EyeOff, 
  FileText,
  PieChart,
  BarChart4,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const StashlyLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Stashly</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <a href="#fitur" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Fitur</a>
          <a href="#teknologi" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Teknologi</a>
        </div>
        <button className="px-5 py-2.5 text-sm font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-lg">
          Masuk
        </button>
      </nav>

      <main className="relative z-10">
        
        {/* Section 1: Hero Section */}
        <section className="pt-24 pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-500/20 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Memperkenalkan Manajemen Kekayaan Era Baru
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6"
          >
            Kendali Penuh atas Kekayaan Anda, dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Presisi Akuntansi</span> dan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Kemudahan AI</span>.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mb-10 leading-relaxed"
          >
            Stashly menggabungkan sistem pembukuan entri ganda (double-entry) kelas enterprise dengan asisten AI pintar. Catat transaksi secepat berkirim pesan, lacak aset secara real-time, dan jaga privasi Anda sepenuhnya.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button className="px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group">
              Mulai Kelola Finansial Gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Hero Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="w-full max-w-5xl mt-20 p-4 rounded-3xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/60 shadow-2xl"
          >
            <div className="rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="p-8 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-6">
                  <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-neutral-500">Total Net Worth</p>
                        <h3 className="text-3xl font-bold mt-1">Rp 1.240.500.000</h3>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="h-24 flex items-end gap-2">
                      {[40, 50, 45, 60, 55, 75, 65, 80, 90, 85, 100].map((h, i) => (
                        <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm" style={{ height: `${h}%` }}>
                          <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: '40%' }}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                      <p className="text-sm text-neutral-500">Liquid Assets</p>
                      <h4 className="text-xl font-semibold mt-1">Rp 340.500.000</h4>
                    </div>
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                      <p className="text-sm text-neutral-500">Investments</p>
                      <h4 className="text-xl font-semibold mt-1">Rp 900.000.000</h4>
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-80 p-6 rounded-2xl bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium">Stashly AI</span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="p-3 rounded-xl rounded-tr-sm bg-white dark:bg-neutral-800 shadow-sm text-sm ml-8">
                      Makan siang 150rb pakai BCA
                    </div>
                    <div className="p-4 rounded-xl rounded-tl-sm bg-blue-600 text-white shadow-sm text-sm mr-8">
                      <p className="mb-2 opacity-90">Dicatat! Jurnal telah dibuat:</p>
                      <div className="bg-blue-700/50 rounded p-2 text-xs font-mono space-y-1">
                        <div className="flex justify-between"><span>Dr. Makanan</span><span>150.000</span></div>
                        <div className="flex justify-between"><span>Cr. Bank BCA</span><span>150.000</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-white/60 dark:bg-neutral-800/60 border border-white dark:border-neutral-700 text-sm text-neutral-400 flex justify-between items-center">
                    <span>Ketik transaksi Anda...</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section 2: Social Proof / Metric Cards */}
        <section className="py-20 px-6 bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl border-y border-neutral-200/50 dark:border-neutral-800/50">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-3xl bg-white/50 dark:bg-neutral-800/50 border border-white dark:border-neutral-700/50 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">100% Presisi Balans</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Dibangun dengan fondasi akuntansi entri ganda (double-entry). Setiap sen yang masuk dan keluar memiliki jejak yang jelas tanpa selisih.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-8 rounded-3xl bg-white/50 dark:bg-neutral-800/50 border border-white dark:border-neutral-700/50 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Otomatisasi AI Instan</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Ketik menggunakan bahasa natural atau unggah struk belanja. Asisten AI kami akan menerjemahkannya menjadi jurnal akuntansi dalam hitungan detik.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-8 rounded-3xl bg-white/50 dark:bg-neutral-800/50 border border-white dark:border-neutral-700/50 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                <Database className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Data Milik Anda Sepenuhnya</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Tidak ada penguncian ekosistem (vendor lock-in). Bebas cadangkan, ekspor, dan impor data finansial Anda dalam format JSON kapan saja.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Section 3: Core Features Showcase */}
        <section id="fitur" className="py-32 px-6 max-w-7xl mx-auto space-y-32">
          
          {/* Feature 1 */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 space-y-6"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Asisten AI Pintar yang Memahami Konteks</h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Berhenti mengisi formulir yang rumit. Cukup ketik "Makan siang 50rb pakai Gopay", dan teknologi Gemini API kami secara otomatis mengubahnya menjadi draf jurnal yang akurat: <span className="font-medium text-neutral-900 dark:text-neutral-200">Debit pada kategori Makanan, dan Kredit pada E-Wallet</span>.
              </p>
              <ul className="space-y-3 mt-6">
                {['Mendukung bahasa sehari-hari', 'Deteksi multi-kategori otomatis', 'Pembacaan OCR dari foto struk'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full"
            >
              <div className="relative p-2 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20">
                <div className="absolute inset-0 backdrop-blur-3xl rounded-3xl"></div>
                <div className="relative bg-white dark:bg-neutral-900 border border-white/50 dark:border-neutral-700 rounded-2xl p-6 shadow-xl">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800"></div>
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm">
                        Beli kopi kenangan 25k pakai OVO
                      </div>
                    </div>
                    <div className="flex gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl rounded-tr-none p-4 w-full max-w-sm">
                        <p className="text-sm font-medium mb-3">Jurnal Siap Disimpan</p>
                        <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 text-sm font-mono space-y-2 shadow-sm">
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>Kopi & Minuman</span>
                            <span className="text-emerald-600 dark:text-emerald-400">Rp 25.000</span>
                          </div>
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>Dompet OVO</span>
                            <span className="text-red-500 dark:text-red-400">-Rp 25.000</span>
                          </div>
                        </div>
                        <button className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Konfirmasi</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 space-y-6"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                <BarChart4 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Lacak Aset & Portofolio dalam Satu Dasbor</h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Mulai dari uang tunai, rekening bank, reksadana, hingga properti fisik. Bandingkan harga beli awal (Cost Basis) dengan nilai saat ini untuk memonitor <span className="font-medium text-neutral-900 dark:text-neutral-200">Capital Gain & Loss</span> secara real-time.
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full"
            >
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
                <div className="space-y-4">
                  {[
                    { name: 'Rekening Mandiri', type: 'Bank', amount: 'Rp 45.000.000', gain: '+0%', color: 'bg-blue-500' },
                    { name: 'Saham BBCA', type: 'Investasi', amount: 'Rp 120.500.000', gain: '+12.4%', color: 'bg-indigo-500' },
                    { name: 'Emas Antam 50g', type: 'Komoditas', amount: 'Rp 65.200.000', gain: '+5.2%', color: 'bg-amber-500' }
                  ].map((asset, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${asset.color} flex items-center justify-center text-white font-bold`}>
                          {asset.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-xs text-neutral-500">{asset.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{asset.amount}</p>
                        <p className="text-xs text-emerald-500">{asset.gain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 space-y-6"
            >
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <EyeOff className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Privasi Maksimal di Tempat Umum</h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Gunakan <span className="font-medium text-neutral-900 dark:text-neutral-200">Sensor Mode</span>. Hanya dengan satu klik pada ikon mata, seluruh nominal sensitif akan langsung disembunyikan. Kini Anda bisa mencatat pengeluaran di kafe atau transportasi umum tanpa khawatir diintip.
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full flex justify-center"
            >
              <div className="w-72 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div className="pt-8 pb-4 text-center border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm text-neutral-500 mb-2">Total Saldo</p>
                  <div className="text-3xl font-mono font-bold tracking-widest text-neutral-300 dark:text-neutral-700">
                    Rp ••••••••
                  </div>
                </div>
                <div className="pt-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
                        <div className="w-20 h-4 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                      </div>
                      <div className="w-16 h-4 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

        </section>

        {/* Section 4: Deep Dive for Tech-Savvy & Enterprise */}
        <section id="teknologi" className="py-24 bg-neutral-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Dibangun untuk Skalabilitas Tinggi</h2>
              <p className="text-neutral-400 text-lg">
                Di balik antarmuka yang indah, Stashly ditenagai oleh arsitektur perangkat lunak yang dirancang untuk performa, keamanan, dan keandalan data level enterprise.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-8 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors">
                <FileText className="w-8 h-8 text-blue-400 mb-5" />
                <h3 className="text-xl font-bold mb-3">Laporan PDF Native</h3>
                <p className="text-neutral-400">Pembuatan laporan finansial profesional (Buku Besar, Neraca, Laba Rugi) langsung dari sistem, ramah cetak untuk evaluasi bulanan tanpa perlu tangkapan layar.</p>
              </div>
              <div className="p-8 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors">
                <PieChart className="w-8 h-8 text-emerald-400 mb-5" />
                <h3 className="text-xl font-bold mb-3">Sistem Budgeting Ketat</h3>
                <p className="text-neutral-400">Alokasi dompet (Zero-based budgeting) di awal bulan, dengan pencatatan pengeluaran tetap (Fixed Expenses) dan notifikasi jatuh tempo yang terintegrasi.</p>
              </div>
              <div className="p-8 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors">
                <Database className="w-8 h-8 text-indigo-400 mb-5" />
                <h3 className="text-xl font-bold mb-3">PostgreSQL & Prisma ORM</h3>
                <p className="text-neutral-400">Integritas data dijamin melalui relasi basis data yang kuat. Relasional murni yang memastikan tidak ada transaksi yang terputus atau saldo "nyangkut".</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Call to Action Final */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            <div className="relative p-12 md:p-20 text-center flex flex-col items-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Siap Naik Kelas dalam Mengelola Keuangan?
              </h2>
              <p className="text-blue-100 text-lg md:text-xl max-w-2xl mb-10">
                Bergabunglah dengan sistem manajemen kekayaan yang dirancang untuk masa depan finansial Anda. Mulai bangun kebiasaan akuntansi profesional hari ini.
              </p>
              <button className="px-8 py-4 text-lg font-bold text-blue-900 bg-white rounded-full hover:bg-neutral-100 transition-transform hover:scale-105 shadow-xl flex items-center gap-2">
                Ambil Kendali Sekarang
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            <span className="text-lg font-bold">Stashly</span>
          </div>
          <p className="text-neutral-500 text-sm">
            © 2026 Stashly Wealth Manager. Hak cipta dilindungi.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default StashlyLandingPage;
