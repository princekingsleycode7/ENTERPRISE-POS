"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moniepointWebhook = exports.getMoniepointTransactionStatus = exports.pushMoniepointPayment = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const node_fetch_1 = __importDefault(require("node-fetch"));
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
async function getAccessToken() {
    const cacheDoc = await db.doc(TOKEN_CACHE_DOC).get();
    if (cacheDoc.exists) {
        const cache = cacheDoc.data();
        if (cache.expiresAt > Date.now() + 60_000)
            return cache.accessToken;
    }
    const response = await (0, node_fetch_1.default)(`${MONIEPOINT_BASE_URL}/v1/auth`, {
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
    const data = (await response.json());
    const expiresAt = Date.now() + data.expiresIn * 1000;
    await db.doc(TOKEN_CACHE_DOC).set({ accessToken: data.accessToken, expiresAt });
    return data.accessToken;
}
exports.pushMoniepointPayment = functions.https.onCall(async (data, context) => {
    try {
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
        functions.logger.info('[Moniepoint] Pushing payment', { terminalSerial, amount, merchantReference });
        const token = await getAccessToken();
        const response = await (0, node_fetch_1.default)(`${MONIEPOINT_BASE_URL}/v1/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                terminalSerial,
                amount,
                merchantReference,
                transactionType: 'PURCHASE',
                paymentMethod: paymentMethod ?? 'ANY'
            })
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
        functions.logger.error('[Moniepoint] Push failed', { status: response.status, errorBody });
        return {
            success: false,
            error: errorBody.message || errorBody.error || 'Failed to push payment to terminal'
        };
    }
    catch (error) {
        functions.logger.error('[Moniepoint] Unexpected error in pushMoniepointPayment', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred');
    }
});
exports.getMoniepointTransactionStatus = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        const { merchantReference } = data;
        if (!merchantReference)
            throw new functions.https.HttpsError('invalid-argument', 'merchantReference required');
        const token = await getAccessToken();
        const response = await (0, node_fetch_1.default)(`${MONIEPOINT_BASE_URL}/v1/transactions/merchants/${encodeURIComponent(merchantReference)}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            functions.logger.error('[Moniepoint] Status query failed', { status: response.status, errorBody });
            throw new functions.https.HttpsError('internal', `Failed to query transaction status: ${errorBody}`);
        }
        return response.json();
    }
    catch (error) {
        functions.logger.error('[Moniepoint] Unexpected error in getMoniepointTransactionStatus', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred');
    }
});
exports.moniepointWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const webhookId = req.headers['moniepoint-webhook-id'];
    const webhookTimestamp = req.headers['moniepoint-webhook-timestamp'];
    const webhookSignature = req.headers['moniepoint-webhook-signature'];
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
        functions.logger.warn('[Webhook] Missing signature headers');
        res.status(400).send('Missing signature headers');
        return;
    }
    const rawBody = JSON.stringify(req.body);
    const signatureData = `${webhookId}__${webhookTimestamp}__${rawBody}`;
    const expectedSignature = crypto.createHmac('sha256', MONIEPOINT_WEBHOOK_SECRET).update(signatureData).digest('base64');
    if (expectedSignature !== webhookSignature) {
        functions.logger.warn('[Webhook] Invalid signature', { webhookId, received: webhookSignature });
        res.status(401).send('Invalid signature');
        return;
    }
    res.status(200).json({ received: true });
    const processedRef = db.collection('moniepoint_processed_webhooks').doc(webhookId);
    const alreadyProcessed = await processedRef.get();
    if (alreadyProcessed.exists) {
        functions.logger.info('[Webhook] Duplicate webhook — skipping', { webhookId });
        return;
    }
    const event = req.body;
    const PURCHASE_EVENTS = ['V1_POS_PURCHASE_TRANSACTION', 'V1_POS_TRANSFER_TRANSACTION', 'V1_POS_CARD_TRANSFER_TRANSACTION'];
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
function mapResponseCodeToStatus(responseCode) {
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
