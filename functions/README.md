# Backend Express + Firebase Admin (Programmer 3 — Sprint 4)

Backend ini menangani evaluasi keterlambatan otoritatif (`evaluate-lateness` + watcher), penerbitan tagihan denda (`fines/{attendanceId}`), pembuatan transaksi Midtrans Snap Sandbox, verifikasi webhook SHA-512 + rekonsiliasi Status API Midtrans, serta pengiriman push notification melalui Expo Push API.

## 1. Setup Lokal & Variabel Lingkungan

1. Salin `functions/.env.example` menjadi `functions/.env` (file `.env` di-ignore oleh Git):
   - `PORT=8080`
   - `MIDTRANS_SERVER_KEY=SB-Mid-server-...` (ambil dari Midtrans Sandbox Dashboard -> Settings -> Access Keys)
   - `FIREBASE_PROJECT_ID=...`
   - `FIREBASE_CLIENT_EMAIL=...` dan `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (atau `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json`)
2. Pada root `.env`, set `EXPO_PUBLIC_PAYMENT_API_URL=http://<IP_LAN_ATAU_TUNNEL>:8080` (untuk Emulator Android gunakan `http://10.0.2.2:8080`, untuk perangkat fisik/tunnel gunakan URL ngrok atau IP lokal).
3. Build dan jalankan backend:
   ```bash
   npm --prefix functions install
   npm --prefix functions run build
   npm --prefix functions start
   ```
4. Untuk menerima webhook Midtrans Sandbox secara lokal, ekspos port `8080` memakai tunnel HTTPS (mis. `ngrok http 8080`), lalu daftarkan `https://<domain-ngrok>/api/payments/webhook` di **Midtrans Sandbox Dashboard -> Settings -> Configuration -> Payment Notification URL**.

---

## 2. Uji Manual Keamanan Webhook & Rekonsiliasi (SRS4 FR-P3-06.3)

Gunakan payload dasar contoh untuk transaksi `order_id` berstatus `pending` di koleksi `/payments/{order_id}` (mis. `INV-20261126-ABCDEF12-1`, `gross_amount`: `10000.00`, `status_code`: `200`).

### A. Webhook dengan Signature Salah -> Ditolak (403)
- Hitung atau kirim `signature_key` acak (`invalid-signature`):
  ```bash
  curl -i -X POST http://localhost:8080/api/payments/webhook \
    -H "Content-Type: application/json" \
    -d '{
      "order_id": "INV-20261126-ABCDEF12-1",
      "status_code": "200",
      "gross_amount": "10000.00",
      "transaction_status": "settlement",
      "transaction_time": "2026-11-26 10:00:00",
      "signature_key": "0000000000000000000000000000000000000000"
    }'
  ```
- **Ekspektasi:** HTTP `403`, dokumen `payment_events/invalid_*` tertulis dengan `signatureValid: false` dan `processed: false`; dokumen `payments` dan `fines` **tidak berubah**.

### B. Nominal (`gross_amount`) Tidak Cocok -> Ditolak (400)
- Hitung `signature_key = sha512("INV-20261126-ABCDEF12-1" + "200" + "5000.00" + MIDTRANS_SERVER_KEY)`:
  ```bash
  curl -i -X POST http://localhost:8080/api/payments/webhook \
    -H "Content-Type: application/json" \
    -d '{
      "order_id": "INV-20261126-ABCDEF12-1",
      "status_code": "200",
      "gross_amount": "5000.00",
      "transaction_status": "settlement",
      "transaction_time": "2026-11-26 10:00:00",
      "signature_key": "<SHA512_SESUAI_5000>"
    }'
  ```
- **Ekspektasi:** HTTP `400` (`Nominal gross_amount tidak sesuai dengan tagihan.`); dokumen `payments` dan `fines` **tidak berubah**.

### C. Webhook Duplikat -> Idempoten (200)
- Kirim ulang payload webhook valid yang sama dua kali berturut-turut (dengan `order_id`, `transaction_status`, `status_code`, dan `transaction_time` identik):
  - Kiriman ke-1: memanggil Status API Midtrans, memperbarui `payments` + `fines`, mencatat `payment_events/{eventId}` dengan `processed: true`, mengirim notifikasi **sekali**, membalas HTTP `200 { "ok": true }`.
  - Kiriman ke-2: mendeteksi `payment_events/{eventId}` sudah `processed: true`, langsung membalas HTTP `200 { "ok": true, "duplicate": true }` tanpa memicu pembaruan/notifikasi ulang.

### D. Notifikasi Urutan Terbalik (`pending` setelah `success`/`failed`) -> Tidak Menurunkan Status
- Setelah transaksi berstatus `success` (`fines.status = 'paid'`) atau `failed`, kirim webhook valid dengan `transaction_status: "pending"` dan `transaction_time` baru:
  - Backend merekonsiliasi ke Midtrans Status API (`GET /v2/{order_id}/status`) dan di dalam transaksi Firestore `applyReconciledMidtransStatus` menolak penimpaan status terminal (`isFinalSuccess` dan `isPendingOverwritingTerminal`).
  - **Ekspektasi:** HTTP `200`, `payments.status` tetap `success` (atau `failed`) dan `fines.status` tetap `paid` (tidak turun kembali menjadi `pending`).

### E. Method Selain POST -> Ditolak (405)
```bash
curl -i http://localhost:8080/api/payments/webhook
```
- **Ekspektasi:** HTTP `405 Method Not Allowed`.
