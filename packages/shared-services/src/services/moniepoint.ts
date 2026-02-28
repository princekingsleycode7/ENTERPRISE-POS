/**
 * functions/src/moniepoint.ts
 *
 * Firebase Cloud Functions for Moniepoint POS Integration
 *
 * FUNCTIONS EXPORTED:
 *  - pushMoniepointPayment     → Called by the POS app frontend
 *  - getMoniepointTransactionStatus → Polling fallback
 *  - moniepointWebhook         → HTTPS endpoint registered with Moniepoint dashboard
 *
 * SETUP CHECKLIST:
 *  1. firebase functions:config:set moniepoint.client_id="YOUR_ID"
 *  2. firebase functions:config:set moniepoint.client_secret="YOUR_SECRET"
 *  3. firebase functions:config:set moniepoint.webhook_secret="YOUR_WEBHOOK_SECRET"
 *  4. firebase functions:config:set moniepoint.terminal_serial="P260XXXXXXX"
 *  5. Deploy: firebase deploy --only functions
 *  6. Register the webhook URL in your Moniepoint dashboard:
 *     https://<region>-<project>.cloudfunctions.net/moniepointWebhook
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import fetch from 'node-fetch';

// ─── Firebase Admin Init ──────────────────────────────────────────────────────

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────────────

const MONIEPOINT_BASE_URL = 'https://channel.moniepoint.com';
const MONIEPOINT_CLIENT_ID = functions.config().moniepoint?.client_id ?? '';
const MONIEPOINT_CLIENT_SECRET = functions.config().moniepoint?.client_secret ?? '';
const MONIEPOINT_WEBHOOK_SECRET = functions.config().moniepoint?.webhook_secret ?? '';

const WEBHOOK_RESULTS_COLLECTION = 'moniepoint_webhook_results';
const TOKEN_CACHE_DOC = 'system_cache/moniepoint_token';

// ─── Token Management ─────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix ms
}

/**
 * Retrieves a valid OAuth access token, using a Firestore-cached token
 * to avoid unnecessary round-trips. Refreshes automatically on expiry.
 */
async function getAccessToken(): Promise<string> {
  // Check Firestore cache
  const cacheDoc = await db.doc(TOKEN_CACHE_DOC).get();
  if (cacheDoc.exists) {
    const cache = cacheDoc.data() as TokenCache;
    // Use cached token if it expires >60s from now
    if (cache.expiresAt > Date.now() + 60_000) {
      return cache.accessToken;
    }
  }

  // Fetch a fresh token
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
    throw new functions.https.HttpsError(
      'unauthenticated',
      `Moniepoint auth failed: ${body}`
    );
  }

  const data = (await response.json()) as {
    accessToken: string;
    expiresIn: number; // seconds
  };

  const expiresAt = Date.now() + data.expiresIn * 1000;

  // Cache the token in Firestore
  await db.doc(TOKEN_CACHE_DOC).set({ accessToken: data.accessToken, expiresAt });

  return data.accessToken;
}

// ─── Cloud Function: Push Payment ─────────────────────────────────────────────

interface PushPaymentRequest {
  terminalSerial: string;
  amount: number;         // in kobo
  merchantReference: string;
  paymentMethod: 'CARD_PURCHASE' | 'POS_TRANSFER' | 'ANY';
}

/**
 * Callable function: push a payment request to a Moniepoint POS terminal.
 * Called by moniepointService.ts on the frontend.
 */
