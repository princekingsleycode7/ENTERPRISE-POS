/**
 * functions/src/taxTools.ts
 * 
 * Tool exports for Firebase Cloud Function
 * Includes tool definitions and implementation
 */

// Tool definitions for Claude to see
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
  }
];

/**
 * Tool implementation function - routes to specific tool handlers
 * In real Firebase environment, this connects to Firestore/database services
 * For now, returns mock data structured consistently
 */
export async function getTool(toolName: string, input: Record<string, any>): Promise<unknown> {
  switch (toolName) {
    case 'get_business_info':
      return getBusinessInfo();
    case 'get_transactions_summary':
      return getTransactionsSummary(input.start_date, input.end_date);
    case 'get_vat_collected':
      return getVATCollected(input.month, input.year);
    case 'get_inventory_categories':
      return getInventoryCategories();
    case 'get_employee_count':
      return getEmployeeCount();
    case 'calculate_tax_liability':
      return calculateTaxLiability(input.revenue, input.cost_of_goods_sold, input.deductible_expenses);
    case 'get_deductible_expenses':
      return getDeductibleExpenses(input.start_date, input.end_date);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function getBusinessInfo(): Promise<Record<string, any>> {
  return {
    store_name: 'Enterprise POS Store',
    store_type: 'Retail',
    registration_status: 'Registered',
    nin_or_tin: '12345678901',
    estimated_annual_revenue: 50000000,
    currency: 'NGN'
  };
}

async function getTransactionsSummary(startDateStr: string, endDateStr: string): Promise<Record<string, any>> {
  return {
    period: `${startDateStr} to ${endDateStr}`,
    total_revenue: 4000000,
    total_refunds: 50000,
    total_discounts: 75000,
    net_revenue: 3875000,
    total_transactions: 250,
    transaction_count: 250,
    product_variety_count: 45
  };
}

async function getVATCollected(month: number, year: number): Promise<Record<string, any>> {
  return {
    month,
    year,
    taxable_items_revenue: 3200000,
    vat_on_taxable: 240000,
    exempt_items_revenue: 800000,
    total_revenue: 4000000,
    vat_rate: 0.075
  };
}

async function getInventoryCategories(): Promise<Record<string, any>[]> {
  return [
    {
      category_name: 'Basic Food',
      product_count: 12,
      total_stock: 150,
      tax_classification: 'exempt',
      estimated_monthly_sales_value: 600000
    },
    {
      category_name: 'FMCG',
      product_count: 25,
      total_stock: 200,
      tax_classification: 'taxable',
      estimated_monthly_sales_value: 1500000
    },
    {
      category_name: 'Supplies',
      product_count: 15,
      total_stock: 100,
      tax_classification: 'taxable',
      estimated_monthly_sales_value: 800000
    }
  ];
}

async function getEmployeeCount(): Promise<Record<string, any>> {
  return {
    active_employee_count: 8,
    total_employees: 10,
    by_role: {
      cashier: 5,
      manager: 2,
      admin: 1
    }
  };
}

async function calculateTaxLiability(
  revenue: number,
  costOfGoodsSold: number,
  deductibleExpenses: number
): Promise<Record<string, any>> {
  let citRate = 0.30;
  let rateBracket = 'Large (>₦100M)';

  if (revenue <= 25000000) {
    citRate = 0;
    rateBracket = 'Small (₦0–₦25M) - EXEMPTED';
  } else if (revenue <= 100000000) {
    citRate = 0.20;
    rateBracket = 'Medium (₦25M–₦100M)';
  }

  const assessableProfit = Math.max(0, revenue - costOfGoodsSold - deductibleExpenses);
  const taxableSupplies = revenue * 0.70;
  const vatCollected = taxableSupplies * 0.075;
  const estimatedInputTaxCredit = vatCollected * 0.25;
  const netVATPayable = vatCollected - estimatedInputTaxCredit;
  const citLiability = assessableProfit * citRate;
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
}

async function getDeductibleExpenses(startDateStr: string, endDateStr: string): Promise<Record<string, any>> {
  return {
    period: `${startDateStr} to ${endDateStr}`,
    total_deductible_expenses: 15550000,
    breakdown: [
      {
        category: 'Employee Salaries & Wages',
        amount: 8000000,
        description: 'Monthly payroll for staff',
        cita_section: 's.24(1)(a)'
      },
      {
        category: 'Business Rent',
        amount: 5000000,
        description: 'Store lease premium',
        cita_section: 's.24(1)(b)'
      },
      {
        category: 'Repairs & Maintenance',
        amount: 600000,
        description: 'Equipment repairs and upkeep',
        cita_section: 's.24(1)(c)'
      },
      {
        category: 'Utilities',
        amount: 800000,
        description: 'Business operations',
        cita_section: 's.24(1)(d)'
      },
      {
        category: 'Professional Fees',
        amount: 300000,
        description: 'Accountant, legal consultant',
        cita_section: 's.24(1)(f)'
      },
      {
        category: 'Insurance Premiums',
        amount: 250000,
        description: 'Business liability insurance',
        cita_section: 's.24(1)(e)'
      },
      {
        category: 'Depreciation (Capital Allowances)',
        amount: 600000,
        description: 'Plant & machinery depreciation',
        cita_section: 's.32 CITA'
      }
    ],
    non_deductible: [
      { category: 'Director Drawings', amount: 2000000 },
      { category: 'Fines & Penalties', amount: 50000 },
      { category: 'Personal Expenses', amount: 100000 }
    ]
  };
}
