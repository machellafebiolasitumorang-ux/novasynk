# NOVASYNK — Platform Manajemen Organisasi

Aplikasi web manajemen organisasi dengan fitur dokumen cloud, chat tim, manajemen tugas, dan jadwal. Dibangun dengan Next.js + Supabase.

---

## 🚀 PANDUAN DEPLOY (30 Menit)

### Langkah 1 — Setup Supabase (10 menit)

1. Buka https://supabase.com dan login / daftar gratis
2. Klik **"New Project"**, beri nama `novasynk`, pilih region terdekat (Singapore), buat password database
3. Tunggu project siap (~2 menit)

**Setup Database:**
4. Buka **SQL Editor** di sidebar kiri
5. Copy seluruh isi file `lib/schema.sql` → Paste → Klik **Run**
6. Buka SQL Editor lagi → Copy isi `lib/storage.sql` → Paste → Klik **Run**

**Buat 5 User:**
7. Buka **Authentication → Users → Add User (Confirm email)**
8. Buat akun satu per satu:

| Nama     | Email                      | Password   |
|----------|---------------------------|------------|
| Machella | machella@novasynk.app     | Nova@2026  |
| Desi     | desi@novasynk.app         | Nova@2026  |
| Dhisry   | dhisry@novasynk.app       | Nova@2026  |
| Maydela  | maydela@novasynk.app      | Nova@2026  |
| Kholil   | kholil@novasynk.app       | Nova@2026  |

9. Setelah semua user dibuat, buka **SQL Editor** → jalankan:
```sql
INSERT INTO public.profiles (id, name, email, role)
SELECT id, 
  CASE email
    WHEN 'machella@novasynk.app' THEN 'Machella'
    WHEN 'desi@novasynk.app' THEN 'Desi'
    WHEN 'dhisry@novasynk.app' THEN 'Dhisry'
    WHEN 'maydela@novasynk.app' THEN 'Maydela'
    WHEN 'kholil@novasynk.app' THEN 'Kholil'
  END,
  email,
  CASE WHEN email = 'machella@novasynk.app' THEN 'admin' ELSE 'member' END
FROM auth.users
WHERE email IN ('machella@novasynk.app','desi@novasynk.app','dhisry@novasynk.app','maydela@novasynk.app','kholil@novasynk.app');
```

**Ambil API Keys:**
10. Buka **Project Settings → API**
11. Salin:
    - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
    - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

### Langkah 2 — Upload ke GitHub (5 menit)

1. Buka https://github.com → login → **New Repository**
2. Beri nama `novasynk`, pilih **Private**, klik **Create**
3. Download/clone repository ini ke komputer kamu
4. Copy semua file proyek ke folder tersebut
5. Buat file `.env.local` (salin dari `.env.local.example`, isi dengan key Supabase kamu)
6. Push ke GitHub:
```bash
git init
git add .
git commit -m "Initial NOVASYNK"
git branch -M main
git remote add origin https://github.com/USERNAME/novasynk.git
git push -u origin main
```

---

### Langkah 3 — Deploy ke Vercel (5 menit)

1. Buka https://vercel.com → login dengan GitHub
2. Klik **"Add New Project"** → pilih repository `novasynk`
3. Buka **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL dari Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key dari Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key
   - `NEXT_PUBLIC_APP_URL` = `https://novasynk.vercel.app` (atau nama project kamu)
4. Klik **Deploy**
5. Tunggu 2-3 menit → aplikasi online!

---

### Langkah 4 — Update APP URL di Supabase

Setelah dapat URL Vercel:
1. Buka Supabase → **Authentication → URL Configuration**
2. **Site URL**: `https://novasynk.vercel.app`
3. **Redirect URLs**: `https://novasynk.vercel.app/**`
4. Klik **Save**

---

## 📱 Akun Demo

| Nama     | Email                      | Password   | Role  |
|----------|---------------------------|------------|-------|
| Machella | machella@novasynk.app     | Nova@2026  | Admin |
| Desi     | desi@novasynk.app         | Nova@2026  | Member|
| Dhisry   | dhisry@novasynk.app       | Nova@2026  | Member|
| Maydela  | maydela@novasynk.app      | Nova@2026  | Member|
| Kholil   | kholil@novasynk.app       | Nova@2026  | Member|

---

## 📁 Struktur Folder

```
novasynk/
├── pages/
│   ├── _app.tsx          # App wrapper + auth guard
│   ├── index.tsx         # Dashboard
│   ├── login.tsx         # Halaman login
│   ├── tasks.tsx         # Manajemen tugas (Kanban)
│   ├── chat.tsx          # Chat tim (realtime)
│   ├── docs.tsx          # Dokumen + upload + share
│   ├── schedule.tsx      # Jadwal + kalender
│   ├── progress.tsx      # Progres & statistik
│   ├── members.tsx       # Manajemen anggota
│   └── share/
│       └── [token].tsx   # Halaman share publik (tanpa login)
├── components/
│   └── Layout.tsx        # Layout sidebar + navigasi
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── schema.sql        # Database schema (jalankan sekali)
│   └── storage.sql       # Storage bucket setup (jalankan sekali)
├── styles/
│   └── globals.css       # Global styles
├── .env.local.example    # Template environment variables
├── next.config.js        # Next.js config
├── package.json          # Dependencies
└── README.md             # Panduan ini
```

---

## ✅ Fitur Lengkap

| Fitur | Status |
|-------|--------|
| Login / Auth | ✅ |
| Dashboard dengan statistik real-time | ✅ |
| Manajemen Tugas (Kanban) | ✅ |
| Chat Tim (Realtime) | ✅ |
| Upload Dokumen (PDF, DOCX, XLSX, PPT, IMG, ZIP) | ✅ |
| Preview File (PDF + Gambar) | ✅ |
| Share Link Unik per File | ✅ |
| Halaman Share Publik (tanpa login) | ✅ |
| Tombol Open, Download, Copy Link, Share | ✅ |
| Akses: Public / Team / Private | ✅ |
| Jadwal & Kalender | ✅ |
| Progres & Statistik Tim | ✅ |
| Manajemen Anggota | ✅ |
| Activity Log | ✅ |
| Data persisten (Supabase) | ✅ |
| Multi-user bersamaan | ✅ |
| Realtime update Chat & Tasks | ✅ |

---

## 🔧 Development Lokal

```bash
npm install
cp .env.local.example .env.local
# Isi .env.local dengan key Supabase kamu
npm run dev
# Buka http://localhost:3000
```

---

## 💡 Tips

- **Custom domain**: di Vercel → Settings → Domains → Add Domain
- **Tingkatkan storage**: Supabase gratis = 1GB. Upgrade plan jika perlu lebih
- **Backup data**: Supabase Dashboard → Database → Backups (otomatis harian di plan Pro)
- **Monitor**: Vercel Dashboard menampilkan logs dan analytics real-time
