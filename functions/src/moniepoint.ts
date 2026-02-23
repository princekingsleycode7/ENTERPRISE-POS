import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import fetch from 'node-fetch';

// Firebase Admin Init
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const MONIEPOINT_BASE_URL = 'https://channel.moniepoint.com';
const MONIEPOINT_CLIENT_ID = functions.config().moniepoint?.client_id ?? '';
const MONIEPOINT_CLIENT_SECRET = functions.config().moniepoint?.client_secret ?? '';
const MONIEPOINT_WEBHOOK_SECRET = functions.config().moniepoint?.webhook_secret ?? '';

const WEBHOOK_RESULTS_COLLECTION = 'moniepoint_webhook_results';
const TOKEN_CACHE_DOC = 'system_cache/moniepoint_token';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

async function getAccessToken(): Promise<string> {
  const cacheDoc = await db.doc(TOKEN_CACHE_DOC).get();
  if (cacheDoc.exists) {
    const cache = cacheDoc.data() as TokenCache;
    if (cache.expiresAt > Date.now() + 60_000) return cache.accessToken;
  }

  const response = await fetch(`${MONIEPOINT_BASE_URL}/v1/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: MONIEPOINT_CLIENT_ID,
      clientSecret: MONIEPOINT_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new functions.https.HttpsError('unauthenticated', `Moniepoint auth failed: ${body}`);
  }

  const data = (await response.json()) as { accessToken: string; expiresIn: number };
  const expiresAt = Date.now() + data.expiresIn * 1000;
  await db.doc(TOKEN_CACHE_DOC).set({ accessToken: data.accessToken, expiresAt });
  return data.accessToken;
}

interface PushPaymentRequest {
  terminalSerial: string;
  amount: number;
  merchantReference: string;
  paymentMethod: 'CARD_PURCHASE' | 'POS_TRANSFER' | 'ANY';
}

export const pushMoniepointPayment = functions.https.onCall(async (data: PushPaymentRequest, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  const { terminalSerial, amount, merchantReference, paymentMethod } = data;
  if (!terminalSerial || !amount || !merchantReference) throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  if (amount <= 0) throw new functions.https.HttpsError('invalid-argument', 'Amount must be positive');
  const token = await getAccessToken();

  const response = await fetch(`${MONIEPOINT_BASE_URL}/v1/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ terminalSerial, amount, merchantReference, transactionType: 'PURCHASE', paymentMethod: paymentMethod ?? 'ANY' })
  });

  if (response.status === 202) {
    await db.collection(WEBHOOK_RESULTS_COLLECTION).doc(merchantReference).set({
      merchantReference,
      terminalSerial,
      amount,
      paymentMethod,
      transactionStatus: 'PENDING',
      initiatedBy: context.auth.uid,
      initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  }

  const errorBody = await response.json().catch(() => ({}));
  functions.logger.error('[Moniepoint] Push failed', errorBody);
  return { success: false, error: errorBody.message ?? 'Failed to push payment to terminal' };
});

export const getMoniepointTransactionStatus = functions.https.onCall(async (data: { merchantReference: string }, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  const { merchantReference } = data;
  if (!merchantReference) throw new functions.https.HttpsError('invalid-argument', 'merchantReference required');
  const token = await getAccessToken();

  const response = await fetch(`${MONIEPOINT_BASE_URL}/v1/transactions/merchants/${encodeURIComponent(merchantReference)}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new functions.https.HttpsError('internal', 'Failed to query transaction status');
  return response.json();
});

export const moniepointWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const webhookId = req.headers['moniepoint-webhook-id'] as string;
  const webhookTimestamp = req.headers['moniepoint-webhook-timestamp'] as string;
  const webhookSignature = req.headers['moniepoint-webhook-signature'] as string;

  if (!webhookId || !webhookTimestamp || !webhookSignature) { functions.logger.warn('[Webhook] Missing signature headers'); res.status(400).send('Missing signature headers'); return; }

  const rawBody = JSON.stringify(req.body);
  const signatureData = `${webhookId}__${webhookTimestamp}__${rawBody}`;
  const expectedSignature = crypto.createHmac('sha256', MONIEPOINT_WEBHOOK_SECRET).update(signatureData).digest('base64');
  if (expectedSignature !== webhookSignature) { functions.logger.warn('[Webhook] Invalid signature', { webhookId, received: webhookSignature }); res.status(401).send('Invalid signature'); return; }

  res.status(200).json({ received: true });

  const processedRef = db.collection('moniepoint_processed_webhooks').doc(webhookId);
  const alreadyProcessed = await processedRef.get();
  if (alreadyProcessed.exists) { functions.logger.info('[Webhook] Duplicate webhook — skipping', { webhookId }); return; }

  const event = req.body as any;
  const PURCHASE_EVENTS = ['V1_POS_PURCHASE_TRANSACTION','V1_POS_TRANSFER_TRANSACTION','V1_POS_CARD_TRANSFER_TRANSACTION'];

  const batch = db.batch();
  batch.set(processedRef, { processedAt: admin.firestore.FieldValue.serverTimestamp(), eventType: event.eventType });

  if (event.data?.merchantReference && PURCHASE_EVENTS.includes(event.eventType)) {
    const resultRef = db.collection(WEBHOOK_RESULTS_COLLECTION).doc(event.data.merchantReference);
    batch.set(resultRef, {
      amount: event.data.amount / 100,
      transactionReference: event.data.transactionReference,
      merchantReference: event.data.merchantReference,
      transactionStatus: mapResponseCodeToStatus(event.data.responseCode),
      transactionType: event.data.transactionType,
      responseCode: event.data.responseCode,
      responseMessage: event.data.responseMessage,
      transactionTime: event.data.transactionTime,
      terminalSerial: event.data.terminalSerial,
      actualPaymentMethod: event.data.actualPaymentMethod,
      eventType: event.eventType,
      webhookId,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
      action: 'MONIEPOINT_WEBHOOK_RECEIVED',
      resource: `MoniepointTransaction:${event.data.merchantReference}`,
      details: { eventType: event.eventType, transactionStatus: event.data.transactionStatus, responseCode: event.data.responseCode, amount: event.data.amount / 100 },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: 'system',
    });
  }

  await batch.commit();
  functions.logger.info('[Webhook] Successfully processed', { webhookId });
});

function mapResponseCodeToStatus(responseCode: string): 'APPROVED' | 'PENDING' | 'FAILED' | 'DECLINED' {
  switch (responseCode) {
    case '00': return 'APPROVED';
    case '09': return 'PENDING';
    case '51':
    case '54':
    case '55':
    case '91': return 'DECLINED';
    default: return 'FAILED';
  }
}
