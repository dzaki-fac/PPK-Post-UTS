// Uji manual webhook Midtrans (SRS4 FR-P3-06.3). Tidak ikut build TypeScript.
//
// Pemakaian (PowerShell):
//   $env:WEBHOOK_URL = "https://asia-southeast2-<project-id>.cloudfunctions.net/midtransWebhook"
//   $env:SERVER_KEY  = "<server key sandbox>"   # hanya di terminal lokal, jangan di-commit
//   node functions/scripts/test-webhook.mjs <order_id> <gross_amount> <skenario>
//
// Skenario: bad-signature | wrong-amount | duplicate
// Hasil yang diharapkan:
//   bad-signature -> HTTP 403, data tidak berubah, payment_events.signatureValid = false
//   wrong-amount  -> HTTP 400 (nominal tidak cocok), data tidak berubah
//   duplicate     -> dua kali kirim payload valid: kedua respons 200, data berubah sekali saja

import { createHash } from 'node:crypto';

const [orderId, grossAmount, scenario] = process.argv.slice(2);
const url = process.env.WEBHOOK_URL;
const serverKey = process.env.SERVER_KEY ?? '';

if (!url || !orderId || !grossAmount || !scenario) {
  console.error('Gunakan: node test-webhook.mjs <order_id> <gross_amount> <bad-signature|wrong-amount|duplicate>');
  process.exit(1);
}

function buildPayload(amount, signKey) {
  const statusCode = '200';
  const signature = createHash('sha512')
    .update(`${orderId}${statusCode}${amount}${signKey}`)
    .digest('hex');
  return {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: amount,
    transaction_status: 'settlement',
    transaction_time: '2026-11-26 11:00:00',
    signature_key: signature,
  };
}

async function send(payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log(`HTTP ${response.status}`, await response.text());
}

if (scenario === 'bad-signature') {
  await send(buildPayload(grossAmount, 'kunci-palsu'));
} else if (scenario === 'wrong-amount') {
  await send(buildPayload(String(Number(grossAmount) + 1000) + '.00', serverKey));
} else if (scenario === 'duplicate') {
  const payload = buildPayload(grossAmount, serverKey);
  await send(payload);
  await send(payload);
} else {
  console.error('Skenario tidak dikenal.');
  process.exit(1);
}
