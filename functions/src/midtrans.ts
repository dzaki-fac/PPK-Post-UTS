import crypto from 'node:crypto';
import {
  MIDTRANS_BASE_URL_API,
  MIDTRANS_BASE_URL_SNAP,
  getMidtransServerKey,
} from './config.js';

export type MappedPaymentStatus = 'pending' | 'success' | 'failed';

export interface SnapCreateParams {
  orderId: string;
  grossAmount: number;
  itemName: string;
  customerName: string;
  customerEmail: string;
  finishRedirectUrl?: string;
}

export interface SnapCreateResult {
  token: string;
  redirectUrl: string;
}

export interface MidtransStatusResponse {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  settlement_time?: string;
  status_message?: string;
}

function buildBasicAuthHeader(): string {
  const serverKey = getMidtransServerKey();
  const encoded = Buffer.from(`${serverKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Membuat transaksi Midtrans Snap Sandbox melalui endpoint /snap/v1/transactions.
 */
export async function createSnapTransaction(
  params: SnapCreateParams
): Promise<SnapCreateResult> {
  const cleanItemName = params.itemName.trim().slice(0, 50) || 'Denda Keterlambatan';

  const body: Record<string, unknown> = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    item_details: [
      {
        id: params.orderId.slice(0, 50),
        price: Math.round(params.grossAmount),
        quantity: 1,
        name: cleanItemName,
      },
    ],
    customer_details: {
      first_name: params.customerName.trim().slice(0, 50) || 'Praktikan',
      email: params.customerEmail.trim() || 'praktikan@students.undip.ac.id',
    },
    expiry: {
      unit: 'hours',
      duration: 24,
    },
  };

  if (params.finishRedirectUrl) {
    body.callbacks = {
      finish: params.finishRedirectUrl,
    };
  }

  const response = await fetch(`${MIDTRANS_BASE_URL_SNAP}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: buildBasicAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Gagal membuat transaksi pembayaran pada Midtrans Sandbox.');
  }

  const json = (await response.json()) as {
    token?: string;
    redirect_url?: string;
  };

  if (!json.token || !json.redirect_url) {
    throw new Error('Respons transaksi pembayaran tidak lengkap.');
  }

  return {
    token: json.token,
    redirectUrl: json.redirect_url,
  };
}

/**
 * Mengambil status transaksi terkini secara otoritatif dari Midtrans Status API.
 */
export async function getTransactionStatus(
  orderId: string
): Promise<MidtransStatusResponse> {
  const response = await fetch(
    `${MIDTRANS_BASE_URL_API}/v2/${encodeURIComponent(orderId)}/status`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: buildBasicAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    throw new Error('Gagal melakukan rekonsiliasi status transaksi pembayaran.');
  }

  return (await response.json()) as MidtransStatusResponse;
}

/**
 * Memverifikasi signature webhook Midtrans menggunakan SHA-512 dan perbandingan timing-safe.
 */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const serverKey = getMidtransServerKey();
  const payload = `${params.orderId}${params.statusCode}${params.grossAmount}${serverKey}`;
  const expected = crypto.createHash('sha512').update(payload).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(params.signatureKey.trim().toLowerCase(), 'utf8');
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Pemetaan status transaksi Midtrans -> status aplikasi (SRS4 Bab 3.9).
 * Mengembalikan null jika status harus diabaikan (mis. refund).
 */
export function mapMidtransStatus(
  transactionStatus?: string,
  fraudStatus?: string
): MappedPaymentStatus | null {
  const tx = (transactionStatus || '').toLowerCase();
  const fraud = (fraudStatus || '').toLowerCase();

  if (tx === 'pending') {
    return 'pending';
  }
  if (tx === 'settlement') {
    return 'success';
  }
  if (tx === 'capture') {
    if (fraud === 'challenge') return 'pending';
    if (fraud === 'accept' || fraud === '') return 'success';
    return 'failed';
  }
  if (tx === 'deny' || tx === 'cancel' || tx === 'expire' || tx === 'failure') {
    return 'failed';
  }
  if (tx === 'refund' || tx === 'partial_refund') {
    return null;
  }
  return null;
}
