import crypto from 'node:crypto';
import { MIDTRANS_FINISH_REDIRECT_URL, adminDb } from './config.js';
import {
  MidtransStatusResponse,
  MappedPaymentStatus,
  createSnapTransaction,
  getTransactionStatus,
  mapMidtransStatus,
} from './midtrans.js';
import { formatRupiahId, sendToUser } from './notify.js';

export interface CreatePaymentResult {
  paymentId: string;
  redirectUrl: string;
  reused: boolean;
}

/**
 * Membuat transaksi Midtrans Snap Sandbox melalui backend tepercaya untuk tagihan denda.
 * Client hanya mengirim `fineId`; nominal selalu diambil dari Cloud Firestore.
 */
export async function createPaymentForStudent(params: {
  studentUid: string;
  fineId: string;
}): Promise<CreatePaymentResult> {
  const cleanFineId = params.fineId.trim();
  if (!cleanFineId) {
    throw new Error('ID tagihan wajib disertakan.');
  }

  const fineRef = adminDb.collection('fines').doc(cleanFineId);
  const fineSnap = await fineRef.get();
  if (!fineSnap.exists) {
    throw new Error('Tagihan denda tidak ditemukan.');
  }

  const fine = fineSnap.data() as Record<string, unknown>;
  if (String(fine.studentId ?? '') !== params.studentUid) {
    throw new Error('Anda tidak berhak membayar tagihan milik pengguna lain.');
  }

  const fineStatus = String(fine.status ?? 'unpaid');
  if (fineStatus === 'paid') {
    throw new Error('Tagihan denda ini sudah berstatus lunas.');
  }
  if (fineStatus !== 'unpaid' && fineStatus !== 'pending') {
    throw new Error('Status tagihan tidak valid untuk pembayaran.');
  }

  // Periksa apakah masih ada pembayaran pending yang belum kedaluwarsa -> kembalikan redirectUrl yang sama
  const activePaymentId =
    typeof fine.activePaymentId === 'string' ? fine.activePaymentId : '';
  let expiredPendingIdToClose: string | null = null;
  if (activePaymentId) {
    const activeSnap = await adminDb.collection('payments').doc(activePaymentId).get();
    if (activeSnap.exists) {
      const activePay = activeSnap.data() as Record<string, unknown>;
      const expiresAtMs = new Date(String(activePay.expiresAt ?? '')).getTime();
      if (
        activePay.status === 'pending' &&
        typeof activePay.redirectUrl === 'string' &&
        activePay.redirectUrl &&
        !Number.isNaN(expiresAtMs) &&
        expiresAtMs > Date.now()
      ) {
        return {
          paymentId: activeSnap.id,
          redirectUrl: activePay.redirectUrl,
          reused: true,
        };
      }

      if (activePay.status === 'pending' && !Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()) {
        const reconciled = await reconcilePaymentStatusByOrderId(activePaymentId).catch(
          () => null
        );
        if (reconciled?.nextStatus === 'success') {
          throw new Error('Tagihan denda ini sudah berstatus lunas.');
        }
        if (reconciled?.nextStatus !== 'failed') {
          expiredPendingIdToClose = activePaymentId;
        }
      }
    }
  }

  const amount = Math.round(Number(fine.amount ?? 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal tagihan tidak valid.');
  }

  const userSnap = await adminDb.collection('users').doc(params.studentUid).get();
  const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
  const customerName = String(fine.studentName ?? userData.nama ?? 'Praktikan');
  const customerEmail = String(userData.email ?? 'praktikan@students.undip.ac.id');

  const invoiceNumber = String(fine.invoiceNumber ?? cleanFineId);
  const prevAttempts = Number(fine.paymentAttempts ?? 0);
  const attempt = Number.isFinite(prevAttempts) ? prevAttempts + 1 : 1;
  const orderId = `${invoiceNumber}-${attempt}`.slice(0, 50);
  const praktikum = String(fine.praktikum ?? 'Praktikum PPK');

  const snap = await createSnapTransaction({
    orderId,
    grossAmount: amount,
    itemName: `Denda ${praktikum}`.slice(0, 50),
    customerName,
    customerEmail,
    finishRedirectUrl: MIDTRANS_FINISH_REDIRECT_URL,
  });

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAtIso = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  await adminDb.runTransaction(async (tx) => {
    const freshFine = await tx.get(fineRef);
    const freshData = (freshFine.data() as Record<string, unknown> | undefined) ?? {};
    if (freshData.status === 'paid') {
      throw new Error('Tagihan denda ini sudah berstatus lunas.');
    }

    const paymentRef = adminDb.collection('payments').doc(orderId);
    tx.set(paymentRef, {
      id: orderId,
      fineId: cleanFineId,
      invoiceNumber,
      attempt,
      studentId: params.studentUid,
      sessionId: String(fine.sessionId ?? ''),
      attendanceId: String(fine.attendanceId ?? cleanFineId),
      courseId: String(fine.courseId ?? ''),
      labId: String(fine.labId ?? ''),
      praktikum,
      amount,
      status: 'pending',
      midtransStatus: 'pending',
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      expiresAt: expiresAtIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (expiredPendingIdToClose) {
      tx.update(adminDb.collection('payments').doc(expiredPendingIdToClose), {
        status: 'failed',
        failureReason: 'Transaksi kedaluwarsa melewati batas waktu.',
        updatedAt: nowIso,
      });
    }

    tx.update(fineRef, {
      status: 'pending',
      activePaymentId: orderId,
      paymentAttempts: attempt,
      updatedAt: nowIso,
    });
  });

  return {
    paymentId: orderId,
    redirectUrl: snap.redirectUrl,
    reused: false,
  };
}

export interface ReconcileApplyResult {
  paymentId: string;
  fineId: string;
  previousStatus: MappedPaymentStatus;
  nextStatus: MappedPaymentStatus;
  transitioned: boolean;
}

/**
 * Menerapkan transisi status pembayaran yang sudah direkonsiliasi dengan Status API Midtrans
 * dalam transaksi Firestore atomik (success bersifat final; pending tidak menimpa success/failed).
 */
export async function applyReconciledMidtransStatus(params: {
  orderId: string;
  midtrans: MidtransStatusResponse;
  eventId?: string;
  eventRecord?: Record<string, unknown>;
}): Promise<ReconcileApplyResult | null> {
  const { orderId, midtrans, eventId, eventRecord } = params;
  const mapped = mapMidtransStatus(midtrans.transaction_status, midtrans.fraud_status);

  const paymentRef = adminDb.collection('payments').doc(orderId);
  const nowIso = new Date().toISOString();

  let notifyPayload:
    | {
        uid: string;
        eventType: 'payment_success' | 'payment_failed' | 'payment_action_required';
        title: string;
        body: string;
        sessionId: string;
        fineId: string;
      }
    | null = null;

  const outcome = await adminDb.runTransaction(async (tx) => {
    const paySnap = await tx.get(paymentRef);
    if (!paySnap.exists) {
      return null;
    }

    const payData = paySnap.data() as Record<string, unknown>;
    const fineId = String(payData.fineId ?? '');
    const fineRef = adminDb.collection('fines').doc(fineId);
    const fineSnap = fineId ? await tx.get(fineRef) : null;
    const fineData = (fineSnap?.data() as Record<string, unknown> | undefined) ?? {};

    // Cocokkan nominal bila tersedia
    if (midtrans.gross_amount !== undefined) {
      const expectedAmount = Math.round(Number(payData.amount ?? 0));
      const receivedAmount = Math.round(Number(midtrans.gross_amount));
      if (!Number.isFinite(receivedAmount) || receivedAmount !== expectedAmount) {
        throw new Error('Nominal pembayaran dari gateway tidak sesuai dengan tagihan.');
      }
    }

    const previousStatus = String(payData.status ?? 'pending') as MappedPaymentStatus;

    if (eventId && eventRecord) {
      tx.set(adminDb.collection('payment_events').doc(eventId), {
        ...eventRecord,
        processed: true,
      });
    }

    // Refund atau status tak dikenal -> hanya dicatat di payment_events tanpa mengubah status bayar
    if (!mapped) {
      tx.update(paymentRef, { lastWebhookAt: nowIso, updatedAt: nowIso });
      return {
        paymentId: orderId,
        fineId,
        previousStatus,
        nextStatus: previousStatus,
        transitioned: false,
      };
    }

    // Transisi aman: success final; pending tidak menimpa success atau failed
    const isFinalSuccess = previousStatus === 'success';
    const isPendingOverwritingTerminal =
      mapped === 'pending' && (previousStatus === 'success' || previousStatus === 'failed');

    if (isFinalSuccess || isPendingOverwritingTerminal) {
      tx.update(paymentRef, { lastWebhookAt: nowIso, updatedAt: nowIso });
      return {
        paymentId: orderId,
        fineId,
        previousStatus,
        nextStatus: previousStatus,
        transitioned: false,
      };
    }

    const paymentUpdate: Record<string, unknown> = {
      status: mapped,
      midtransStatus: midtrans.transaction_status ?? mapped,
      ...(midtrans.fraud_status ? { fraudStatus: midtrans.fraud_status } : {}),
      ...(midtrans.payment_type ? { paymentType: midtrans.payment_type } : {}),
      ...(midtrans.transaction_id ? { transactionId: midtrans.transaction_id } : {}),
      lastWebhookAt: nowIso,
      updatedAt: nowIso,
    };

    if (mapped === 'success') {
      paymentUpdate.settledAt = midtrans.settlement_time || nowIso;
    } else if (mapped === 'failed') {
      paymentUpdate.failureReason =
        midtrans.status_message || `Status Midtrans: ${midtrans.transaction_status}`;
    }

    tx.update(paymentRef, paymentUpdate);

    if (fineSnap?.exists) {
      if (mapped === 'success') {
        tx.update(fineRef, {
          status: 'paid',
          paidAt: paymentUpdate.settledAt,
          activePaymentId: orderId,
          updatedAt: nowIso,
        });
      } else if (mapped === 'failed') {
        if (fineData.status !== 'paid' && fineData.activePaymentId === orderId) {
          tx.update(fineRef, {
            status: 'unpaid',
            activePaymentId: '',
            updatedAt: nowIso,
          });
        }
      } else if (mapped === 'pending' && fineData.status === 'unpaid') {
        tx.update(fineRef, {
          status: 'pending',
          activePaymentId: orderId,
          updatedAt: nowIso,
        });
      }
    }

    const transitioned = previousStatus !== mapped;
    const studentId = String(payData.studentId ?? '');
    const praktikum = String(payData.praktikum ?? 'Praktikum PPK');
    const amount = Number(payData.amount ?? 0);
    const sessionId = String(payData.sessionId ?? '');
    const alreadyNotifiedPending = Boolean(payData.pendingActionNotified);

    if (mapped === 'success' && transitioned) {
      notifyPayload = {
        uid: studentId,
        eventType: 'payment_success',
        title: 'Pembayaran Denda Berhasil',
        body: `Pembayaran denda ${praktikum} sebesar ${formatRupiahId(amount)} telah terverifikasi lunas.`,
        sessionId,
        fineId,
      };
    } else if (mapped === 'failed' && transitioned) {
      notifyPayload = {
        uid: studentId,
        eventType: 'payment_failed',
        title: 'Pembayaran Denda Gagal atau Kedaluwarsa',
        body: `Pembayaran denda ${praktikum} sebesar ${formatRupiahId(amount)} belum berhasil (${midtrans.transaction_status}). Silakan coba bayar ulang.`,
        sessionId,
        fineId,
      };
    } else if (mapped === 'pending' && !alreadyNotifiedPending) {
      tx.update(paymentRef, { pendingActionNotified: true });
      notifyPayload = {
        uid: studentId,
        eventType: 'payment_action_required',
        title: 'Selesaikan Pembayaran Denda',
        body: `Transaksi pembayaran denda ${praktikum} sebesar ${formatRupiahId(amount)} masih menunggu penyelesaian.`,
        sessionId,
        fineId,
      };
    }

    return {
      paymentId: orderId,
      fineId,
      previousStatus,
      nextStatus: mapped,
      transitioned,
    };
  });

  if (notifyPayload) {
    const np = notifyPayload as {
      uid: string;
      eventType: 'payment_success' | 'payment_failed' | 'payment_action_required';
      title: string;
      body: string;
      sessionId: string;
      fineId: string;
    };
    await sendToUser(np.uid, {
      eventType: np.eventType,
      title: np.title,
      body: np.body,
      relatedSessionId: np.sessionId,
      relatedFineId: np.fineId,
      relatedPaymentId: orderId,
    });
  }

  return outcome;
}

/**
 * Rekonsiliasi satu transaksi pembayaran lewat Midtrans Status API.
 */
export async function reconcilePaymentStatusByOrderId(
  orderId: string,
  requesterUid?: string
): Promise<ReconcileApplyResult | null> {
  const paySnap = await adminDb.collection('payments').doc(orderId).get();
  if (!paySnap.exists) {
    throw new Error('Transaksi pembayaran tidak ditemukan.');
  }
  const payData = paySnap.data() as Record<string, unknown>;
  if (requesterUid && String(payData.studentId ?? '') !== requesterUid) {
    throw new Error('Anda tidak berhak memeriksa transaksi ini.');
  }

  const midtrans = await getTransactionStatus(orderId);
  const eventId = crypto
    .createHash('sha256')
    .update(`reconcile:${orderId}:${midtrans.transaction_status ?? ''}:${Date.now()}`)
    .digest('hex');

  return applyReconciledMidtransStatus({
    orderId,
    midtrans,
    eventId,
    eventRecord: {
      id: eventId,
      orderId,
      signatureValid: true,
      transactionStatus: midtrans.transaction_status ?? '',
      statusCode: midtrans.status_code ?? '',
      grossAmount: midtrans.gross_amount ?? '',
      receivedAt: new Date().toISOString(),
    },
  });
}

/**
 * Memeriksa transaksi berstatus `pending` yang melewati batas kedaluwarsa lewat Status API
 * sebagai jaring pengaman bila webhook sempat terlewat.
 */
export async function reconcileExpiredPendingPayments(): Promise<void> {
  const snap = await adminDb
    .collection('payments')
    .where('status', '==', 'pending')
    .limit(50)
    .get();

  const now = Date.now();
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const expiresMs = new Date(String(data.expiresAt ?? '')).getTime();
    if (!Number.isNaN(expiresMs) && expiresMs <= now) {
      try {
        await reconcilePaymentStatusByOrderId(docSnap.id);
      } catch {
        // Lewati jika Midtrans mengembalikan 404 (belum sempat pilih metode bayar)
      }
    }
  }
}
