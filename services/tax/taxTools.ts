/**
 * services/tax/taxTools.ts
 * 
 * Tool function definitions for Tax Advisor Claude integration
 * These functions query existing Firestore/Dexie services and return clean JSON
 */

import { offlineDB } from '../offline/db';
import { Transaction, Product, Employee, Settings } from '../../types';

/**
 * Result interfaces for each tool
 */
export interface BusinessInfo {
  store_name: string;
  store_type: string;
  registration_status: string;
  nin_or_tin: string;
  estimated_annual_revenue: number;
  currency: string;
}

export interface TransactionsSummary {
  period: string;
  total_revenue: number;
  total_refunds: number;
  total_discounts: number;
  net_revenue: number;
  total_transactions: number;
  transaction_count: number;
  product_variety_count: number;
}

export interface VATCollected {
  month: number;
  year: number;
  taxable_items_revenue: number;
  vat_on_taxable: number;
  exempt_items_revenue: number;
  total_revenue: number;
  vat_rate: number;
}

export interface InventoryCategory {
  category_name: string;
  product_count: number;
  total_stock: number;
  tax_classification: 'taxable' | 'exempt' | 'zero_rated';
  estimated_monthly_sales_value: number;
}

export interface EmployeeCountResult {
  active_employee_count: number;
  total_employees: number;
  by_role: Record<string, number>;
}

export interface TaxLiabilityCalculation {
  revenue: number;
  cost_of_goods_sold: number;
  deductible_expenses: number;
  assessable_profit: number;
  vat_collected: number;
  estimated_input_tax_credit: number;
  net_vat_payable: number;
  company_rate_bracket: string;
  estimated_cit_rate: number;
  estimated_cit_liability: number;
  estimated_total_tax: number;
  calculation_date: string;
}

export interface DeductibleExpense {
  category: string;
  amount: number;
  description: string;
  cita_section: string;
}

export interface DeductibleExpensesResult {
  period: string;
  total_deductible_expenses: number;
  breakdown: DeductibleExpense[];
  non_deductible: { category: string; amount: number }[];
}

export interface FilingMonth {
  month: number;
  year: number;
  filed: boolean;
  status: 'submitted' | 'pending' | 'draft' | 'not-yet-due';
  submissionDate?: string;
  acknowledgmentNumber?: string;
}

export interface FilingStatusResult {
  year: number;
  months: FilingMonth[];
  totalFiled: number;
  totalPending: number;
  summary: string;
}

/**
 * Tool definitions that Claude sees
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'get_business_info',
    description: 'Fetch business registration info, store name, type, and estimated annual revenue for tax purposes',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_transactions_summary',
    description: 'Get transaction summary for a date range: total revenue, refunds, discounts, product count',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' }
      },
      required: ['start_date', 'end_date']
    }
  },
  {
    name: 'get_vat_collected',
    description: 'Get VAT collected in a specific month/year, broken down by taxable vs exempt items',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month number (1-12)' },
        year: { type: 'number', description: 'Year (e.g., 2024)' }
      },
      required: ['month', 'year']
    }
  },
  {
    name: 'get_inventory_categories',
    description: 'Get all product categories with current stock levels and tax classification (taxable/exempt)',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_employee_count',
    description: 'Get number of active employees by role for PAYE and payroll planning',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'calculate_tax_liability',
    description: 'Pure computation: given revenue, COGS, and expenses, compute VAT payable, estimated CIT, and PAYE band',
    input_schema: {
      type: 'object',
      properties: {
        revenue: { type: 'number', description: 'Annual revenue in Naira' },
        cost_of_goods_sold: { type: 'number', description: 'COGS in Naira' },
        deductible_expenses: { type: 'number', description: 'Total allowable deductions in Naira' }
      },
      required: ['revenue', 'cost_of_goods_sold', 'deductible_expenses']
    }
  },
  {
    name: 'get_deductible_expenses',
    description: 'Scan transactions for categories that qualify as deductible under CITA s.24 (rent, utilities, professional fees, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' }
      },
      required: ['start_date', 'end_date']
    }
  },
  {
    name: 'run_deduction_scan',
    description: 'Execute a comprehensive 12-month deduction scan identifying missed tax opportunities: VAT overcharges on exempt items, missed CITA s.24 deductions, capital allowances, and threshold warnings. Returns a full DeductionReport.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_filing_status',
    description: 'Get compliance calendar showing which monthly VAT returns and annual CIT filings have been marked as "filed". Returns 12-month grid with status (submitted/pending/draft/not-yet-due). Use to answer "What returns have I filed?" or "Show my filing progress."',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Year to check filing status (e.g., 2024 or 2025). Optional, defaults to current year.' }
      },
      required: []
    }
  }
];

/**
 * Tool implementation functions
 * These are invoked by the Firebase Cloud Function when Claude calls a tool
 */

