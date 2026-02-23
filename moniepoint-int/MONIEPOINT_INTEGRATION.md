# Moniepoint POS Integration Plan
**Enterprise POS System — Full Integration Blueprint**

---

## Overview

This plan connects your business's **Moniepoint POS terminal** to the Enterprise POS system so that physical card payments and bank transfers via the Moniepoint terminal are pushed, received, logged, and confirmed in real time — with the same smoothness as the existing KoraPay flow.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  POS App (React Frontend)                                           │
│   Cashier clicks "Moniepoint POS" → enters amount                  │
│       ↓  calls Firebase Callable Function                           │
├─────────────────────────────────────────────────────────────────────┤
│  Firebase Cloud Function: pushMoniepointPayment()                   │
│   • Manages OAuth token (cached in Firestore, auto-refreshed)       │
│   • Pushes payment to terminal via POST /v1/transactions            │
│       ↓  HTTP 202 Accepted                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Moniepoint POS Terminal (physical device in store)                 │
│   • Customer taps card OR initiates POS Transfer                    │
│       ↓  transaction completes (approved / declined)                │
├─────────────────────────────────────────────────────────────────────┤
│  Moniepoint Webhook → Firebase Function: moniepointWebhook()        │
│   • Validates HMAC-SHA256 signature                                 │
│   • Idempotency check via moniepoint-webhook-id                     │
│   • Writes result to Firestore: moniepoint_webhook_results/{ref}    │
│   • Writes to audit_logs                                            │
│       ↓  Firestore real-time update fires onSnapshot                │
├─────────────────────────────────────────────────────────────────────┤
│  POS App (React Frontend) — Firestore onSnapshot listener           │
│   • Detects APPROVED → completes transaction, prints receipt        │
│   • Detects FAILED/DECLINED → shows error, allows retry             │
│   • 2-minute timeout → graceful error message                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files Delivered

| File | Purpose |
|------|---------|
| `services/payment/moniepointService.ts` | Frontend service (mirrors korapayService) |
| `functions/src/moniepoint.ts` | Cloud Functions: push, status poll, webhook receiver |
| `components/pos/PaymentModal.tsx` | Updated PaymentModal with Moniepoint option |
| `config/env.ts` | Updated env config (secrets stay in Functions config) |
| `firestore.rules.moniepoint.txt` | Firestore security rules additions |

---

## Step-by-Step Setup

### Step 1 — Moniepoint Account Setup

1. Log in to your **Moniepoint business dashboard**
2. Navigate to **POS Terminal Configuration → POS Terminal Features**
3. Enable **ERP Integration** toggle
4. Navigate to **Settings → API Credentials**
5. Generate a new API client → note your `Client ID` and `Client Secret`
6. Note your **Terminal Serial Number** (printed on the terminal or in the dashboard)

---

### Step 2 — Firebase Functions Config (Secrets Storage)

Run these commands in your project root. These secrets **never touch the frontend**.

```bash
firebase functions:config:set moniepoint.client_id="YOUR_CLIENT_ID"
firebase functions:config:set moniepoint.client_secret="YOUR_CLIENT_SECRET"
firebase functions:config:set moniepoint.webhook_secret="YOUR_WEBHOOK_SECRET"
```

Verify:
```bash
firebase functions:config:get
```

---

### Step 3 — Install Functions Dependencies

```bash
cd functions
npm install node-fetch firebase-admin firebase-functions
npm install --save-dev @types/node-fetch
```

Export the new functions in `functions/src/index.ts`:

```typescript
export { pushMoniepointPayment, getMoniepointTransactionStatus, moniepointWebhook }
  from './moniepoint';
```

---

### Step 4 — Update .env File

Add your terminal serial to `.env.local`:

```env
REACT_APP_MONIEPOINT_TERMINAL_SERIAL=P260XXXXXXX
```

This is the default. Per-store overrides can be stored in Firestore `settings/store`.

---

### Step 5 — Update Firestore Rules

Merge the contents of `firestore.rules.moniepoint.txt` into your existing `firestore.rules`, inside the `match /databases/{database}/documents` block.

---

### Step 6 — Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This gives you a webhook URL like:
```
https://us-central1-YOUR-PROJECT.cloudfunctions.net/moniepointWebhook
```

---

### Step 7 — Register Webhook with Moniepoint

