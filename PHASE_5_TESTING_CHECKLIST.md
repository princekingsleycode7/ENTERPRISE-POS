# Phase 5 — Testing Checklist & Verification Guide

**Date:** February 28, 2026  
**Status:** Complete Implementation Ready for Testing

---

## Pre-Testing Setup

### 1. Test Merchant Account
- [ ] Create a new merchant document in Firestore (`merchants` collection)
  ```json
  {
    "businessName": "Test Coffee Shop",
    "ownerEmail": "test@coffee.com",
    "phone": "+2347012345678",
    "isActive": false,
    "activatedAt": null,
    "activatedBy": null,
    "planType": "standard",
    "platformFeeRate": 0.01,
    "createdAt": "2026-02-28T00:00:00Z"
  }
  ```

### 2. Test Employee
- [ ] Create employee record with `merchant_id` field pointing to test merchant
  ```json
  {
    "name": "Test Cashier",
    "pin_hash": "...",
    "role": "cashier",
    "active": true,
    "merchant_id": "test-merchant-id"
  }
  ```

### 3. Test Products
- [ ] Ensure test products exist in Firestore with prices
  - Example: Coffee (₦5,000), Snacks (₦2,500)

### 4. Admin Account
- [ ] Firebase user created with email/password
- [ ] Custom claim set: `{ "role": "platform_admin" }`

---

## Part A: Setup Fee / Activation

### Test 1.1: Inactive Merchant Sees Pending Activation
**Steps:**
1. Log in as test employee with PIN (merchant is `isActive: false`)
2. Should be redirected to `/pending-activation` instead of POS
3. Verify page shows:
   - "Your account is pending activation"
   - Contact information (WhatsApp, Email)
   - ₦25,000 setup fee message
4. Click Logout button → returns to PIN login

**Expected Result:** ✅ Inactive merchants cannot access POS

---

### Test 1.2: Admin Activates Merchant
**Steps:**
1. Log in to admin dashboard at `/admin/login` with admin email/password
2. Navigate to "Pending Merchant Activations" panel
3. Find test merchant in the list
4. Click "Activate Account" button
5. Verify in Firestore that merchant document now has:
   - `isActive: true`
   - `activatedAt: <current-timestamp>`
   - `activatedBy: <admin-uid>`

**Expected Result:** ✅ Merchant document updated with activation details

---

### Test 1.3: Activated Merchant Can Access POS
**Steps:**
1. Log out of admin dashboard
2. Log in as test employee (same merchant, now activated)
3. Should proceed directly to POS (no activation gate)
4. Verify full access to:
   - POS interface
   - Inventory
   - Reports
   - Settings

**Expected Result:** ✅ Activated merchant has full system access

---

## Part B: Transaction Fee Tracking

### Test 2.1: Complete Sale & Verify Platform Fee
**Steps:**
1. Log in as merchant employee (activated)
2. Complete a test sale:
   - Add Coffee (₦5,000)
   - Add Snacks (₦2,500)
   - Total: ₦7,500
3. Complete checkout with payment
4. Open Firestore Console → `transactions` collection
5. Find the new transaction
6. Verify fields:
   - `platform_fee: 75` (1% of 7,500)
   - `platform_fee_rate: 0.01`
   - `platform_fee_status: 'pending'`
   - `merchant_id: '<your-test-merchant-id>'`
   - `total: 7500` (unchanged from customer perspective)

**Expected Result:** ✅ Fee calculated as exactly 1%, stored with pending status

**Calculation Verification:**
```
Sale Total:        ₦7,500.00
Fee Rate:          1% (0.01)
Calculated Fee:    ₦7,500 × 0.01 = ₦75.00
Expected in DB:    75 (stored as number, 2 decimal places)
```

---

### Test 2.2: Verify Fee NOT on Customer Receipt
**Steps:**
1. During Test 2.1, if printer is enabled, check receipt
2. Receipt should show:
   - Items listed
   - Subtotal: ₦7,500
   - Tax (if applicable)
   - **Total: ₦7,500** ← No fee added
3. Platform fee should NOT appear anywhere on receipt

**Expected Result:** ✅ Customer receipt unchanged; fee is internal only

---

### Test 2.3: Offline Sale Sync with Fee Fields
**Steps:**
1. Disable internet (go offline)
2. Complete another test sale while offline
3. Verify transaction saved locally in IndexedDB
4. Re-enable internet
5. Wait for sync (or trigger manually)
6. Check Firestore transaction document
7. Verify all fee fields survived sync:
   - `platform_fee: <correct value>`
   - `platform_fee_rate: 0.01`
   - `platform_fee_status: 'pending'`

