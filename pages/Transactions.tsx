import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download } from 'lucide-react';
import { Transaction } from '../types';
import { transactionService } from '../services/transactions/transactionService';
import { TransactionDetailModal } from '../components/transactions/TransactionDetailModal';
import { Button } from '../components/common/Button';

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected for Modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await transactionService.getTransactions({
        searchTerm,
        status: statusFilter,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });
      setTransactions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm, statusFilter, startDate, endDate]);

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Employee', 'Total', 'Status', 'Payment Method'];
    const rows = transactions.map(t => [
      t.transaction_number,
      new Date(t.created_at).toLocaleString(),
      t.employee_name || t.employee_id,
      t.total.toFixed(2),
      t.payment_status,
      t.payment_method
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col h-screen">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-500">View and manage past sales.</p>
        </div>
        <Button variant="secondary" onClick={exportCSV} className="gap-2">
           <Download size={18} /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input
               type="text"
               placeholder="Order # or Reference"
               className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
        </div>

        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
           <select 
             className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={statusFilter}
             onChange={e => setStatusFilter(e.target.value)}
           >
             <option value="all">All Status</option>
             <option value="paid">Paid</option>
             <option value="void">Voided</option>
             <option value="pending">Pending</option>
           </select>
        </div>

        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
           <input 
             type="date"
             className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={startDate}
             onChange={e => setStartDate(e.target.value)}
           />
        </div>

        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
           <input 
             type="date"
             className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={endDate}
             onChange={e => setEndDate(e.target.value)}
           />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-600">Transaction ID</th>
                <th className="px-6 py-4 font-medium text-gray-600">Date</th>
                <th className="px-6 py-4 font-medium text-gray-600">Employee</th>
                <th className="px-6 py-4 font-medium text-gray-600">Method</th>
                <th className="px-6 py-4 font-medium text-gray-600">Total</th>
                <th className="px-6 py-4 font-medium text-gray-600">Status</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                 <tr><td colSpan={7} className="text-center py-10">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                 <tr><td colSpan={7} className="text-center py-10 text-gray-500">No transactions found.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-gray-600">{tx.transaction_number}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(tx.created_at).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{tx.employee_name || 'N/A'}</td>
                    <td className="px-6 py-4 capitalize">{tx.payment_method}</td>
                    <td className="px-6 py-4 font-medium">${tx.total.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        tx.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        tx.payment_status === 'void' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {tx.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => setSelectedTx(tx)}
                         className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg transition-colors"
                       >
                         <Eye size={18} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <TransactionDetailModal 
        transaction={selectedTx} 
        onClose={() => setSelectedTx(null)} 
        onVoidSuccess={() => {
          fetchTransactions();
          // Keep modal open or close? Usually close or refresh data
          // To refresh data inside modal, we'd need to fetch single tx again
          // For now, close it
          setSelectedTx(null);
        }}
      />
    </div>
  );
};