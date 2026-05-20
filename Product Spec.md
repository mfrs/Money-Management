# Product Specification: Wealth Manager (Stashly)

## 1. Ringkasan Produk (Product Overview)
**Nama Produk:** Wealth Manager (Internal Name: Stashly)  
**Tujuan Utama:** Aplikasi manajemen keuangan pribadi (Personal Finance Management) kelas enterprise yang didesain secara modern dengan arsitektur pembukuan entri ganda (Double-Entry Bookkeeping). Aplikasi ini dirancang untuk memberikan kontrol penuh kepada pengguna atas aset, hutang, anggaran, dan arus kas mereka, didukung dengan asisten AI untuk mempermudah pencatatan.

## 2. Arsitektur & Teknologi (Tech Stack)
* **Frontend:** React.js (Vite), TypeScript, Tailwind CSS, Framer Motion (untuk animasi UI), Recharts (untuk grafik data).
* **Backend:** Node.js, Express.js.
* **Database & ORM:** PostgreSQL (NeonDB), Prisma ORM.
* **Authentication:** JWT (JSON Web Tokens).
* **Infrastruktur / Deployment:** Vercel (Frontend & Serverless Backend).
* **AI Integration:** Google Gemini API (untuk pemindaian struk dan asisten obrolan pencatatan).

## 3. Pengguna Target (Target Audience)
* Individu yang ingin melacak pengeluaran dan pemasukan harian dengan detail akuntansi profesional (debit/kredit).
* Profesional yang memiliki berbagai jenis aset (saham, properti) dan hutang yang kompleks.
* Pengguna yang menginginkan efisiensi pencatatan melalui otomatisasi AI.

---

## 4. Fitur Utama (Core Features)

### 4.1. Manajemen Pengguna & Autentikasi (Auth)
* **Registrasi & Login:** Sistem login aman berbasis email dan password.
* **Profil Pengguna:** Kustomisasi nama, preferensi mata uang (Currency), dan tema (Dark/Light Mode).
* **Sensor Mode:** Tombol toggle (ikon mata) untuk menyembunyikan nominal saldo dari layar (menjaga privasi saat berada di tempat umum).
* **Backup & Restore:** Pengguna dapat mengunduh seluruh data finansial mereka dalam format JSON dan merestorasinya kembali kapan saja.

### 4.2. Dompet & Rekening (Wallets)
* Pembuatan multi-dompet dengan berbagai tipe: *Cash, Bank, E-Wallet, Credit Card, Investment*.
* Pelacakan saldo dinamis (Real-time Balance) yang terhubung langsung dengan sistem General Ledger.

### 4.3. Pencatatan Transaksi (General Ledger / Journals)
* **Double-Entry Bookkeeping:** Setiap transaksi dicatat secara presisi menggunakan sistem Debit dan Kredit, memastikan keseimbangan (Balance) pada laporan keuangan.
* Dukungan transaksi multi-baris (Split transactions) untuk satu entri jurnal.
* Label Kategori (Income/Expense) yang dapat dikustomisasi.

### 4.4. Anggaran (Budgeting)
* **Income Sources (Sumber Pendapatan):** Proyeksi pendapatan bulanan.
* **Fixed Expenses (Pengeluaran Tetap):** Pencatatan tagihan rutin bulanan dengan pengingat tanggal jatuh tempo (Due Date).
* **Wallet Allocations (Alokasi Dompet):** Perencanaan distribusi dana ke berbagai dompet saat gajian/awal bulan.

### 4.5. Manajemen Aset & Kekayaan (Assets Tracking)
* Pelacakan aset fisik dan digital (Properti, Kendaraan, Emas, Investasi).
* Perbandingan Nilai Beli (Purchase Price) dengan Nilai Saat Ini (Current Price) untuk mengetahui *Capital Gain/Loss*.

### 4.6. Hutang & Piutang (Debts & Loans)
* Manajemen Hutang (Uang yang dipinjam) dan Piutang (Uang yang dipinjamkan).
* Pencatatan cicilan/pembayaran parsial secara historis.
* Dukungan kalkulasi Suku Bunga (Interest Rate) dan tanggal jatuh tempo.

### 4.7. Tujuan Finansial (Financial Goals)
* Menetapkan target tabungan (misal: "Beli Mobil", "Dana Darurat").
* Indikator *Progress Bar* visual dan batas waktu (Deadline).
* Terhubung dengan notifikasi peringatan jika deadline sudah dekat.

