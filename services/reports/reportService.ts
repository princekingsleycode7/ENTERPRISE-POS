import { offlineDB } from '../offline/db';
import { Transaction, Product } from '../../types';

export interface SalesSummaryData {
  totalRevenue: number;
  netRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  totalTax: number;
  voidCount: number;
  voidAmount: number;
  paymentMethods: { name: string; value: number }[];
  salesByHour: { hour: string; amount: number; count: number }[];
  salesByDay: { date: string; amount: number }[];
}

export interface ProductPerformanceData {
  id: string | number;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  currentStock: number;
}

export interface EmployeePerformanceData {
  id: string;
  name: string;
  transactionCount: number;
  totalSales: number;
  averageSale: number;
  voidCount: number;
}

export const reportService = {
  
  /**
   * Fetch transactions within a date range
   */
  async getTransactions(startDate: Date, endDate: Date) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn("Invalid date range passed to getTransactions");
        return [];
      }

      // Ensure end date covers the full day
      end.setHours(23, 59, 59, 999);
      start.setHours(0, 0, 0, 0);

      return await offlineDB.transactions
        .where('created_at')
        .between(start.toISOString(), end.toISOString(), true, true)
        .toArray();
    } catch (e) {
      console.error("Error fetching transactions for report:", e);
      return [];
    }
  },

  /**
   * Generate Sales Summary Report
   */
  async getSalesSummary(startDate: Date, endDate: Date): Promise<SalesSummaryData> {
    const transactions = await this.getTransactions(startDate, endDate);
    const paidTx = transactions.filter(t => t.payment_status === 'paid');
    const voidTx = transactions.filter(t => t.payment_status === 'void');

    const totalRevenue = paidTx.reduce((sum, t) => sum + t.total, 0);
    const totalTax = paidTx.reduce((sum, t) => sum + t.tax, 0);
    const netRevenue = totalRevenue - totalTax;
    
    const voidAmount = voidTx.reduce((sum, t) => sum + t.total, 0);

    // Payment Methods Breakdown
    const methodMap = new Map<string, number>();
    paidTx.forEach(t => {
      const current = methodMap.get(t.payment_method) || 0;
      methodMap.set(t.payment_method, current + t.total);
    });
    const paymentMethods = Array.from(methodMap.entries()).map(([name, value]) => ({ 
      name: name.replace('_', ' ').toUpperCase(), 
      value 
    }));

    // Sales Trends (Hourly if single day, Daily otherwise)
    const isSingleDay = startDate.toDateString() === endDate.toDateString();
    
    const salesMap = new Map<string, { amount: number; count: number }>();
    
    paidTx.forEach(t => {
      const date = new Date(t.created_at);
      const key = isSingleDay 
        ? date.getHours().toString().padStart(2, '0') + ':00'
        : date.toLocaleDateString();
        
      const current = salesMap.get(key) || { amount: 0, count: 0 };
      salesMap.set(key, { 
        amount: current.amount + t.total, 
        count: current.count + 1 
      });
    });

    // Sort keys
    const sortedKeys = Array.from(salesMap.keys()).sort((a, b) => {
       if (isSingleDay) return parseInt(a) - parseInt(b);
       return new Date(a).getTime() - new Date(b).getTime();
    });

    const trendData = sortedKeys.map(key => ({
      [isSingleDay ? 'hour' : 'date']: key,
      ...salesMap.get(key)!
    }));

    return {
      totalRevenue,
      netRevenue,
      totalTransactions: paidTx.length,
      averageOrderValue: paidTx.length > 0 ? totalRevenue / paidTx.length : 0,
      totalTax,
      voidCount: voidTx.length,
      voidAmount,
      paymentMethods,
      salesByHour: isSingleDay ? trendData as any : [],
      salesByDay: !isSingleDay ? trendData as any : []
    };
  },

  /**
   * Generate Product Performance Report
   */
  async getProductPerformance(startDate: Date, endDate: Date): Promise<ProductPerformanceData[]> {
    const transactions = await this.getTransactions(startDate, endDate);
    const paidTx = transactions.filter(t => t.payment_status === 'paid');
    
    // Get current products for stock info
    const products = await offlineDB.products.toArray();
    const productMap = new Map<string | number, Product>();
    products.forEach(p => productMap.set(p.id!, p));

    const statsMap = new Map<string | number, ProductPerformanceData>();

    paidTx.forEach(tx => {
      tx.items.forEach(item => {
        const existing = statsMap.get(item.productId) || {
          id: item.productId,
          name: item.name,
          category: productMap.get(item.productId)?.category || 'Unknown',
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          currentStock: productMap.get(item.productId)?.stock_quantity || 0
        };

        const itemRevenue = item.price * item.quantity;
        const itemCost = item.cost * item.quantity;

        existing.quantitySold += item.quantity;
        existing.revenue += itemRevenue;
        existing.cost += itemCost;
        existing.profit += (itemRevenue - itemCost);
        
        statsMap.set(item.productId, existing);
      });
    });

    const results = Array.from(statsMap.values()).map(p => ({
      ...p,
      margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0
    }));

    return results.sort((a, b) => b.revenue - a.revenue);
  },

  /**
   * Generate Employee Performance Report
   */
  async getEmployeePerformance(startDate: Date, endDate: Date): Promise<EmployeePerformanceData[]> {
    const transactions = await this.getTransactions(startDate, endDate);
    
    const empMap = new Map<string, EmployeePerformanceData>();

    transactions.forEach(tx => {
      const empId = tx.employee_id;
      const empName = tx.employee_name || 'Unknown';
      
      const existing = empMap.get(empId) || {
        id: empId,
        name: empName,
        transactionCount: 0,
        totalSales: 0,
        averageSale: 0,
        voidCount: 0
      };

      if (tx.payment_status === 'paid') {
        existing.transactionCount += 1;
        existing.totalSales += tx.total;
      } else if (tx.payment_status === 'void') {
        existing.voidCount += 1;
      }

      empMap.set(empId, existing);
    });

    return Array.from(empMap.values()).map(e => ({
      ...e,
      averageSale: e.transactionCount > 0 ? e.totalSales / e.transactionCount : 0
    })).sort((a, b) => b.totalSales - a.totalSales);
  }
};