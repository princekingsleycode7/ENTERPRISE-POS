/**
 * services/tax/deductionOptimizer.ts
 *
 * Automated Deduction Optimizer for Tax Advisor
 * Scans transactions and inventory to identify missed tax deductions and savings opportunities
 */

import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { offlineDB } from '../offline/db';
import {
  DeductionReport,
  VATOvercharge,
  MissedDeduction,
  CapitalAllowance,
  ThresholdWarning,
  PriorityAction,
  Transaction,
  Product
} from '../../types';

// VAT-Exempt Items List (per VAT Act, Schedule 1)
const NIGERIAN_EXEMPT_ITEMS = {
  basic_foodstuffs: [
    'rice',
    'beans',
    'yam',
    'bread',
    'milk',
    'vegetables',
    'fruits',
    'flour',
    'salt',
    'sugar',
    'maize',
    'cassava',
    'palm oil',
    'cooking oil',
    'tomato',
    'onion',
    'garlic',
    'ginger',
    'leafy greens'
  ],
  medical_items: [
    'drugs',
    'medication',
    'pharmaceutical',
    'antibiotics',
    'paracetamol',
    'medical equipment',
    'syringe',
    'bandage',
    'first aid',
    'antiseptic',
    'vitamins',
    'supplements'
  ],
  educational_materials: [
    'textbook',
    'book',
    'exercise book',
    'notebook',
    'pen',
    'pencil',
    'school uniform',
    'stationery'
  ],
  agricultural_items: [
    'seeds',
    'seedlings',
    'farm equipment',
    'agricultural',
    'tractor',
    'fertilizer',
    'pesticide',
    'farming tools'
  ],
  baby_products: [
    'baby food',
    'baby formula',
    'diapers',
    'baby care',
    'infant formula'
  ]
};

// CITA s.24 Deductible Expense Categories
const DEDUCTIBLE_EXPENSE_CATEGORIES = [
  'repairs and maintenance',
  'professional services',
  'utilities',
  'transport and logistics',
  'staff welfare',
  'insurance',
  'advertising and marketing',
  'office supplies',
  'cleaning and maintenance',
  'rent',
  'consultancy',
  'training',
  'repairs'
];

// Fuzzy string matching for category detection
function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;

  const track = Array(bLower.length + 1)
    .fill(null)
    .map(() => Array(aLower.length + 1).fill(null));

  for (let i = 0; i <= aLower.length; i += 1) {
    track[0][i] = i;
  }

  for (let j = 0; j <= bLower.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= bLower.length; j += 1) {
    for (let i = 1; i <= aLower.length; i += 1) {
      const indicator = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[bLower.length][aLower.length];
}

function isFuzzyMatch(
  itemName: string,
  exemptItem: string,
  threshold: number = 3
): boolean {
  return levenshteinDistance(itemName, exemptItem) <= threshold;
}

function isExemptItem(itemName: string): boolean {
  const nameLower = itemName.toLowerCase();

  // Direct substring match
  for (const category of Object.values(NIGERIAN_EXEMPT_ITEMS)) {
    if (category.some(item => nameLower.includes(item) || isFuzzyMatch(nameLower, item))) {
      return true;
    }
  }

  return false;
}

function isDeductibleExpense(category: string): boolean {
  const categoryLower = category.toLowerCase();
  return DEDUCTIBLE_EXPENSE_CATEGORIES.some(
    expense => categoryLower.includes(expense) || isFuzzyMatch(categoryLower, expense, 4)
  );
}

/**
 * Pull last 12 months of transactions from Firebase
 */
async function getLast12MonthsTransactions(): Promise<Transaction[]> {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const q = query(
      collection(db, 'transactions'),
      where('created_at', '>=', Timestamp.fromDate(twelveMonthsAgo)),
      where('payment_status', '==', 'paid')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Transaction));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    // Fallback to offline DB
    try {
      const allTransactions = await offlineDB.transactions.toArray();
      const twelveMonthsAgo = Date.now() - 12 * 30 * 24 * 60 * 60 * 1000;
      return allTransactions.filter(
        t =>
          (typeof t.created_at === 'string'
            ? new Date(t.created_at).getTime()
            : t.created_at) > twelveMonthsAgo && t.payment_status === 'paid'
      );
    } catch {
      return [];
    }
  }
}

/**
 * Identify VAT overcharges on exempt items
 */