export const pushMoniepointPayment = functions.https.onCall(
  async (data: PushPaymentRequest, context) => {
    // Require authenticated Firebase user
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { terminalSerial, amount, merchantReference, paymentMethod } = data;

    if (!terminalSerial || !amount || !merchantReference) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    if (amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Amount must be positive');
    }

    const token = await getAccessToken();

    const response = await fetch(`${MONIEPOINT_BASE_URL}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        terminalSerial,
        amount,
        merchantReference,
        transactionType: 'PURCHASE',
        paymentMethod: paymentMethod ?? 'ANY',
      }),
    });

    if (response.status === 202) {
      // Log the pending payment to Firestore for audit trail
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

    const errorBody = await response.json() as { message?: string };
    functions.logger.error('[Moniepoint] Push failed', errorBody);

    return {
      success: false,
      error: errorBody.message ?? 'Failed to push payment to terminal',
    };
  }
);

// ─── Cloud Function: Get Transaction Status ────────────────────────────────────

interface StatusRequest {
  merchantReference: string;
}

/**
 * Callable function: poll transaction status from Moniepoint.
 * Used as a fallback if the Firestore real-time listener doesn't fire.
 */
export const getMoniepointTransactionStatus = functions.https.onCall(
  async (data: StatusRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { merchantReference } = data;
    if (!merchantReference) {
      throw new functions.https.HttpsError('invalid-argument', 'merchantReference required');
    }

    const token = await getAccessToken();

    const response = await fetch(
      `${MONIEPOINT_BASE_URL}/v1/transactions/merchants/${encodeURIComponent(merchantReference)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new functions.https.HttpsError('internal', 'Failed to query transaction status');
    }

    return response.json();
  }
);

// ─── Cloud Function: Webhook Receiver ─────────────────────────────────────────

/**
 * HTTPS endpoint that Moniepoint calls when a terminal transaction completes.
 *
 * Register this URL in your Moniepoint dashboard:
 *   https://<region>-<project>.cloudfunctions.net/moniepointWebhook
 *
 * Security:
 *  - Validates HMAC-SHA256 signature on every request
 *  - Idempotent: uses moniepoint-webhook-id to skip already-processed events
 *  - Responds immediately with 200 (async Firestore write)
 */
export const moniepointWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // ── 1. Extract signature headers ──────────────────────────────────────────
  const webhookId = req.headers['moniepoint-webhook-id'] as string;
  const webhookTimestamp = req.headers['moniepoint-webhook-timestamp'] as string;
  const webhookSignature = req.headers['moniepoint-webhook-signature'] as string;

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    functions.logger.warn('[Webhook] Missing signature headers');
    res.status(400).send('Missing signature headers');
    return;
  }

  // ── 2. Verify HMAC-SHA256 signature ───────────────────────────────────────
  const rawBody = JSON.stringify(req.body); // body-parser must be set to keep raw
  const signatureData = `${webhookId}__${webhookTimestamp}__${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', MONIEPOINT_WEBHOOK_SECRET)
    .update(signatureData)
    .digest('base64');

  if (expectedSignature !== webhookSignature) {
    functions.logger.warn('[Webhook] Invalid signature — possible spoofing attempt', {
      webhookId,
      received: webhookSignature,
    });
    res.status(401).send('Invalid signature');
    return;
  }

  // ── 3. Respond immediately (Moniepoint expects 2xx fast) ──────────────────
  res.status(200).json({ received: true });

  // ── 4. Idempotency check — skip if already processed ─────────────────────
  const processedRef = db.collection('moniepoint_processed_webhooks').doc(webhookId);
  const alreadyProcessed = await processedRef.get();
  if (alreadyProcessed.exists) {
    functions.logger.info('[Webhook] Duplicate webhook — skipping', { webhookId });
    return;
  }

  // ── 5. Parse and validate event type ──────────────────────────────────────
  const event = req.body as {
    eventId: string;
    eventType: string;
    createdAt: string;
    data: {
      amount: number;
      transactionReference: string;
      merchantReference: string;
      transactionStatus: string;
      transactionType: string;
      responseCode: string;
      responseMessage: string;
      transactionTime: string;
      terminalSerial: string;
      actualPaymentMethod: string | null;
      businessId: number;
      businessOwnerId: number;
    };
  };

  const PURCHASE_EVENTS = [
    'V1_POS_PURCHASE_TRANSACTION',
    'V1_POS_TRANSFER_TRANSACTION',
    'V1_POS_CARD_TRANSFER_TRANSACTION',
  ];

  functions.logger.info('[Webhook] Event received', {
    eventType: event.eventType,
    webhookId,
    merchantReference: event.data?.merchantReference,
  });

  // ── 6. Write result to Firestore (triggers frontend onSnapshot) ────────────
  const batch = db.batch();

  // Mark as processed (idempotency guard)
  batch.set(processedRef, {
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    eventType: event.eventType,
  });

  // Write to webhook results collection (keyed by merchantReference)
  if (event.data?.merchantReference && PURCHASE_EVENTS.includes(event.eventType)) {
    const resultRef = db
      .collection(WEBHOOK_RESULTS_COLLECTION)
      .doc(event.data.merchantReference);

    batch.set(
      resultRef,
      {
        // Normalized fields matching MoniepointWebhookPayload interface
        amount: event.data.amount / 100, // kobo → Naira
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
      },
      { merge: true }
    );

    // Also write to main transactions audit log
    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
      action: 'MONIEPOINT_WEBHOOK_RECEIVED',
      resource: `MoniepointTransaction:${event.data.merchantReference}`,
      details: {
        eventType: event.eventType,
        transactionStatus: event.data.transactionStatus,
        responseCode: event.data.responseCode,
        amount: event.data.amount / 100,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: 'system',
    });
  }

  await batch.commit();
  functions.logger.info('[Webhook] Successfully processed', { webhookId });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps Moniepoint response codes to a normalized status string.
 * '00' = Approved, anything else = check pending or failed.
 */
function mapResponseCodeToStatus(
  responseCode: string
): 'APPROVED' | 'PENDING' | 'FAILED' | 'DECLINED' {
  switch (responseCode) {
    case '00':
      return 'APPROVED';
    case '09':
      return 'PENDING';
    case '51': // Insufficient funds
    case '54': // Expired card
    case '55': // Wrong PIN
    case '91': // Issuer unavailable
      return 'DECLINED';
    default:
      return 'FAILED';
  }
}
