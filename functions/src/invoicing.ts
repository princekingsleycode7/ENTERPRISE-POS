import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Firebase Admin Init
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

interface TransactionData {
  merchant_id: string;
  total: number;
  platform_fee: number;
  platform_fee_status: string;
  createdAt: admin.firestore.Timestamp;
}

interface MerchantData {
  businessName: string;
}

interface MerchantGrouped {
  [merchantId: string]: admin.firestore.DocumentSnapshot[];
}

/**
 * Scheduled Cloud Function: Generate Monthly Invoices
 * Runs at 00:01 WAT on the 1st of every month
 * - Aggregates pending platform fees per merchant for the previous month
 * - Creates invoice documents
 * - Updates transaction statuses from 'pending' to 'invoiced'
 */
export const generateMonthlyInvoices = functions
  .pubsub
  .schedule('1 0 1 * *')
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    try {
      console.log('Starting monthly invoice generation...');

      // 1. Calculate previous month's date range
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      console.log(`Processing transactions from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

      // 2. Query all transactions in that period with platform_fee_status == 'pending'
      const txSnapshot = await db
        .collection('transactions')
        .where('createdAt', '>=', periodStart)
        .where('createdAt', '<=', periodEnd)
        .where('platform_fee_status', '==', 'pending')
        .get();

      console.log(`Found ${txSnapshot.docs.length} pending transactions`);

      if (txSnapshot.docs.length === 0) {
        console.log('No pending transactions found for invoice period');
        return;
      }

      // 3. Group transactions by merchant_id
      const byMerchant: MerchantGrouped = {};
      for (const doc of txSnapshot.docs) {
        const data = doc.data() as TransactionData;
        const merchantId = data.merchant_id;

        if (!merchantId) {
          console.warn(`Transaction ${doc.id} has no merchant_id, skipping`);
          continue;
        }

        if (!byMerchant[merchantId]) {
          byMerchant[merchantId] = [];
        }
        byMerchant[merchantId].push(doc);
      }

      console.log(`Grouped transactions into ${Object.keys(byMerchant).length} merchant(s)`);

      // 4. For each merchant, create an invoice document and update transactions
      for (const [merchantId, docs] of Object.entries(byMerchant)) {
        try {
          // Fetch merchant details
          const merchantDoc = await db.collection('merchants').doc(merchantId).get();
          const merchantData = merchantDoc.data() as MerchantData | undefined;

          if (!merchantDoc.exists) {
            console.warn(`Merchant ${merchantId} not found, still creating invoice`);
          }

          // Calculate totals
          const totalSalesValue = docs.reduce((sum, doc) => {
            const data = doc.data() as TransactionData;
            return sum + (data.total || 0);
          }, 0);

          const totalPlatformFee = docs.reduce((sum, doc) => {
            const data = doc.data() as TransactionData;
            return sum + (data.platform_fee || 0);
          }, 0);

          // Create invoice document
          const invoiceData = {
            merchantId,
            businessName: merchantData?.businessName || 'Unknown Business',
            periodStart: admin.firestore.Timestamp.fromDate(periodStart),
            periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
            transactionCount: docs.length,
            totalSalesValue: Math.round(totalSalesValue * 100) / 100,
            totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
            status: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paidAt: null,
          };

          const invoiceRef = await db.collection('platform_invoices').add(invoiceData);
          console.log(`Created invoice ${invoiceRef.id} for merchant ${merchantId}`);

          // 5. Mark all transactions as 'invoiced' using batch write
          const batch = db.batch();
          docs.forEach(doc => {
            batch.update(doc.ref, { 
              platform_fee_status: 'invoiced',
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
          });
          await batch.commit();

          console.log(`Updated ${docs.length} transactions for merchant ${merchantId} to 'invoiced' status`);
        } catch (error) {
          console.error(`Error processing merchant ${merchantId}:`, error);
          // Continue processing other merchants even if one fails
        }
      }

      console.log('Monthly invoice generation completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in generateMonthlyInvoices:', error);
      throw error;
    }
  });

/**
 * Callable function to manually trigger invoice generation (for testing)
 * Only accessible to platform admins
 */
export const manuallyGenerateInvoices = functions
  .https
  .onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to trigger invoice generation'
      );
    }

    // Check if user has platform_admin role
    const customClaims = context.auth.token as any;
    if (customClaims.role !== 'platform_admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only platform admins can trigger invoice generation'
      );
    }

    try {
      console.log('Manual invoice generation triggered by admin:', context.auth.uid);

      // Calculate previous month's date range
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      console.log(`Processing transactions from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

      // Query transactions with platform_fee_status == 'pending'
      const txSnapshot = await db
        .collection('transactions')
        .where('createdAt', '>=', periodStart)
        .where('createdAt', '<=', periodEnd)
        .where('platform_fee_status', '==', 'pending')
        .get();

      console.log(`Found ${txSnapshot.docs.length} pending transactions`);

      if (txSnapshot.docs.length === 0) {
        return {
          success: true,
          message: 'No pending transactions found for invoice period',
          invoicesCreated: 0
        };
      }

      // Group transactions by merchant_id
      const byMerchant: MerchantGrouped = {};
      for (const doc of txSnapshot.docs) {
        const data = doc.data() as TransactionData;
        const merchantId = data.merchant_id;

        if (!merchantId) {
          console.warn(`Transaction ${doc.id} has no merchant_id, skipping`);
          continue;
        }

        if (!byMerchant[merchantId]) {
          byMerchant[merchantId] = [];
        }
        byMerchant[merchantId].push(doc);
      }

      let invoicesCreated = 0;

      // For each merchant, create an invoice document
      for (const [merchantId, docs] of Object.entries(byMerchant)) {
        try {
          const merchantDoc = await db.collection('merchants').doc(merchantId).get();
          const merchantData = merchantDoc.data() as MerchantData | undefined;

          // Calculate totals
          const totalSalesValue = docs.reduce((sum, doc) => {
            const data = doc.data() as TransactionData;
            return sum + (data.total || 0);
          }, 0);

          const totalPlatformFee = docs.reduce((sum, doc) => {
            const data = doc.data() as TransactionData;
            return sum + (data.platform_fee || 0);
          }, 0);

          // Create invoice document
          const invoiceData = {
            merchantId,
            businessName: merchantData?.businessName || 'Unknown Business',
            periodStart: admin.firestore.Timestamp.fromDate(periodStart),
            periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
            transactionCount: docs.length,
            totalSalesValue: Math.round(totalSalesValue * 100) / 100,
            totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
            status: 'unpaid',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paidAt: null,
          };

          const invoiceRef = await db.collection('platform_invoices').add(invoiceData);
          console.log(`Created invoice ${invoiceRef.id} for merchant ${merchantId}`);

          // Mark transactions as 'invoiced'
          const batch = db.batch();
          docs.forEach(doc => {
            batch.update(doc.ref, { 
              platform_fee_status: 'invoiced',
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
          });
          await batch.commit();

          invoicesCreated++;
          console.log(`Updated ${docs.length} transactions for merchant ${merchantId} to 'invoiced' status`);
        } catch (error) {
          console.error(`Error processing merchant ${merchantId}:`, error);
        }
      }

      return {
        success: true,
        message: `Successfully created ${invoicesCreated} invoice(s)`,
        invoicesCreated,
        transactionsProcessed: txSnapshot.docs.length
      };
    } catch (error) {
      console.error('Error in manuallyGenerateInvoices:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error generating invoices: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  });