export async function getTool(toolName: string, input: Record<string, any>): Promise<unknown> {
  switch (toolName) {
    case 'get_business_info':
      return await getBusinessInfo();
    case 'get_transactions_summary':
      return await getTransactionsSummary(input.start_date, input.end_date);
    case 'get_vat_collected':
      return await getVATCollected(input.month, input.year);
    case 'get_inventory_categories':
      return await getInventoryCategories();
    case 'get_employee_count':
      return await getEmployeeCount();
    case 'calculate_tax_liability':
      return await calculateTaxLiability(input.revenue, input.cost_of_goods_sold, input.deductible_expenses);
    case 'get_deductible_expenses':
      return await getDeductibleExpenses(input.start_date, input.end_date);
    case 'run_deduction_scan':
      return await runDeductionScan();
    case 'get_filing_status':
      return await getFilingStatus(input.year);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Import deductionOptimizer service (lazy import to avoid circular dependencies)
 */
async function runDeductionScan(): Promise<any> {
  try {
    const { runDeductionScan: executeDeductionScan } = await import('./deductionOptimizer');
    return await executeDeductionScan('system');
  } catch (error) {
    console.error('Failed to run deduction scan:', error);
    return { error: 'Deduction scan failed' };
  }
}

/**
 * TOOL 1: Get Business Info
 */
async function getBusinessInfo(): Promise<BusinessInfo> {
  try {
    const settings = await offlineDB.settings.get('global');
    
    return {
      store_name: settings?.store_name || 'Unknown Store',
      store_type: settings?.store_type || 'Retail',
      registration_status: settings?.registration_status || 'Registered',
      nin_or_tin: settings?.nin_or_tin || 'N/A',
      estimated_annual_revenue: settings?.estimated_annual_revenue || 0,
      currency: settings?.currency || 'NGN'
    };
  } catch (error) {
    console.error('Error fetching business info:', error);
    return {
      store_name: 'Unknown',
      store_type: 'Retail',
      registration_status: 'Unknown',
      nin_or_tin: 'N/A',
      estimated_annual_revenue: 0,
      currency: 'NGN'
    };
  }
}

/**
 * TOOL 2: Get Transactions Summary
 */
async function getTransactionsSummary(startDateStr: string, endDateStr: string): Promise<TransactionsSummary> {
  try {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Query transactions within range
    const transactions = await offlineDB.transactions
      .where('created_at')
      .between(startISO, endISO, true, true)
      .toArray();

    // Filter for paid transactions
    const paidTransactions = transactions.filter(t => t.payment_status === 'paid');
    const voidTransactions = transactions.filter(t => t.payment_status === 'void');

    // Calculate totals
    const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalRefunds = voidTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalDiscounts = paidTransactions.reduce((sum, t) => sum + (t.subtotal - t.total + t.tax), 0);

    // Count unique products
    const productSet = new Set<string | number>();
    paidTransactions.forEach(t => {
      t.items.forEach(item => productSet.add(item.productId));
    });

    return {
      period: `${startDateStr} to ${endDateStr}`,
      total_revenue: totalRevenue,
      total_refunds: totalRefunds,
      total_discounts: totalDiscounts,
      net_revenue: totalRevenue - totalRefunds,
      total_transactions: paidTransactions.length,
      transaction_count: paidTransactions.length,
      product_variety_count: productSet.size
    };
  } catch (error) {
    console.error('Error fetching transactions summary:', error);
    return {
      period: `${startDateStr} to ${endDateStr}`,
      total_revenue: 0,
      total_refunds: 0,
      total_discounts: 0,
      net_revenue: 0,
      total_transactions: 0,
      transaction_count: 0,
      product_variety_count: 0
    };
  }
}

/**
 * TOOL 3: Get VAT Collected
 */
async function getVATCollected(month: number, year: number): Promise<VATCollected> {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const transactions = await offlineDB.transactions
      .where('created_at')
      .between(startISO, endISO, true, true)
      .toArray();

    const paidTransactions = transactions.filter(t => t.payment_status === 'paid');

    // Get all products to determine tax classification
    const products = await offlineDB.products.toArray();
    const productMap = new Map(products.map(p => [p.id, p]));

    // Separate taxable and exempt items
    let taxableRevenue = 0;
    let exemptRevenue = 0;

    paidTransactions.forEach(transaction => {
      transaction.items.forEach(item => {
        const product = productMap.get(item.productId);
        const isExempt = product?.category?.toLowerCase().includes('food') || 
                        product?.category?.toLowerCase().includes('medical') ||
                        product?.category?.toLowerCase().includes('education');
        
        if (isExempt) {
          exemptRevenue += item.price * item.quantity;
        } else {
          taxableRevenue += item.price * item.quantity;
        }
      });
    });

    const vatOnTaxable = taxableRevenue * 0.075;
    const totalRevenue = taxableRevenue + exemptRevenue;

    return {
      month,
      year,
      taxable_items_revenue: taxableRevenue,
      vat_on_taxable: vatOnTaxable,
      exempt_items_revenue: exemptRevenue,
      total_revenue: totalRevenue,
      vat_rate: 0.075
    };
  } catch (error) {
    console.error('Error fetching VAT collected:', error);
    return {
      month,
      year,
      taxable_items_revenue: 0,
      vat_on_taxable: 0,
      exempt_items_revenue: 0,
      total_revenue: 0,
      vat_rate: 0.075
    };
  }
}

/**
 * TOOL 4: Get Inventory Categories
 */
async function getInventoryCategories(): Promise<InventoryCategory[]> {
  try {
    const products = await offlineDB.products.toArray();
    
    const categoryMap = new Map<string, { products: Product[]; totalStock: number }>();

    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { products: [], totalStock: 0 });
      }
      const entry = categoryMap.get(category)!;
      entry.products.push(product);
      entry.totalStock += product.stock_quantity;
    });

    const results: InventoryCategory[] = [];

    categoryMap.forEach((entry, categoryName) => {
      // Determine tax classification
      const lowerName = categoryName.toLowerCase();
      const isExempt = lowerName.includes('food') || 
                      lowerName.includes('medical') || 
                      lowerName.includes('education') ||
                      lowerName.includes('agricultural');
      
      const taxClassification: 'taxable' | 'exempt' | 'zero_rated' = isExempt ? 'exempt' : 'taxable';

      // Estimate monthly sales (based on stock turnover - rough estimate)
      const estimatedSalesValue = entry.products.reduce((sum, p) => sum + (p.price * 10), 0);

      results.push({
        category_name: categoryName,
        product_count: entry.products.length,
        total_stock: entry.totalStock,
        tax_classification: taxClassification,
        estimated_monthly_sales_value: estimatedSalesValue
      });
    });

    return results;
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    return [];
  }
}

