export type Role = 'cashier' | 'manager' | 'admin';

export interface Employee {
  id?: string;
  name: string;
  pin_hash: string;
  role: Role;
  access_level?: number;
  created_at?: string; // Firestore Timestamp
  active: boolean;
  merchant_id?: string; // Reference to parent merchant/business
  // Security fields
  failed_attempts?: number;
  is_locked?: boolean;
}

// Merchant Account Model
export interface Merchant {
  id?: string; // Document ID is the merchantId
  businessName: string;
  ownerEmail: string;
  phone: string;
  createdAt?: any; // Firestore Timestamp
  isActive: boolean;
  activatedAt?: any; // Firestore Timestamp | null
  activatedBy?: string | null; // platform admin UID
  planType: 'standard'; // Reserved for future plan tiers
  platformFeeRate: number; // e.g., 0.01 for 1%
}

export interface Product {
  id?: number | string; // Number for Dexie, String for Firestore
  firebaseId?: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  category: string;
  stock_quantity: number;
  reorder_level: number;
  imageUrl?: string;
  barcode?: string;
  created_at?: string;
  updated_at?: any;
  tax_class?: 'Taxable' | 'VAT Exempt'; // New field for tax classification
}

export interface TransactionItem {
  productId: string | number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  cost: number;
}

export interface Transaction {
  id?: string | number;
  transaction_number: string;
  employee_id: string;
  employee_name?: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'moniepoint';
  payment_status: 'paid' | 'pending' | 'void' | 'failed';
  payment_reference?: string; // Korapay reference
  amount_tendered?: number; // For cash
  change_amount?: number; // For cash
  
  // Void details
  void_reason?: string;
  void_by?: string; // Employee ID
  void_at?: string;

  created_at: any; // ISO String
  synced: boolean;
  customer_email?: string;

  // Platform Fee Fields (Phase 2)
  merchant_id?: string; // Which merchant this transaction belongs to
  platform_fee?: number; // 1% of total, e.g. 150.00
  platform_fee_rate?: number; // Snapshot of the rate at time of sale, e.g. 0.01
  platform_fee_status?: 'pending' | 'invoiced' | 'paid'; // Fee status for tracking
}

export interface DailyCashRegister {
  id?: string | number;
  employee_id: string;
  employee_name: string;
  opening_amount: number;
  closing_amount?: number;
  expected_cash?: number;
  actual_cash?: number;
  discrepancy?: number;
  start_time: string;
  end_time?: string;
  status: 'open' | 'closed';
  notes?: string;
}

export interface AuditLog {
  id?: string | number; // Number for Dexie
  employee_id: string;
  employee_name?: string; // Snapshot of name at time of action
  action: string;
  resource: string;
  timestamp: any;
  details: any;
  ip_address?: string;
}

export interface Settings {
  id?: string; // Always 'global'
  
  // Store Info
  store_name: string;
  address: string;
  phone: string;
  currency: string;
  
  // Tax
  tax_rate: number;
  tax_enabled: boolean;
  tax_label: string;

  // Receipt
  receipt_header: string;
  receipt_footer: string;
  show_tax_breakdown: boolean;
  paper_width: '58mm' | '80mm';

  // System
  low_stock_threshold: number;
  auto_sync_interval: number; // minutes
  session_timeout: number; // minutes
  // Moniepoint Terminal Serial (optional)
  moniepoint_terminal_serial?: string;

  // Tax Advisor Fields (optional)
  store_type?: string; // e.g., 'Retail', 'Wholesale', 'Services'
  registration_status?: string; // e.g., 'Registered', 'Unregistered'
  nin_or_tin?: string; // National ID or Tax ID number
  estimated_annual_revenue?: number; // In Naira
}

export interface CartItem extends Product {
  quantity: number;
}

export type Sale = Transaction;

// User interface for Auth Store (mapped from Employee)
export interface User {
  id: string;
  name: string;
  role: Role;
  merchantId?: string; // Merchant/business association
}

export interface AuthState {
  user: User | null;
  merchantId: string | null;
  isAuthenticated: boolean;
  lastActivity: number;
  login: (pin: string) => Promise<boolean | string>; // Return string for specific error messages
  logout: () => void;
  updateActivity: () => void;
  hasPermission: (permission: Permission) => boolean;
}

export interface HoldTransaction {
  id: string;
  items: CartItem[];
  timestamp: number;
  note?: string;
}

export interface CartState {
  items: CartItem[];
  heldTransactions: HoldTransaction[];
  taxRate: number;
  setTaxRate: (rate: number) => void;
  addToCart: (product: Product) => boolean;
  removeFromCart: (productId: number | string) => void;
  updateQuantity: (productId: number | string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getTax: () => number; // Per-item tax calculation (considers tax_class field)
  holdTransaction: (note?: string) => void;
  retrieveTransaction: (id: string) => void;
  discardHeldTransaction: (id: string) => void;
}

export type Permission = 
  | 'view_reports' 
  | 'manage_inventory' 
  | 'void_transaction' 
  | 'manage_settings' 
  | 'manage_employees'
  | 'process_sale'
  | 'view_audit_logs';

// Tax Agent Types
export interface TaxMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TaxTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface TaxSnapshot {
  currentMonthVAT: number;
  yearToDateCIT: number;
  nextFIRSDeadline: {
    type: 'VAT' | 'CIT' | 'PAYE';
    date: string;
    daysUntil: number;
  };
}

// Deduction Optimizer Types
export interface VATOvercharge {
  itemName: string;
  quantity: number;
  vatChargedNaira: number;
  category: string;
  shouldBeExempt: boolean;
}

export interface MissedDeduction {
  category: string;
  amount: number;
  itemCount: number;
  lawCitation: string; // e.g., "CITA s.24(3)(a)"
  description: string;
}

export interface CapitalAllowance {
  description: string;
  purchaseDate: string;
  costNaira: number;
  initialAllowance: number; // 50% of cost
  yearlyAllowance: number; // 25% of cost annually
  category: string; // e.g., "Plant & Machinery"
  lawCitation: string;
}

export interface ThresholdWarning {
  isCritical: boolean;
  currentAnnualRevenue: number;
  thresholdRevenue: number;
  remainingBuffer: number;
  message: string;
  cipRate: number; // The CIT rate when threshold is crossed
}

export interface PriorityAction {
  rank: number; // 1-5
  title: string;
  estimatedSavingNaira: number;
  effortLevel: 'Low' | 'Medium' | 'High';
  description: string;
  lawReference: string;
  actionableQuestion: string; // Pre-fill for chat
}

export interface DeductionReport {
  scanDate: string;
  totalPotentialSavings: number;
  vatOvercharges: VATOvercharge[];
  missedDeductions: MissedDeduction[];
  capitalAllowances: CapitalAllowance[];
  thresholdWarning: ThresholdWarning | null;
  priorityActions: PriorityAction[];
  lastScannedTimestamp?: number;
}

// Platform Invoice (Phase 3)
export interface PlatformInvoice {
  id?: string; // Document ID
  merchantId: string;
  businessName: string;
  periodStart: any; // Firestore Timestamp - first day of invoiced month
  periodEnd: any; // Firestore Timestamp - last day of invoiced month
  transactionCount: number; // Number of sales in period
  totalSalesValue: number; // Sum of all transaction totals
  totalPlatformFee: number; // Sum of all platform_fee values
  status: 'unpaid' | 'paid';
  createdAt?: any; // Firestore Timestamp
  paidAt?: any; // Firestore Timestamp | null
}