1. Go to your Moniepoint dashboard → **Webhooks / Subscriptions**
2. Create a new subscription:
   - **URL**: `https://us-central1-YOUR-PROJECT.cloudfunctions.net/moniepointWebhook`
   - **Events**: Select `V1_POS_PURCHASE_TRANSACTION`, `V1_POS_TRANSFER_TRANSACTION`, `V1_POS_CARD_TRANSFER_TRANSACTION`
3. Copy the generated **Webhook Secret**
4. Store it: `firebase functions:config:set moniepoint.webhook_secret="PASTE_SECRET_HERE"`
5. Redeploy: `firebase deploy --only functions`

---

### Step 8 — Add Terminal Serial to Store Settings

In your Firestore `settings/store` document, add:

```json
{
  "moniepoint_terminal_serial": "P260XXXXXXX"
}
```

The PaymentModal reads this automatically so cashiers don't have to type it.

---

### Step 9 — Update types.ts

Add `'moniepoint'` to the payment method union type:

```typescript
// In types.ts
payment_method: 'cash' | 'card' | 'bank_transfer' | 'moniepoint';
```

---

### Step 10 — Update Transaction Service

In `services/transactions/transactionService.ts`, handle the new payment method in the cash register logic. Moniepoint payments are electronic (not cash), so they should NOT affect the cash drawer balance:

```typescript
// In the transaction creation logic:
if (transactionData.payment_method === 'cash') {
  // update cash register balance as before
} else {
  // card, bank_transfer, moniepoint — no cash register update
}
```

---

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| **API Credentials** | Never exposed to frontend. Stored in Firebase Functions config only |
| **OAuth Token** | Auto-managed, cached in Firestore `system_cache/moniepoint_token`, auto-refreshed |
| **Webhook Authenticity** | HMAC-SHA256 signature verified on every webhook hit |
| **Idempotency** | `moniepoint-webhook-id` checked before processing — prevents duplicate transactions |
| **Client Writes Blocked** | Firestore rules deny any client write to `moniepoint_webhook_results` |
| **Firebase Auth Required** | All callable functions require authenticated Firebase user |
| **Role-Based Access** | Existing RBAC applies — cashiers can trigger, managers/admins can void |
| **Audit Trail** | Every webhook write also creates an `audit_logs` entry |

---

## Payment Flow Comparison

| | KoraPay (existing) | Moniepoint (new) |
|--|--|--|
| **Trigger** | Frontend pops a modal | Frontend pushes to physical terminal |
| **Customer action** | Types card details in browser modal | Taps card / transfers on POS device |
| **Success notification** | `onSuccess` JS callback | Firestore `onSnapshot` (via webhook) |
| **Offline resilience** | N/A | Polling fallback via `getMoniepointTransactionStatus` |
| **Secrets exposure** | Public key in frontend | Zero secrets in frontend |
| **Receipt** | Digital only | Physical terminal receipt + digital |

---

## Testing

### Test with Moniepoint Sandbox

1. Use Moniepoint's staging credentials (request from pos-integrations@moniepoint.com)
2. Use a test terminal serial from your sandbox account
3. Use beeceptor.com to inspect incoming webhook payloads first

### Verify Signature Locally

```javascript
const crypto = require('crypto');
const webhookId = "your-webhook-id";
const timestamp = "1728651860073";
const body = '{"data": {...}}';
const secret = "your-webhook-secret";

const data = `${webhookId}__${timestamp}__${body}`;
const sig = crypto.createHmac('sha256', secret).update(data).digest('base64');
console.log(sig); // should match moniepoint-webhook-signature header
```

---

## Support Contact

Moniepoint Integration Support: **pos-integrations@moniepoint.com**

---

## Rollout Checklist

- [ ] Step 1: ERP Integration enabled in Moniepoint dashboard
- [ ] Step 2: Functions config set with credentials
- [ ] Step 3: Functions dependencies installed
- [ ] Step 4: `.env.local` updated with terminal serial
- [ ] Step 5: Firestore rules updated and deployed
- [ ] Step 6: Functions deployed
- [ ] Step 7: Webhook URL registered with Moniepoint
- [ ] Step 8: Terminal serial in Firestore store settings
- [ ] Step 9: `types.ts` payment method union updated
- [ ] Step 10: Transaction service updated for moniepoint method
- [ ] Test end-to-end with a small real transaction on terminal
- [ ] Verify webhook arrives and transaction is logged in Firestore
- [ ] Verify receipt prints correctly
- [ ] Verify audit log entry created