/**
 * TOOL 5: Get Employee Count
 */
async function getEmployeeCount(): Promise<EmployeeCountResult> {
  try {
    const employees = await offlineDB.employees.toArray();
    
    const activeEmployees = employees.filter(e => e.active === true);
    const byRole: Record<string, number> = {};

    activeEmployees.forEach(emp => {
      byRole[emp.role] = (byRole[emp.role] || 0) + 1;
    });

    return {
      active_employee_count: activeEmployees.length,
      total_employees: employees.length,
      by_role: byRole
    };
  } catch (error) {
    console.error('Error fetching employee count:', error);
    return {
      active_employee_count: 0,
      total_employees: 0,
      by_role: {}
    };
  }
}

/**
 * TOOL 6: Calculate Tax Liability
 * Pure computation - no database calls
 */
async function calculateTaxLiability(
  revenue: number,
  costOfGoodsSold: number,
  deductibleExpenses: number
): Promise<TaxLiabilityCalculation> {
  try {
    // Determine company size bracket and CIT rate
    let citRate = 0.30; // Large company
    let rateBracket = 'Large (>₦100M)';

    if (revenue <= 25_000_000) {
      citRate = 0;
      rateBracket = 'Small (₦0–₦25M) - EXEMPTED';
    } else if (revenue <= 100_000_000) {
      citRate = 0.20;
      rateBracket = 'Medium (₦25M–₦100M)';
    }

    // Calculate assessable profit
    const assessableProfit = Math.max(0, revenue - costOfGoodsSold - deductibleExpenses);
    
    // VAT calculation (7.5% on taxable supplies, assuming 70% of revenue is taxable)
    const taxableSupplies = revenue * 0.70;
    const vatCollected = taxableSupplies * 0.075;
    
    // Input tax credit (roughly 25% of VAT collected as allowable credit)
    const estimatedInputTaxCredit = vatCollected * 0.25;
    const netVATPayable = vatCollected - estimatedInputTaxCredit;

    // CIT Liability
    const citLiability = assessableProfit * citRate;

    // Total estimated tax
    const totalTax = netVATPayable + citLiability;

    return {
      revenue,
      cost_of_goods_sold: costOfGoodsSold,
      deductible_expenses: deductibleExpenses,
      assessable_profit: assessableProfit,
      vat_collected: vatCollected,
      estimated_input_tax_credit: estimatedInputTaxCredit,
      net_vat_payable: netVATPayable,
      company_rate_bracket: rateBracket,
      estimated_cit_rate: citRate * 100,
      estimated_cit_liability: citLiability,
      estimated_total_tax: totalTax,
      calculation_date: new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error calculating tax liability:', error);
    return {
      revenue,
      cost_of_goods_sold: costOfGoodsSold,
      deductible_expenses: deductibleExpenses,
      assessable_profit: 0,
      vat_collected: 0,
      estimated_input_tax_credit: 0,
      net_vat_payable: 0,
      company_rate_bracket: 'Unknown',
      estimated_cit_rate: 0,
      estimated_cit_liability: 0,
      estimated_total_tax: 0,
      calculation_date: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * TOOL 7: Get Deductible Expenses
 * Scans transactions for expense categories qualifying under CITA s.24
 */
async function getDeductibleExpenses(startDateStr: string, endDateStr: string): Promise<DeductibleExpensesResult> {
  try {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    // Mock deductible expense categories
    // In a real system, these would be derived from transaction descriptions/memo fields
    const deductibleBreakdown: DeductibleExpense[] = [
      {
        category: 'Employee Salaries & Wages',
        amount: 8_000_000,
        description: 'Monthly payroll for staff',
        cita_section: 's.24(1)(a)'
      },
      {
        category: 'Business Rent',
        amount: 5_000_000,
        description: 'Store lease premium',
        cita_section: 's.24(1)(b)'
      },
      {
        category: 'Repairs & Maintenance',
        amount: 600_000,
        description: 'Equipment repairs and upkeep',
        cita_section: 's.24(1)(c)'
      },
      {
        category: 'Utilities (Electricity, Water)',
        amount: 800_000,
        description: 'Business operations',
        cita_section: 's.24(1)(d)'
      },
      {
        category: 'Professional Fees',
        amount: 300_000,
        description: 'Accountant, legal consultant',
        cita_section: 's.24(1)(f)'
      },
      {
        category: 'Insurance Premiums',
        amount: 250_000,
        description: 'Business liability insurance',
        cita_section: 's.24(1)(e)'
      },
      {
        category: 'Depreciation (Capital Allowances)',
        amount: 1_200_000,
        description: 'Plant & machinery @ 15% initial, 10% annual',
        cita_section: 's.32 CITA (Capital Allowances)'
      }
    ];

    const totalDeductible = deductibleBreakdown.reduce((sum, item) => sum + item.amount, 0);

    const nonDeductible = [
      { category: 'Director Drawings', amount: 2_000_000 },
      { category: 'Fines & Penalties', amount: 50_000 },
      { category: 'Personal Expenses', amount: 100_000 }
    ];

    return {
      period: `${startDateStr} to ${endDateStr}`,
      total_deductible_expenses: totalDeductible,
      breakdown: deductibleBreakdown,
      non_deductible: nonDeductible
    };
  } catch (error) {
    console.error('Error fetching deductible expenses:', error);
    return {
      period: `${startDateStr} to ${endDateStr}`,
      total_deductible_expenses: 0,
      breakdown: [],
      non_deductible: []
    };
  }
}

/**
 * TOOL 9: Get Filing Status
 * Retrieves compliance calendar from localStorage showing which monthly VAT returns and CIT filings have been marked as filed
 */
async function getFilingStatus(yearParam?: number): Promise<FilingStatusResult> {
  try {
    const year = yearParam || new Date().getFullYear();
    const months: FilingMonth[] = [];
    
    // Retrieve filing status from localStorage
    const savedStatus = localStorage.getItem('firsFilingStepsCompleted');
    const completedSteps = savedStatus ? JSON.parse(savedStatus) : {};

    // Build 12-month grid
    for (let month = 1; month <= 12; month++) {
      const stepId = `VAT-step-5`; // VAT filing step 5 = submitted
      const isFiled = completedSteps[`${month}-vat-filed`] === true;
      
      const filingMonth: FilingMonth = {
        month,
        year,
        filed: isFiled,
        status: isFiled ? 'submitted' : 'pending',
        submissionDate: completedSteps[`${month}-vat-date`] || undefined,
        acknowledgmentNumber: completedSteps[`${month}-vat-ack`] || undefined
      };

      months.push(filingMonth);
    }

    const totalFiled = months.filter(m => m.filed).length;
    const totalPending = months.filter(m => !m.filed).length;

    return {
      year,
      months,
      totalFiled,
      totalPending,
      summary: `Filing Status for ${year}: ${totalFiled} months filed, ${totalPending} months pending. Deadline for unfiled months is the 21st of the following month.`
    };
  } catch (error) {
    console.error('Error fetching filing status:', error);
    const year = new Date().getFullYear();
    return {
      year,
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year,
        filed: false,
        status: 'pending'
      })),
      totalFiled: 0,
      totalPending: 12,
      summary: 'Unable to retrieve filing status. All months shown as pending.'
    };
  }
}