async function identifyVATOvercharges(transactions: Transaction[]): Promise<VATOvercharge[]> {
  const overcharges: VATOvercharge[] = [];

  for (const transaction of transactions) {
    for (const item of transaction.items) {
      if (isExemptItem(item.name)) {
        const vatAmount = (item.price * item.quantity * 0.075); // Assuming 7.5% VAT
        overcharges.push({
          itemName: item.name,
          quantity: item.quantity,
          vatChargedNaira: vatAmount,
          category: 'VAT Overcharge',
          shouldBeExempt: true
        });
      }
    }
  }

  return overcharges;
}

/**
 * Identify missed deductions under CITA s.24
 */
function identifyMissedDeductions(transactions: Transaction[]): MissedDeduction[] {
  const deductionMap = new Map<string, { amount: number; count: number }>();

  for (const transaction of transactions) {
    for (const item of transaction.items) {
      if (isDeductibleExpense(item.name)) {
        const key = `deductible_${item.name}`;
        const current = deductionMap.get(key) || { amount: 0, count: 0 };
        current.amount += item.price * item.quantity;
        current.count += 1;
        deductionMap.set(key, current);
      }
    }
  }

  const deductions: MissedDeduction[] = Array.from(deductionMap.entries()).map(
    ([_, value]) => ({
      category: 'Business Expense',
      amount: value.amount,
      itemCount: value.count,
      lawCitation: 'CITA s.24(3)',
      description: `Deductible business expenses (${value.count} items)`
    })
  );

  return deductions;
}

/**
 * Identify capital allowances for equipment purchases
 */
function identifyCapitalAllowances(transactions: Transaction[]): CapitalAllowance[] {
  const allowances: CapitalAllowance[] = [];
  const capitalKeywords = [
    'equipment',
    'machinery',
    'furniture',
    'fixture',
    'computer',
    'vehicle',
    'tool',
    'generator',
    'server'
  ];

  for (const transaction of transactions) {
    for (const item of transaction.items) {
      const isCapital = capitalKeywords.some(keyword =>
        item.name.toLowerCase().includes(keyword)
      );

      if (isCapital && item.price > 50000) {
        // Only flag as capital if > ₦50k
        const cost = item.price * item.quantity;
        allowances.push({
          description: item.name,
          purchaseDate: transaction.created_at || new Date().toISOString(),
          costNaira: cost,
          initialAllowance: cost * 0.5, // 50% initial allowance
          yearlyAllowance: cost * 0.25, // 25% annual allowance
          category: 'Plant & Machinery',
          lawCitation: 'CITA Third Schedule'
        });
      }
    }
  }

  return allowances;
}

/**
 * Calculate annual revenue and check threshold warning
 */
function calculateThresholdWarning(transactions: Transaction[]): ThresholdWarning | null {
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const thresholdRevenue = 25000000; // ₦25M
  const warningThreshold = 20000000; // ₦20M (₦5M buffer)

  if (totalRevenue >= warningThreshold && totalRevenue < thresholdRevenue) {
    return {
      isCritical: true,
      currentAnnualRevenue: totalRevenue,
      thresholdRevenue,
      remainingBuffer: thresholdRevenue - totalRevenue,
      message: `⚠️ Your revenue (₦${totalRevenue.toLocaleString()}) is within ₦5M of the ₦25M small company threshold. Once you exceed ₦25M, you will owe 20% CIT instead of being exempt.`,
      cipRate: 0.2
    };
  }

  if (totalRevenue >= thresholdRevenue) {
    return {
      isCritical: true,
      currentAnnualRevenue: totalRevenue,
      thresholdRevenue,
      remainingBuffer: 0,
      message: `⚠️ Your revenue (₦${totalRevenue.toLocaleString()}) exceeds ₦25M. You now owe 20% CIT on your profits.`,
      cipRate: 0.2
    };
  }

  return null;
}

/**
 * Rank priority actions by potential savings
 */