---

## 5. Fitur Cerdas & Analitik (Smart Features & Analytics)

### 5.1. Asisten AI (AI Integration)
* **Receipt Scanner (OCR):** Pengguna dapat mengunggah foto struk belanja. AI akan mendeteksi total belanja dan kategori barang, lalu menyiapkannya sebagai draf transaksi.
* **Natural Language Chat (Chatbot Entry):** Pengguna cukup mengetik pesan seperti *"Saya tadi makan siang habis 50 ribu pakai Gopay"*. AI akan otomatis menerjemahkannya ke jurnal *Double-Entry* (Debit: Makanan, Kredit: Gopay).

### 5.2. Pelaporan & Analitik (Reporting)
* Dasbor visual yang menampilkan *Burn Rate* harian, Net Worth (Kekayaan Bersih), dan arus kas.
* Grafik Bar dan Pie interaktif untuk membedah kategori pengeluaran terbesar.
* **PDF Report Export:** Pembuatan laporan profesional dalam bentuk PDF (tanpa tangkapan layar / *native text*), yang memuat kartu metrik, wawasan cerdas, dan tabel jurnal secara terstruktur dengan tema terang (Light Theme) yang ramah cetak.

### 5.3. Sistem Notifikasi Pintar (TopBar Notifications)
* Indikator lonceng merah yang memberikan peringatan jika:
  * Ada pengeluaran tetap (Fixed Expense) yang jatuh tempo dalam 3 hari.
  * Ada pengeluaran tetap yang sudah lewat jatuh tempo.
  * Ada batas waktu (Deadline) tujuan finansial yang tersisa 7 hari lagi.

---

## 6. Panel Administrator (Admin Panel)

*Area khusus yang hanya bisa diakses oleh pengguna dengan hak akses `isAdmin = true`.*

### 6.1. Manajemen Pengguna (User Overview)
* Melihat daftar seluruh pengguna terdaftar, jumlah dompet, dan jurnal transaksi yang mereka miliki.
* Fitur Hapus Akun Pengguna secara permanen.

### 6.2. Manajemen Patch Notes / Changelog
* Sistem *Draft* & *Publish* untuk catatan pembaruan aplikasi.
* Editor berbasis **Markdown** yang fleksibel.
* **Integrasi GitHub Webhook & API:** 
  * Kemampuan untuk menarik riwayat commit secara *on-demand* dengan satu klik tombol **Sync GitHub**.
  * Dukungan *Webhook* dari GitHub untuk secara otomatis membuat draf *Changelog* baru saat terjadi Push ke branch `main`.

### 6.3. Monitoring Database (PGMonitor)
* Pemantauan kondisi database PostgreSQL secara real-time.
* Menampilkan ukuran tabel, index, *cache hit ratio*, dan koneksi aktif.
* **Export Data (Backup Server):** Fitur untuk mengunduh tabel database tertentu secara mentah dalam format CSV.

---

## 7. Desain & Antarmuka (UI/UX)
* **Desain Neumorphism / Glassmorphism:** Efek kaca tembus pandang pada komponen kartu dan navigasi, dipadukan dengan aksen warna primer yang tegas.
* **Responsif:** Berfungsi optimal di peramban Desktop maupun *Mobile browser*.
* **Modal "What's New":** Muncul bagi pengguna akhir melalui ikon Megafon di *TopBar*. Fitur ini menampilkan riwayat pembaruan (Changelog) dengan indikator titik merah berkedip (*pulsing red dot*) jika ada rilis baru yang belum dibaca (disimpan lewat *localStorage*).

---

## 8. Skalabilitas & Limitasi (Saat Ini)
* **Vercel Serverless Limits:** Backend dipecah menjadi *Single Serverless Function* (`api/index.ts`) menggunakan *Express Router* untuk menghindari limitasi 12 Fungsi pada Vercel Hobby Plan.
* **Database Connection Pooling:** Menggunakan Prisma Client standar. Sangat disarankan mengaktifkan PgBouncer atau Neon Connection Pooling jika *traffic* mulai tinggi.

---
*Dokumen ini dibuat secara otomatis (Generated) untuk merepresentasikan kondisi, kemampuan, dan arsitektur produk Wealth Manager (Stashly).*
