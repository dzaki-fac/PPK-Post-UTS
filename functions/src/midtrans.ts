/**
 * Klien HTTP Midtrans Sandbox: Snap (buat transaksi), Status API, dan verifikasi signature.
 * Memakai `fetch` bawaan Node 20 dan modul `crypto`. Tidak ada kunci yang dicatat di log.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import { MIDTRANS_BASE_URL_API, MIDTRANS_BASE_URL_SNAP, MIDTRANS_SERVER_KEY } from './config';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  itemId: string;
  itemName: string;
  customerName: string;
  customerEmail?: string;
  expiryHours: number;
  finishUrl?: string;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

export interface MidtransStatusPayload {
  order_id?: string;
  status_code?: string;
  transaction_status?: string;
  fraud_status?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_id?: string;
  transaction_time?: string;
  settlement_time?: string;
  signature_key?: string;
  status_message?: string;
}

function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY.value()}:`).toString('base64')}`;
}

export async function createSnapTransaction(
  input: SnapTransactionInput
): Promise<SnapTransactionResult> {
  const body: Record<string, unknown> = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.grossAmount,
    },
    item_details: [
      {
        id: input.itemId.slice(0, 50),
        price: input.grossAmount,
        quantity: 1,
        name: input.itemName.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: input.customerName.slice(0, 255),
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
    },
    expiry: { unit: 'hours', duration: input.expiryHours },
    ...(input.finishUrl ? { callbacks: { finish: input.finishUrl } } : {}),
  };

  const response = await fetch(`${MIDTRANS_BASE_URL_SNAP.value()}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => ({}))) as {
    token?: string;
    redirect_url?: string;
  };

  if (!response.ok || !json.token || !json.redirect_url) {
    throw new Error(`Snap API menolak transaksi (HTTP ${response.status}).`);
  }

  return { token: json.token, redirectUrl: json.redirect_url };
}

/** Status API: kebenaran akhir status transaksi (bukan isi webhook mentah). */
export async function getTransactionStatus(orderId: string): Promise<MidtransStatusPayload> {
  const response = await fetch(
    `${MIDTRANS_BASE_URL_API.value()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: basicAuthHeader() },
    }
  );
  const json = (await response.json().catch(() => ({}))) as MidtransStatusPayload;
  if (!response.ok && response.status !== 404) {
    throw new Error(`Status API gagal (HTTP ${response.status}).`);
  }
  return json;
}

/** sha512(order_id + status_code + gross_amount + serverKey) dibandingkan secara timing-safe. */
export function isSignatureValid(payload: MidtransStatusPayload): boolean {
  const { order_id, status_code, gross_amount, signature_key } = payload;
  if (!order_id || !status_code || !gross_amount || !signature_key) return false;

  const expected = createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY.value()}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(String(signature_key), 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Pemetaan transaction_status Midtrans -> status aplikasi (SRS4 bab 3.9).
 * Mengembalikan null untuk refund/chargeback agar diabaikan (hanya dicatat).
 */
export function mapMidtransStatus(
  transactionStatus?: string,
  fraudStatus?: string
): PaymentStatus | null {
  switch (transactionStatus) {
    case 'settlement':
      return 'success';
    case 'capture':
      if (fraudStatus === 'challenge') return 'pending';
      if (fraudStatus === 'deny') return 'failed';
      return 'success';
    case 'pending':
      return 'pending';
    case 'deny':
    case 'cancel':
    case 'expire':
    case 'failure':
      return 'failed';
    default:
      return null;
  }
}

/** Mengubah waktu Midtrans 'YYYY-MM-DD HH:mm:ss' (WIB) menjadi ISO 8601 UTC. */
export function midtransTimeToIso(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, y, mo, d, h, mi, s] = match;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 7, Number(mi), Number(s));
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
