import React, { useState } from 'react';
import { X, Printer, Ban, AlertTriangle } from 'lucide-react';
import { Transaction } from '../../types';
import { Button } from '../common/Button';
import { printerService } from '../../services/printer/printerService';
import { ReauthModal } from '../auth/ReauthModal';
import { useAuthStore } from '../../stores/useAuthStore';
import { transactionService } from '../../services/transactions/transactionService';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onVoidSuccess: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ 
  transaction, 
  onClose,
  onVoidSuccess
}) => {
  const { user, hasPermission } = useAuthStore();
  const [showVoidAuth, setShowVoidAuth] = useState(false);
  const [voidReason, setVoidReason] = useState('Customer Return');
  const [isVoiding, setIsVoiding] = useState(false);

  if (!transaction) return null;

  const handlePrint = async () => {
    try {
      const settings = { 
        store_name: 'Modern Coffee Shop', 
        tax_rate: 0, 
        receipt_header: '', 
        receipt_footer: 'Reprint', 
        currency: 'USD' 
      };
      await printerService.printReceipt(transaction, settings as any, { name: transaction.employee_id } as any);
    } catch (e) {
      alert('Printer not connected');
    }
  };

  const handleVoidClick = () => {
    if (transaction.payment_status === 'void') return;
    setShowVoidAuth(true);
  };

  const executeVoid = async () => {
    if (!user) return;
    setIsVoiding(true);
    try {
      await transactionService.voidTransaction(transaction.id!, voidReason, user);
      onVoidSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to void transaction');
    } finally {
      setIsVoiding(false);
      setShowVoidAuth(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
             <h3 className="font-bold text-gray-900 text-lg">Transaction Details</h3>
             <p className="text-sm text-gray-500">{transaction.transaction_number}</p>
          </div>
          <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* Status Banner */}
          {transaction.payment_status === 'void' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-3 text-red-700">
              <Ban size={20} />
              <div>
                <p className="font-bold">VOIDED</p>
                <p className="text-xs">Reason: {transaction.void_reason} | By: {transaction.void_by}</p>
              </div>
            </div>
          )}

          {/* Meta Data */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{new Date(transaction.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Cashier</p>
              <p className="font-medium">{transaction.employee_name || transaction.employee_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Payment Method</p>
              <p className="font-medium capitalize">{transaction.payment_method.replace('_', ' ')}</p>
            </div>
            {transaction.payment_reference && (
              <div>
                <p className="text-gray-500">Reference</p>
                <p className="font-mono text-xs bg-gray-100 p-1 rounded inline-block">{transaction.payment_reference}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-sm mb-6">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3 text-center">Qty</th>
                <th className="py-2 px-3 text-right">Price</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transaction.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">{item.name}</td>
                  <td className="py-2 px-3 text-center">{item.quantity}</td>
                  <td className="py-2 px-3 text-right">${item.price.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-200 font-medium">
               <tr>
                 <td colSpan={3} className="py-2 px-3 text-right">Subtotal</td>
                 <td className="py-2 px-3 text-right">${transaction.subtotal.toFixed(2)}</td>
               </tr>
               <tr>
                 <td colSpan={3} className="py-2 px-3 text-right">Tax</td>
                 <td className="py-2 px-3 text-right">${transaction.tax.toFixed(2)}</td>
               </tr>
               <tr className="text-lg font-bold">
                 <td colSpan={3} className="py-2 px-3 text-right">Total</td>
                 <td className="py-2 px-3 text-right">${transaction.total.toFixed(2)}</td>
               </tr>
            </tfoot>
          </table>

          {/* Void Options (Only visible if trying to void) */}
          {showVoidAuth && (
            <div className="bg-orange-50 p-4 rounded-lg mb-4 border border-orange-200">
               <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                 <AlertTriangle size={16} /> Confirm Void
               </h4>
               <label className="block text-sm text-orange-900 mb-1">Reason for voiding:</label>
               <select 
                 className="w-full border border-orange-300 rounded p-2 mb-3"
                 value={voidReason}
                 onChange={(e) => setVoidReason(e.target.value)}
               >
                 <option>Customer Return</option>
                 <option>Accidental Charge</option>
                 <option>System Error</option>
                 <option>Manager Discretion</option>
               </select>
               <p className="text-xs text-orange-700 mb-3">
                 Note: Inventory will <strong>not</strong> be automatically restored. Please adjust stock manually if items were returned to shelf.
               </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 flex justify-between bg-gray-50 rounded-b-xl">
           <Button variant="secondary" onClick={handlePrint} className="gap-2">
             <Printer size={18} /> Reprint Receipt
           </Button>

           {transaction.payment_status !== 'void' && hasPermission('void_transaction') && (
             <Button 
                variant="danger" 
                onClick={handleVoidClick} 
                disabled={showVoidAuth} // Disable main button if auth flow active
                className="gap-2"
             >
               <Ban size={18} /> Void Transaction
             </Button>
           )}
        </div>
      </div>
      
      {/* Reauth Modal for Void */}
      <ReauthModal 
        isOpen={showVoidAuth}
        onClose={() => setShowVoidAuth(false)}
        onSuccess={executeVoid}
        actionName="void this transaction"
      />
    </div>
  );
};