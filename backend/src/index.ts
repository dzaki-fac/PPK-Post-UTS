import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { adminAuth } from './config';
import { evaluateAttendanceFine } from './lateness';
import { type MidtransStatusPayload } from './midtrans';
import { HttpError, createPaymentForUser } from './payments';
import { processMidtransWebhook, reconcilePendingPayments } from './webhook';

const app = express();
app.use(cors());
app.use(express.json());

interface AuthedRequest extends Request {
  uid?: string;
  email?: string;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Token autentikasi diperlukan.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Token autentikasi tidak valid.' });
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ppk-labportal-backend' });
});

app.post('/api/fines/evaluate', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const attendanceId = typeof req.body?.attendanceId === 'string' ? req.body.attendanceId.trim() : '';
    if (!attendanceId) {
      res.status(400).json({ error: 'attendanceId wajib diisi.' });
      return;
    }
    const result = await evaluateAttendanceFine(attendanceId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengevaluasi keterlambatan.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/payments/create', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const fineId = typeof req.body?.fineId === 'string' ? req.body.fineId : '';
    const result = await createPaymentForUser({
      uid: req.uid!,
      email: req.email,
      fineId,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('createPayment error:', error instanceof Error ? error.message : 'unknown');
    res.status(500).json({ error: 'Pembayaran belum dapat diproses. Silakan coba lagi beberapa saat lagi.' });
  }
});

app.post('/api/webhooks/midtrans', async (req: Request, res: Response) => {
  try {
    const payload = (req.body ?? {}) as MidtransStatusPayload;
    const { statusCode, body } = await processMidtransWebhook(payload);
    res.status(statusCode).json(body);
  } catch (error) {
    console.error('Webhook error:', error instanceof Error ? error.message : 'unknown');
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/payments/reconcile', async (_req: Request, res: Response) => {
  try {
    const count = await reconcilePendingPayments();
    res.json({ ok: true, reconciled: count });
  } catch (error) {
    console.error('Reconcile error:', error instanceof Error ? error.message : 'unknown');
    res.status(500).json({ error: 'Reconcile failed' });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`PPK LabPortal backend listening on port ${port}`);
});
