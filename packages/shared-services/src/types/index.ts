export type Role = 'cashier' | 'manager' | 'admin';

export interface Employee {
  id?: string;
  name: string;
  pin_hash: string;
  role: Role;
  access_level?: number;
  created_at?: string; // Firestore Timestamp
  active: boolean;
  // Security fields
  failed_attempts?: number;
  is_locked?: boolean;
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
}

export interface AuthState {
  user: User | null;
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
