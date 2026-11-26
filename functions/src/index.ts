import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { PORT, adminAuth } from './config.js';
import {
  evaluateAttendanceLateness,
  startAttendanceWatcher,
} from './lateness.js';
import {
  createPaymentForStudent,
  reconcileExpiredPendingPayments,
  reconcilePaymentStatusByOrderId,
} from './payments.js';
import { handleMidtransWebhook } from './webhook.js';

interface AuthenticatedRequest extends Request {
  uid?: string;
}

async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ error: 'Autentikasi Firebase Bearer Token diperlukan.' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Token autentikasi tidak valid atau kedaluwarsa.' });
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'ppk-labportal-backend',
    mode: process.env.VERCEL ? 'vercel-serverless' : 'express-sandbox',
    endpoints: [
      'GET /health',
      'POST /api/attendances/evaluate-lateness',
      'POST /api/payments/create',
      'POST /api/payments/reconcile',
      'POST /api/payments/webhook',
    ],
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'ppk-labportal-backend',
    mode: process.env.VERCEL ? 'vercel-serverless' : 'express-sandbox',
    timestamp: new Date().toISOString(),
  });
});

app.post(
  '/api/attendances/evaluate-lateness',
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const attendanceId = String(req.body?.attendanceId ?? '').trim();
    if (!attendanceId) {
      res.status(400).json({ error: 'attendanceId wajib diisi.' });
      return;
    }

    try {
      const result = await evaluateAttendanceLateness(attendanceId);
      if (!result) {
        res.status(404).json({ error: 'Dokumen presensi tidak ditemukan.' });
        return;
      }
      res.status(200).json({ ok: true, result });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Gagal mengevaluasi keterlambatan di server.',
      });
    }
  }
);

app.post(
  '/api/payments/create',
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const fineId = String(req.body?.fineId ?? '').trim();
    if (!fineId || !req.uid) {
      res.status(400).json({ error: 'fineId wajib diisi.' });
      return;
    }

    try {
      const result = await createPaymentForStudent({
        studentUid: req.uid,
        fineId,
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : 'Gagal membuat transaksi pembayaran.',
      });
    }
  }
);

app.post(
  '/api/payments/reconcile',
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const paymentId = String(req.body?.paymentId ?? '').trim();
    if (!paymentId || !req.uid) {
      res.status(400).json({ error: 'paymentId wajib diisi.' });
      return;
    }

    try {
      const result = await reconcilePaymentStatusByOrderId(paymentId, req.uid);
      res.status(200).json({ ok: true, result });
    } catch (err) {
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : 'Gagal merekonsiliasi status transaksi.',
      });
    }
  }
);

app.all('/api/payments/webhook', handleMidtransWebhook);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[ppk-labportal-backend] Listening on port ${PORT}`);
    try {
      startAttendanceWatcher();
    } catch (err) {
      console.warn(
        '[ppk-labportal-backend] Watcher tidak aktif (periksa kredensial Firebase Admin):',
        err instanceof Error ? err.message : err
      );
    }
    setInterval(() => {
      void reconcileExpiredPendingPayments().catch(() => {});
    }, 15 * 60 * 1000);
  });
}

export { app };
export default app;
