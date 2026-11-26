# PPK LabPortal — Backend Express (Gratis tanpa Blaze)

Backend Node.js + Express untuk menggantikan Firebase Cloud Functions agar bisa di-deploy gratis (misalnya di **Render**, **Railway**, atau **Fly.io**) tanpa perlu upgrade Firebase ke Blaze.

## Endpoint
- `GET /health` — Healthcheck
- `POST /api/fines/evaluate` — Evaluasi keterlambatan & terbitkan denda (butuh `Authorization: Bearer <Firebase ID Token>`)
- `POST /api/payments/create` — Buat transaksi Midtrans Snap (butuh `Authorization: Bearer <Firebase ID Token>`)
- `POST /api/webhooks/midtrans` — Webhook Midtrans (verifikasi signature SHA-512 + Status API)
- `POST /api/payments/reconcile` — Rekonsiliasi transaksi pending kedaluwarsa

## Environment Variables
Salin `.env.example` ke `.env` dan isi:
- `MIDTRANS_SERVER_KEY` — Server Key Sandbox Midtrans
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Isi JSON service account Firebase (1 baris)

## Menjalankan Lokal
```bash
cd backend
npm install
npm run dev
```

## Deploy Gratis ke Render
1. Buat Web Service baru di Render, arahkan ke repo ini dengan **Root Directory** = `backend`
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Tambahkan Environment Variables (`MIDTRANS_SERVER_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`)
5. Set `EXPO_PUBLIC_BACKEND_URL=https://<nama-app>.onrender.com` di `.env` aplikasi Expo
6. Set Payment Notification URL di Midtrans Sandbox Dashboard ke:
   `https://<nama-app>.onrender.com/api/webhooks/midtrans`
