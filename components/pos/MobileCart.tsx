import React, { useState } from 'react';
import { useCartStore } from '../../stores/useCartStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { Minus, Plus, Trash2, ArrowLeft, DeleteIcon } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { ReauthModal } from '../auth/ReauthModal';
import { Transaction } from '../../types';
import { transactionService } from '../../services/transactions/transactionService';
import { printerService } from '../../services/printer/printerService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface MobileCartProps {
  onBack: () => void;
}

export const MobileCart: React.FC<MobileCartProps> = ({ onBack }) => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    getTotal,
    clearCart,
    taxRate,
    holdTransaction,
    heldTransactions,
  } = useCartStore();

  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showVoidAuth, setShowVoidAuth] = useState(false);

  const subtotal = getTotal();
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handlePaymentComplete = async (
    method: 'cash' | 'card' | 'bank_transfer' | 'moniepoint',
    details: any
  ) => {
    if (!user) return;

    try {
      const transaction: Transaction = {
        transaction_number: `TRX-${Date.now()}`,
        employee_id: user.id,
        employee_name: user.name,
        items: items.map((item) => ({
          productId: item.id!,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          cost: item.cost,
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        payment_method: method,
        payment_status: 'paid',
        payment_reference: details.transactionReference ?? details.reference,
        amount_tendered: method === 'cash' ? details.amountTendered : undefined,
        change_amount: method === 'cash' ? details.change : undefined,
        created_at: new Date().toISOString(),
        synced: false,
      };

      await transactionService.createTransaction(transaction);
      addNotification('success', 'Transaction completed successfully!');

      if (printerService.getStatus()) {
        try {
          const settings = {
            store_name: 'Modern Coffee Shop',
            tax_rate: taxRate,
            receipt_header: '',
            receipt_footer: 'Thank you!',
            currency: 'USD',
          };
          await printerService.printReceipt(transaction, settings as any, user);
        } catch (e) {
          console.error('Auto-print failed:', e);
          addNotification('warning', 'Transaction saved, but printing failed.');
        }
      }

      clearCart();
      setShowPaymentModal(false);
      onBack();
    } catch (error) {
      console.error('Checkout failed:', error);
      addNotification('error', 'Failed to process transaction. Please try again.');
    }
  };

  const handleHold = () => {
    const note = prompt('Add a note for this hold (optional):');
    if (note !== null) {
      holdTransaction(note || undefined);
      addNotification('success', 'Transaction held successfully.');
      onBack();
    }
  };

  const handleClearCart = () => {
    clearCart();
    setShowConfirmClear(false);
    addNotification('info', 'Cart cleared successfully.');
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative">
      {/* Top App Bar */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="text-slate-700 dark:text-slate-300" size={24} />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold tracking-tight">Current Order</h1>
          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={items.length === 0}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Clear all"
          >
            <span className="material-icons text-slate-700 dark:text-slate-300">delete</span>
          </button>
        </div>
      </header>

      {/* Order List */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <span className="material-icons text-slate-300 text-4xl">shopping_bag</span>
            </div>
            <p className="font-medium">No items in cart</p>
            <p className="text-sm">Scan or select products to add</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
            >
              {/* Product Image */}
              <div
                className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 bg-cover bg-center shrink-0"
                style={{
                  backgroundImage: item.imageUrl ? `url('${item.imageUrl}')` : 'none',
                  backgroundColor: !item.imageUrl ? 'rgb(226, 232, 240)' : 'transparent',
                }}
              >
                {!item.imageUrl && (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl">
                    {item.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate text-slate-900 dark:text-white">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {item.sku}
                </p>
                <p className="text-blue-600 font-bold mt-1 text-sm">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>

              {/* Quantity Controls */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 px-1 py-1">
                  <button
                    onClick={() => updateQuantity(item.id!, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-600/10 transition-colors"
                  >
                    <span className="material-icons text-sm">remove</span>
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id!, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <span className="material-icons text-sm">add</span>
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id!)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Summary & Footer */}
      {items.length > 0 && (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-6 pb-8 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Subtotal</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Tax ({(taxRate * 100).toFixed(0)}%)
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                ${tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
              <span className="text-lg font-bold dark:text-white">Total Amount</span>
              <span className="text-2xl font-black text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleHold}
              className="flex-1 h-14 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-600/20 dark:hover:bg-blue-600/30 transition-all border border-blue-600/20"
            >
              <span className="material-icons">pause_circle</span>
              Hold
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex-[2] h-14 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all text-lg"
            >
              <span className="material-icons">shopping_cart_checkout</span>
              Checkout
            </button>
          </div>

          {/* Safe Area Spacer */}
          <div className="h-4"></div>
        </footer>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={total}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmClear}
        title="Clear Cart"
        message="Are you sure you want to clear all items from the cart?"
        confirmText="Clear"
        variant="danger"
        onConfirm={handleClearCart}
        onCancel={() => setShowConfirmClear(false)}
      />

      {/* Reauth Modal */}
      <ReauthModal
        isOpen={showVoidAuth}
        onClose={() => setShowVoidAuth(false)}
        onSuccess={() => {
          setShowVoidAuth(false);
          handleClearCart();
        }}
        actionName="clear cart items"
      />
    </div>
  );
};
