# Cloud Functions — Denda Keterlambatan & Pembayaran Midtrans (Sprint 4 / Programmer 3)

Backend Firebase Functions 2nd gen (Node 20, TypeScript, region `asia-southeast2`).

| Fungsi | Jenis | Tugas |
|---|---|---|
| `onAttendanceCreated` | Firestore trigger `attendances/{id}` | Hitung ulang keterlambatan memakai waktu server, terbitkan tepat satu `fines/{attendanceId}`, kirim notifikasi `fine_created` |
| `createPayment` | Callable | Buat transaksi Midtrans Snap dari ID tagihan (nominal dibaca dari Firestore) |
| `midtransWebhook` | HTTPS POST publik | Verifikasi signature, cek nominal, rekonsiliasi Status API, ubah `payments`/`fines` secara transaksional |
| `reconcilePendingPayments` | Terjadwal (15 menit) | Jaring pengaman bila webhook terlewat |

## Build

```bash
npm --prefix functions install
npm --prefix functions run build
```

## Checklist Konfigurasi (SRS4 9.6)

1. Ambil **Server Key** Midtrans **Sandbox** (Settings → Access Keys). Hanya server key yang dipakai backend.
2. Simpan sebagai secret (nilai ditempel di prompt, tidak pernah ditulis ke berkas):
   ```bash
   firebase functions:secrets:set MIDTRANS_SERVER_KEY
   ```
3. Deploy (project harus berplan Blaze):
   ```bash
   firebase deploy --only functions,firestore:rules,firestore:indexes
   ```
4. Salin URL `midtransWebhook` (`https://asia-southeast2-<project-id>.cloudfunctions.net/midtransWebhook`) ke
   Midtrans Sandbox Dashboard → Settings → Configuration → **Payment Notification URL**.
5. Uji dengan **Midtrans Sandbox Simulator** (VA/QRIS/e-wallet) atau kartu uji. Tidak ada uang asli.
6. Lokal: Functions Emulator + tunnel HTTPS (mis. ngrok) untuk webhook, atau uji langsung pada Functions ter-deploy.

Parameter non-rahasia opsional (`functions/.env`, git-ignored): `MIDTRANS_BASE_URL_SNAP`, `MIDTRANS_BASE_URL_API`,
`PAYMENT_FINISH_REDIRECT_URL`.

## Uji Manual Terdokumentasi (FR-P3-06.3)

Prasyarat: ada tagihan `unpaid`, lalu tekan **Bayar Sekarang** sekali agar terbentuk `payments/{orderId}` berstatus `pending`.

| # | Skenario | Cara | Hasil yang diharapkan |
|---|---|---|---|
| 1 | Tepat di batas grace | Presensi tepat pada `deadlineAt` | `hadir`, tanpa tagihan |
| 2 | Terlambat | Presensi setelah `deadlineAt` | `terlambat`, tepat satu `fines/{sessionId_studentId}`; presensi kedua ditolak |
| 3 | Izin | Presensi `izin` / `manual-asprak` | Dilewati trigger, tanpa tagihan |
| 4 | Signature salah | `node functions/scripts/test-webhook.mjs <orderId> <amount> bad-signature` | HTTP 403, data tidak berubah, `payment_events.signatureValid=false` |
| 5 | Nominal tidak cocok | `... wrong-amount` | HTTP 400, data tidak berubah |
| 6 | Webhook duplikat | `... duplicate` | Dua respons 200; status/notifikasi berubah sekali |
| 7 | Urutan terbalik | Kirim `settlement`, lalu `pending` lama | Status tetap `success` (pending tidak menimpa) |
| 8 | Sukses via Simulator | Bayar lewat Sandbox Simulator | `payments.success`, `fines.paid`, kehadiran tetap `terlambat` |
| 9 | Expire | Biarkan transaksi kedaluwarsa | `failed`, tagihan `unpaid`, bayar ulang memakai `orderId` baru (`...-2`) |

## Pemeriksaan Kebocoran Secret (FR-P3-06.2)

```bash
git grep -n -i "SB-Mid-server"
git grep -n "MIDTRANS_SERVER_KEY" -- . ":!SRS4.md" ":!functions"
```

Keduanya harus kosong. Nama `MIDTRANS_SERVER_KEY` hanya boleh muncul pada konfigurasi Firebase secret (`functions/src`) dan dokumentasi.
