/**
 * moniepointService.ts
 *
 * Enterprise Moniepoint POS Integration Service
 * Mirrors the structure of korapayService.ts so PaymentModal integration is seamless.
 *
 * ARCHITECTURE OVERVIEW
 * ─────────────────────
 * Unlike KoraPay (frontend SDK popup), Moniepoint uses a server-side Push Payment flow:
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  POS App (this file)                                            │
 *  │    ↓  calls Firebase Function: pushMoniepointPayment()          │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │  Firebase Cloud Function (functions/src/moniepoint.ts)          │
 *  │    ↓  manages OAuth token + pushes to Moniepoint API            │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │  Moniepoint Terminal (physical POS device)                      │
 *  │    ↓  customer taps card / does transfer                        │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │  Moniepoint Webhook → Firebase Function: moniepointWebhook()    │
 *  │    ↓  validates HMAC-SHA256 signature → writes to Firestore     │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │  POS App (this file) — Firestore onSnapshot listener            │
 *  │    ↓  detects APPROVED/FAILED → calls onSuccess / onFailed      │
 *  └─────────────────────────────────────────────────────────────────┘
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '../firebase'; // existing firebase app instance

// ─── Types ────────────────────────────────────────────────────────────────────

export type MoniepointPaymentMethod = 'CARD_PURCHASE' | 'POS_TRANSFER' | 'ANY';

export interface MoniepointPaymentParams {
  amount: number;            // in Naira (we convert to kobo internally)
  reference: string;         // unique merchantReference
  terminalSerial: string;    // from settings/store config
  paymentMethod: MoniepointPaymentMethod;
  onSuccess: (data: MoniepointWebhookPayload) => void;
  onFailed: (data: MoniepointWebhookPayload | null) => void;
  onTimeout?: () => void;
}

export interface MoniepointWebhookPayload {
  amount: number;
  transactionReference: string;
  merchantReference: string;
  transactionStatus: 'APPROVED' | 'PENDING' | 'FAILED' | 'DECLINED';
  transactionType: string;
  responseCode: string;
  responseMessage: string;
  transactionTime: string;
  terminalSerial: string;
  actualPaymentMethod: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum time to wait for a terminal response before timing out (2 minutes) */
const PAYMENT_TIMEOUT_MS = 2 * 60 * 1000;

/** Firestore collection where the webhook Cloud Function writes results */
const WEBHOOK_RESULTS_COLLECTION = 'moniepoint_webhook_results';

// ─── Service ──────────────────────────────────────────────────────────────────

export const moniepointService = {
  /**
   * Generate a unique merchant reference.
   * Mirrors: korapayService.generateReference()
   */
  generateReference: (): string => {
    return `MNP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  },

  /**
   * Initialize a Moniepoint POS payment.
   * Mirrors: korapayService.initializePayment()
   *
   * 1. Calls a Firebase Cloud Function to push the payment request to the terminal.
   * 2. Subscribes to Firestore for real-time webhook result updates.
   * 3. Calls onSuccess or onFailed based on terminal response.
   */
  initializePayment: async (params: MoniepointPaymentParams): Promise<() => void> => {
    const functions = getFunctions(app);
    const db = getFirestore(app);

    // 1. Push payment to terminal via secure Cloud Function
    const pushPayment = httpsCallable<
      { terminalSerial: string; amount: number; merchantReference: string; paymentMethod: string },
      { success: boolean; error?: string }
    >(functions, 'pushMoniepointPayment');

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeFirestore: (() => void) | null = null;

    // Cleanup helper — cancels timeout and Firestore listener
    const cleanup = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (unsubscribeFirestore) unsubscribeFirestore();
    };

    try {
      const result = await pushPayment({
        terminalSerial: params.terminalSerial,
        amount: Math.round(params.amount * 100), // Naira → kobo
        merchantReference: params.reference,
        paymentMethod: params.paymentMethod,
      });

      if (!result.data.success) {
        params.onFailed(null);
        return cleanup;
      }
    } catch (err) {
      console.error('[Moniepoint] Failed to push payment to terminal:', err);
      params.onFailed(null);
      return cleanup;
    }

    // 2. Listen for webhook result in Firestore (written by moniepointWebhook Cloud Function)
    const resultDocRef = doc(db, WEBHOOK_RESULTS_COLLECTION, params.reference);

    unsubscribeFirestore = onSnapshot(resultDocRef, (snapshot) => {
      if (!snapshot.exists()) return; // Waiting...

      const data = snapshot.data() as MoniepointWebhookPayload & { processed: boolean };
      const status = data.transactionStatus;

      if (status === 'APPROVED') {
        cleanup();
        params.onSuccess(data);
      } else if (status === 'FAILED' || status === 'DECLINED') {
        cleanup();
        params.onFailed(data);
      }
      // PENDING status — keep listening
    });

    // 3. Set a timeout in case the terminal never responds
    timeoutHandle = setTimeout(() => {
      cleanup();
      if (params.onTimeout) {
        params.onTimeout();
      } else {
        params.onFailed(null);
      }
    }, PAYMENT_TIMEOUT_MS);

    // Return cleanup function so callers can cancel if modal is closed early
    return cleanup;
  },

  /**
   * Poll transaction status via Cloud Function (fallback if Firestore listener fails).
   * Mirrors the manual polling approach described in Moniepoint docs.
   */
  pollTransactionStatus: async (merchantReference: string): Promise<{
    processingStatus: 'PROCESSED' | 'PENDING' | 'CANCELLED';
    transactionStatus?: string;
    actualPaymentMethod?: string;
    actualAmount?: number;
  } | null> => {
    try {
      const functions = getFunctions(app);
      const getStatus = httpsCallable<
        { merchantReference: string },
        { processingStatus: string; [key: string]: unknown }
      >(functions, 'getMoniepointTransactionStatus');

      const result = await getStatus({ merchantReference });
      return result.data as any;
    } catch (err) {
      console.error('[Moniepoint] Status poll failed:', err);
      return null;
    }
  },
};
