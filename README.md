# 🍲 ResepLaba (GTNIC 2026)
> **Platform Kasir Pintar (POS), Konversi Inventori Racikan/Eceran, & Penjaga Margin Adaptif untuk UMKM**  
> *Garda Tech National Innovation Competition (GTNIC) 2026 — Web Development Category*  
> **Subtema**: *Accelerating Digital Transformation for Business and SMEs*  
> **Tim**: Foxy75, r4rdi, Zynsykes

---

## 📌 1. Deskripsi Masalah & Solusi

### ⚠️ Masalah Utama UMKM (Warung Madura, Warmindo, Warkop, Bakery Rumahan)
1. **Friction Grosir ke Eceran (*Bulk-to-Retail*)**: Belanja dalam satuan grosir (1 kardus mie isi 40 pcs, 1 krat telur 240 butir, 1 karung beras 25 kg), namun dijual satuan atau diracik menjadi menu matang (contoh: *Mie Goreng Telur + Nasi*). Konversi manual sering menyebabkan selisih stok dan kebocoran modal.
2. **Kerugian Barang Kedaluwarsa (*Food Waste*)**: Tanpa pelacakan batch, barang lama di belakang etalase luput dari perhatian hingga melewati tanggal kedaluwarsa.
3. **Kenaikan Harga Bahan Pokok (*Margin Blindness*)**: Kenaikan harga telur atau minyak sering tidak langsung disesuaikan dengan harga jual porsi, membuat pedagang merasa ramai pembeli tapi keuntungannya habis tergerus modal.
4. **Hambatan Aksesibilitas Aplikasi Kasir Konvensional**: Aplikasi enterprise terlalu rumit untuk warung dengan 1 pemilik dan 1–2 penjaga.

### 💡 Solusi ResepLaba
ResepLaba menghadirkan sistem web kasir pintar berbasis **Dual-Mode (Penjaga vs. Juragan dengan PIN 4-digit)**, dilengkapi **Smart Bill of Materials (BoM)** untuk otomatisasi pemotongan stok racikan, algoritma **FEFO (First Expired, First Out)** berbasis batch, serta **Margin Guard & Price Simulator** yang memperingatkan pemilik saat margin berada di bawah batas aman.

---

## 🎯 2. Fitur Utama & Target Pengguna

### Target Pengguna
- **Warung Kelontong / Madura** (fokus konversi dus ke eceran & alert kedaluwarsa FEFO)
- **Warmindo & Warkop** (fokus resep racikan instan & kalkulasi HPP otomatis)
- **Toko Roti / Usaha Kuliner Rumahan** (fokus takaran gram/ml & pelacakan susut/waste)
- **Platform Super Admin** (pemantauan UMKM, starter template instan, broadcast harga nasional)

### Fitur Unggulan
- ⚡ **Dual-Mode Warung (Mode Penjaga & Mode Juragan Lock PIN)**: Akses POS cepat 1-ketuk untuk kasir/penjaga tanpa membuka akses laporan keuangan rahasia pemilik.
- 📦 **Universal Unit Conversion & Smart BoM**: Otomatis potong stok bahan baku saat menu racikan terjual.
- ⏳ **FEFO Inventory Batch Engine**: Memotong stok dari batch kedaluwarsa terdekat dan memberikan peringatan visual H-3 sebelum expired.
- 🛡️ **Margin Guard & Simulator Kenaikan Modal**: Simulasi harga jual baru secara *real-time* dengan slider saat harga modal naik.
- 🤖 **AI Scan Nota Kulakan (Human-in-the-Loop)**: Ekstraksi foto nota kertas belanjaan menjadi draft restock siap verifikasi.
- 🧪 **1-Click Judge Sandbox**: Tombol cepat untuk dewan juri menguji simulasi langsung tanpa mendaftar dari awal.

---

## 🏗️ 3. Tech Stack & Arsitektur

* **Frontend**: Next.js 14/15 (App Router), TypeScript, Tailwind CSS, Lucide React, Shadcn/UI
* **Backend**: Laravel 11 REST API (PHP 8.2+), Laravel Sanctum, Guzzle HTTP
* **Database**: PostgreSQL (Supabase) / MySQL dengan dukungan transaksi ACID & row-level locking
* **Eksternal**: Google Gemini 2.5 Flash API (OCR Nota), Cron-job.org (Daily Expiry Ping), Telegram Bot API

### Struktur Direktori Repositori
```text
ResepLaba-GTNIC/
├── frontend/                # Next.js App Router Frontend
├── backend/                 # Laravel 11 REST API
├── database/                # Schema SQL & Migration References
│   └── schema.sql
├── docs/                    # Dokumentasi Teknis, Arsitektur & PRD
│   ├── ARCHITECTURE.md
│   └── PRD.md
├── README.md                # Dokumentasi utama proyek
├── .gitignore               # Konfigurasi ignore file & secret
└── LICENSE                  # MIT License
```

---

## 🚀 4. Cara Instalasi & Menjalankan Aplikasi

### Prasyarat
- Node.js >= 18.x
- PHP >= 8.2 & Composer
- PostgreSQL atau MySQL

### 1. Setup Backend (Laravel 11)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
Backend berjalan di: `http://127.0.0.1:8000`

### 2. Setup Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Frontend berjalan di: `http://localhost:3000`

---

## 🔑 5. Environment Variables

### Backend (`backend/.env`)
```env
APP_NAME=ResepLaba-API
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

FRONTEND_URL=http://localhost:3000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=reseplaba
DB_USERNAME=postgres
DB_PASSWORD=

GEMINI_API_KEY=your_gemini_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
CRON_SECRET_TOKEN=your_secure_cron_token_here
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME="ResepLaba"
```

---

## 🌐 6. Link Live, Screenshot & Dokumentasi

- **Live Web App**: *Akan dicantumkan setelah deployment di Vercel*
- **Live Backend API**: *Akan dicantumkan setelah deployment di Render/VPS*
- **Dokumentasi Lengkap**: [docs/README.md](file:///m:/coding/ResepLaba-GTNIC/docs/README.md)
- **Demo Akun Juri (1-Click Sandbox)**:
  - 🏪 *Warung Madura Berkah*
  - 🍜 *Warmindo Cak Budi*
  - 👑 *Platform Super Admin*

---
*Dibuat untuk Garda Tech National Innovation Competition (GTNIC) 2026.*
