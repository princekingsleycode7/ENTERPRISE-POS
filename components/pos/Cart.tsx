import React, { useState } from 'react';
import { useCartStore } from '../../stores/useCartStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { Minus, Plus, Trash2, Search, PauseCircle, PlayCircle, XCircle, ShoppingBag, Printer } from 'lucide-react';
import { ReauthModal } from '../auth/ReauthModal';
import { PaymentModal } from './PaymentModal';
import { Transaction } from '../../types';
import { transactionService } from '../../services/transactions/transactionService';
import { Button } from '../common/Button';
import { printerService } from '../../services/printer/printerService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface CartProps {
  onCheckoutSuccess?: () => void;
}

export const Cart: React.FC<CartProps> = ({ onCheckoutSuccess }) => {
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    getTotal, 
    clearCart, 
    holdTransaction, 
    heldTransactions, 
    retrieveTransaction, 
    discardHeldTransaction,
    taxRate 
  } = useCartStore();
  
  const { user, hasPermission } = useAuthStore();
  const { addNotification } = useNotificationStore();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showVoidAuth, setShowVoidAuth] = useState(false);
  const [showConfirmVoid, setShowConfirmVoid] = useState(false);

  const subtotal = getTotal();
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handlePaymentComplete = async (method: 'cash' | 'card' | 'bank_transfer' | 'moniepoint', details: any) => {
    if (!user) return;

    try {
      const transaction: Transaction = {
        transaction_number: `TRX-${Date.now()}`,
        employee_id: user.id,
        employee_name: user.name,
        items: items.map(item => ({
          productId: item.id!,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          cost: item.cost
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        payment_method: method,
        payment_status: 'paid',
        // Prefer gateway transaction reference when available (moniepoint provides transactionReference)
        payment_reference: details.transactionReference ?? details.reference,
        // Cash-only fields
        amount_tendered: method === 'cash' ? details.amountTendered : undefined,
        change_amount: method === 'cash' ? details.change : undefined,
        created_at: new Date().toISOString(),
        synced: false
      };

      await transactionService.createTransaction(transaction);
      addNotification('success', `Transaction completed successfully!`);
      
      if (printerService.getStatus()) {
        try {
          const settings = { 
            store_name: 'Modern Coffee Shop', 
            tax_rate: taxRate, 
            receipt_header: '', 
            receipt_footer: 'Thank you!',
            currency: 'USD' 
          }; 
          await printerService.printReceipt(transaction, settings as any, user);
        } catch (e) {
          console.error("Auto-print failed:", e);
          addNotification('warning', 'Transaction saved, but printing failed.');
        }
      }

      clearCart();
      setShowPaymentModal(false);
      if (onCheckoutSuccess) onCheckoutSuccess();
      
    } catch (error) {
      console.error('Checkout failed:', error);
      addNotification('error', 'Failed to process transaction. Please try again.');
    }
  };

  const handleVoidClick = () => {
    if (items.length === 0) return;
    
    if (hasPermission('void_transaction')) {
      setShowConfirmVoid(true);
    } else {
      setShowVoidAuth(true);
    }
  };

  const performVoid = () => {
    clearCart();
    addNotification('info', 'Cart cleared successfully.');
    setShowConfirmVoid(false);
  };

  const onVoidAuthSuccess = () => {
    setShowVoidAuth(false);
    performVoid();
  };

  const handleHold = () => {
    const note = prompt('Add a note for this hold (optional):');
    if (note !== null) {
      holdTransaction(note || undefined);
      addNotification('success', 'Transaction held successfully.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          Current Order
          <span className="text-xs font-normal text-white bg-blue-600 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </h2>
        
        <div className="flex gap-2">
           {printerService.getStatus() && (
             <div className="text-green-600 p-2" title="Printer Connected">
               <Printer size={20} />
             </div>
           )}
          {heldTransactions.length > 0 && (
            <button 
              onClick={() => setShowHeldModal(true)}
              className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg relative"
              title="View Held Transactions"
            >
              <PauseCircle size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                {heldTransactions.length}
              </span>
            </button>
          )}
          <button 
            onClick={handleVoidClick}
            disabled={items.length === 0}
            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
            title="Void Transaction"
          >
            <XCircle size={20} />
          </button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <Search size={32} />
            </div>
            <p>Scan or select products</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 p-3 rounded-lg bg-white border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 line-clamp-1">{item.name}</h4>
                  <div className="text-xs text-gray-500">{item.sku}</div>
                </div>
                <div className="text-right">
                   <div className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</div>
                   <div className="text-xs text-gray-400">${item.price.toFixed(2)} / unit</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-1">
                  <button 
                    onClick={() => updateQuantity(item.id!, item.quantity - 1)}
                    className="p-1 hover:bg-white rounded shadow-sm text-gray-600 transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id!, item.quantity + 1)}
                    className="p-1 hover:bg-white rounded shadow-sm text-gray-600 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id!)}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Totals */}
      <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
           <button 
             onClick={handleHold}
             disabled={items.length === 0}
             className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 disabled:opacity-50 transition-colors w-20"
           >
             <PauseCircle size={20} />
             <span className="text-[10px] font-bold uppercase mt-1">Hold</span>
           </button>
           
           <button 
             onClick={() => setShowPaymentModal(true)}
             disabled={items.length === 0}
             className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors"
           >
             <ShoppingBag size={20} />
             <span className="font-bold text-lg">Checkout</span>
           </button>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={total}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Held Transactions Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Held Transactions</h3>
              <button onClick={() => setShowHeldModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {heldTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No held transactions.</p>
              ) : (
                heldTransactions.map(hold => (
                  <div key={hold.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(hold.timestamp).toLocaleTimeString()} 
                        <span className="text-gray-500 text-sm ml-2">({hold.items.length} items)</span>
                      </p>
                      {hold.note && <p className="text-sm text-gray-500 italic">"{hold.note}"</p>}
                      <p className="text-sm font-bold text-gray-800 mt-1">
                        Total: ${hold.items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                       <Button 
                         size="sm" 
                         variant="danger" 
                         onClick={() => {
                           discardHeldTransaction(hold.id);
                           addNotification('info', 'Held transaction discarded');
                         }}
                       >
                         Discard
                       </Button>
                       <Button 
                         size="sm" 
                         onClick={() => { retrieveTransaction(hold.id); setShowHeldModal(false); }}
                         className="gap-1"
                       >
                         <PlayCircle size={16} /> Resume
                       </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showConfirmVoid}
        title="Void Transaction"
        message="Are you sure you want to void this transaction? All items will be removed from the cart."
        confirmText="Void"
        variant="danger"
        onConfirm={performVoid}
        onCancel={() => setShowConfirmVoid(false)}
      />

      <ReauthModal 
        isOpen={showVoidAuth} 
        onClose={() => setShowVoidAuth(false)} 
        onSuccess={onVoidAuthSuccess}
        actionName="clear cart items"
      />
    </div>
  );
};