**Expected Result:** ✅ Fee fields preserved through offline-to-online sync

---

### Test 2.4: Multiple Transactions Accumulate Fees
**Steps:**
1. Complete 3 more test sales with different amounts:
   - Sale 1: ₦10,000 → Fee: ₦100
   - Sale 2: ₦5,000 → Fee: ₦50
   - Sale 3: ₦3,000 → Fee: ₦30
2. Open Firestore Console
3. View all transactions for the test merchant
4. Verify each has correct fee (1% of total)
5. Note total fees for next section: ₦75 + ₦100 + ₦50 + ₦30 = ₦255

**Expected Result:** ✅ Each transaction independently calculated and tracked

---

## Part C: Monthly Invoice Function

### Test 3.1: Manually Trigger Monthly Invoice Generation
**Steps:**
1. Open Firebase Console → Functions
2. Find callable function: `manuallyGenerateInvoices`
3. Click "Test the function"
4. Leave request body empty (uses authenticated user)
5. Click "Execute"
6. Observe response showing:
   - `success: true`
   - `invoicesCreated: 1`
   - `transactionsProcessed: 4`

**Expected Result:** ✅ Function executes and creates invoice

---

### Test 3.2: Verify Invoice Document Created
**Steps:**
1. Open Firestore Console → `platform_invoices` collection
2. Find the newly created document
3. Verify all fields:
   ```json
   {
     "merchantId": "test-merchant-id",
     "businessName": "Test Coffee Shop",
     "periodStart": "2026-02-01T00:00:00Z",
     "periodEnd": "2026-02-28T23:59:59Z",
     "transactionCount": 4,
     "totalSalesValue": 25500,
     "totalPlatformFee": 255,
     "status": "unpaid",
     "createdAt": "2026-02-28T...",
     "paidAt": null
   }
   ```

**Expected Result:** ✅ Invoice document complete and accurate

**Verification Math:**
```
Transaction Totals:  ₦7,500 + ₦10,000 + ₦5,000 + ₦3,000 = ₦25,500 ✓
Fee Total:           ₦75 + ₦100 + ₦50 + ₦30 = ₦255 ✓
Count:               4 transactions ✓
Status:              unpaid ✓
```

---

### Test 3.3: Verify Transactions Updated to 'invoiced'
**Steps:**
1. Open Firestore Console → `transactions` collection
2. Filter by merchant_id = test merchant
3. For each of the 4 transactions, verify:
   - Before invoice generation: `platform_fee_status: 'pending'`
   - After invoice generation: `platform_fee_status: 'invoiced'`
4. Check `updated_at` timestamp was updated

**Expected Result:** ✅ All pending transactions moved to invoiced status

---

### Test 3.4: Admin Dashboard Shows Unpaid Invoice
**Steps:**
1. Log in to admin dashboard (`/admin/login`)
2. Go to "Outstanding Invoices" panel
3. Verify invoice appears showing:
   - Test Coffee Shop (business name)
   - Period: Feb 1 - Feb 28
   - 4 transactions
   - Total Sales: ₦25,500
   - Fee Owed: ₦255
4. Click "Mark as Paid" button
5. Verify invoice status changes to `paid` and `paidAt` is set

**Expected Result:** ✅ Admin can track and mark invoices as paid

---

## Part D: Security Verification

### Test 4.1: Merchant Cannot Read Another Merchant's Transactions
**Steps:**
1. Create a second test merchant with a different employee
2. Log in as Employee 1 (Merchant A)
3. Try to query transactions where merchant_id = Merchant B's ID via Firestore SDK
4. Should get **permission denied error**
5. Verify Firestore rules prevent cross-merchant access

**Expected Result:** ✅ Merchants cannot access other merchants' data

---

### Test 4.2: Merchant Cannot Modify platform_fee_status
**Steps:**
1. Log in as merchant employee
2. Get a transaction document from Firestore
3. Attempt to update `platform_fee_status` to 'paid'
4. Update should fail with **permission denied**
5. Verify Firestore rules block this write

**Expected Result:** ✅ Only Cloud Functions can update fee status

---

### Test 4.3: Merchant Cannot Read platform_invoices
**Steps:**
1. Log in as merchant employee
2. Try to read `platform_invoices` collection from Firestore SDK
3. Should get **permission denied error**
4. Verify employee cannot access billing data

**Expected Result:** ✅ Invoices hidden from merchants

---