function calculatePriorityActions(
  vatOvercharges: VATOvercharge[],
  missedDeductions: MissedDeduction[],
  capitalAllowances: CapitalAllowance[]
): PriorityAction[] {
  const actions: PriorityAction[] = [];
  let rank = 1;

  // Add VAT overcharge actions
  const totalVATOvercharge = vatOvercharges.reduce((sum, item) => sum + item.vatChargedNaira, 0);
  if (totalVATOvercharge > 0 && rank <= 5) {
    actions.push({
      rank: rank++,
      title: 'Reclaim VAT on Exempt Items',
      estimatedSavingNaira: totalVATOvercharge,
      effortLevel: 'Medium',
      description: `Correct VAT records for ${vatOvercharges.length} exempt items that were incorrectly taxed.`,
      lawReference: 'VAT Act Cap V1 s.3, Schedule 1',
      actionableQuestion:
        'How do I reclaim VAT that was incorrectly charged on exempt food and medical items?'
    });
  }

  // Add missed deductions
  const totalMissedDeductions = missedDeductions.reduce((sum, item) => sum + item.amount, 0);
  if (totalMissedDeductions > 0 && rank <= 5) {
    actions.push({
      rank: rank++,
      title: 'Claim All Deductible Expenses',
      estimatedSavingNaira: totalMissedDeductions * 0.2, // 20% CIT rate
      effortLevel: 'Low',
      description: `Document and claim ₦${totalMissedDeductions.toLocaleString()} in deductible business expenses.`,
      lawReference: 'CITA s.24(3)',
      actionableQuestion:
        'Which business expenses can I include as tax deductions under CITA Section 24?'
    });
  }

  // Add capital allowance actions
  const totalCapitalCost = capitalAllowances.reduce((sum, item) => sum + item.costNaira, 0);
  const totalCapitalAllowance = capitalAllowances.reduce(
    (sum, item) => sum + item.initialAllowance,
    0
  );
  if (totalCapitalAllowance > 0 && rank <= 5) {
    actions.push({
      rank: rank++,
      title: 'Claim Capital Allowances on Equipment',
      estimatedSavingNaira: totalCapitalAllowance * 0.2, // 20% CIT rate
      effortLevel: 'Medium',
      description: `Claim ₦${totalCapitalAllowance.toLocaleString()} in initial (50%) and annual (25%) allowances on ${capitalAllowances.length} equipment purchases.`,
      lawReference: 'CITA Third Schedule',
      actionableQuestion:
        'How do I claim capital allowances for my business equipment purchases?'
    });
  }

  // Sort by estimated savings and return top 5
  return actions.slice(0, 5);
}

/**
 * Main Deduction Scan Function
 */
export async function runDeductionScan(userId: string): Promise<DeductionReport> {
  const startTime = Date.now();

  try {
    // Fetch last 12 months of transactions
    const transactions = await getLast12MonthsTransactions();

    // Run all scans in parallel
    const [vatOvercharges, missedDeductions, capitalAllowances, thresholdWarning] =
      await Promise.all([
        identifyVATOvercharges(transactions),
        Promise.resolve(identifyMissedDeductions(transactions)),
        Promise.resolve(identifyCapitalAllowances(transactions)),
        Promise.resolve(calculateThresholdWarning(transactions))
      ]);

    // Calculate total VAT overcharges
    const totalVATOvercharges = vatOvercharges.reduce((sum, item) => sum + item.vatChargedNaira, 0);

    // Calculate total missed deductions (impact on CIT at 20% rate)
    const totalMissedDeductionsAmount = missedDeductions.reduce((sum, item) => sum + item.amount, 0);
    const citSavingsFromDeductions = totalMissedDeductionsAmount * 0.2;

    // Calculate total capital allowances (impact on CIT)
    const totalCapitalAllowances = capitalAllowances.reduce(
      (sum, item) => sum + item.initialAllowance,
      0
    );
    const citSavingsFromCapital = totalCapitalAllowances * 0.2;

    // Calculate priority actions
    const priorityActions = calculatePriorityActions(
      vatOvercharges,
      missedDeductions,
      capitalAllowances
    );

    // Calculate total potential savings
    const totalPotentialSavings =
      totalVATOvercharges + citSavingsFromDeductions + citSavingsFromCapital;

    const scanDuration = Date.now() - startTime;
    console.log(`✅ Deduction scan completed in ${scanDuration}ms`);

    return {
      scanDate: new Date().toISOString(),
      totalPotentialSavings,
      vatOvercharges,
      missedDeductions,
      capitalAllowances,
      thresholdWarning,
      priorityActions,
      lastScannedTimestamp: Date.now()
    };
  } catch (error) {
    console.error('Deduction scan failed:', error);
    // Return empty report on error
    return {
      scanDate: new Date().toISOString(),
      totalPotentialSavings: 0,
      vatOvercharges: [],
      missedDeductions: [],
      capitalAllowances: [],
      thresholdWarning: null,
      priorityActions: [],
      lastScannedTimestamp: Date.now()
    };
  }
}