### Test 4.4: Platform Admin Can Read All Data
**Steps:**
1. Log in to admin dashboard
2. Dashboard loads successfully and displays:
   - All inactive merchants
   - All unpaid invoices (across all merchants)
3. Verify admin can view:
   - Any transaction via Firestore Console
   - Any invoice document
   - Any merchant account

**Expected Result:** ✅ Admin has full read/write access

---

### Test 4.5: Merchant Employee Cannot Access Admin Dashboard
**Steps:**
1. Log in as merchant employee
2. Try to navigate to `/admin` or `/admin/login`
3. Should be blocked and redirected
4. Try to access admin API endpoints directly → permission denied

**Expected Result:** ✅ Admin routes secured from merchant users

---

## Part E: Data Consistency Verification

### Test 5.1: Merchant ID Consistency Across Systems
**Steps:**
1. Check test merchant's transactions
2. Verify every transaction document has: `merchant_id: "test-merchant-id"`
3. Check invoice document has: `merchantId: "test-merchant-id"`
4. Verify employee record has: `merchant_id: "test-merchant-id"`
5. Check auth store after login: `merchantId === employee.merchant_id`

**Expected Result:** ✅ merchantId consistently used for isolation

---

### Test 5.2: Fee Rate Snapshot Preserved
**Steps:**
1. Check any transaction: `platform_fee_rate: 0.01`
2. Change merchant's `platformFeeRate` to 0.02
3. Complete another sale
4. New transaction should have: `platform_fee_rate: 0.02`
5. Old transaction should still have: `platform_fee_rate: 0.01`

**Expected Result:** ✅ Each transaction captures rate at time of sale

---

## Firestore Rules Validation

### Verify firestore.rules Syntax
**Steps:**
1. Open `firestore.rules` file
2. Check syntax includes:
   - [ ] `/merchants/{merchantId}` - read own, admin write
   - [ ] `/transactions/{transactionId}` - merchant reads own, admin reads all
   - [ ] `/platform_invoices/{invoiceId}` - admin only
   - [ ] All rules have `allow delete: if false`

**Expected Result:** ✅ All access rules in place

---

## Post-Testing Sign-Off

### ✅ All Tests Pass When:

1. **Activation Gate Works:**
   - Inactive merchants blocked
   - Activation button works
   - Activated merchants access POS

2. **Fee Tracking Works:**
   - Fees calculated as 1%
   - Fee fields in every transaction
   - Offline sync preserves fees
   - No customer-facing impact

3. **Invoicing Works:**
   - Manual function trigger succeeds
   - Invoice document created correctly
   - Transaction status updated
   - Admin dashboard displays unpaid invoices

4. **Security Enforced:**
   - Cross-merchant reads blocked
   - Fee modifications blocked
   - Invoice access restricted
   - Admin access secured

5. **Data Consistency:**
   - merchantId used consistently
   - Fee rates captured per transaction
   - All timestamp fields populated

---

## Troubleshooting

### Problem: "Pending Activation page doesn't show"
- [ ] Verify merchant `isActive: false` in Firestore
- [ ] Clear browser cache and local storage
- [ ] Check browser console for errors
- [ ] Restart development server

### Problem: "Transaction doesn't have platform_fee"
- [ ] Verify transactionService.ts imports merchantService correctly
- [ ] Verify merchant document exists in Firestore
- [ ] Check Firestore security rules allow reads
- [ ] Verify merchant_id is passed from Cart component

### Problem: "Invoice function fails with permission-denied"
- [ ] Verify serviceAccountKey.json exists and is valid
- [ ] Verify custom claim `role: platform_admin` is set on the user
- [ ] Check Cloud Function logs in Firebase Console
- [ ] Verify function is deployed: `firebase deploy --only functions`

### Problem: "Admin can't see invoices in dashboard"
- [ ] Verify admin user has custom claim set
- [ ] Verify Firestore rules allow platform_admin to read invoices
- [ ] Check browser console for auth errors
- [ ] Verify queryDocuments function works in Firestore

---

## Sign-Off

**All tests completed:** _____ (Date)  
**Tested by:** ________________  
**Status:** 
- [ ] Ready for production
- [ ] Needs fixes (list issues above)

---

## Notes

- Do NOT modify transaction totals or customer receipts
- Do NOT change payment flows (Korapay/Moniepoint)
- Fee is platform cost, NOT customer charge
- merchantId is the key isolation field for multi-tenancy
- All dates should be in ISO 8601 format
- All monetary values stored as numbers (not strings)
