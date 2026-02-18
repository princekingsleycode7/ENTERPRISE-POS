import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { NumPad } from '../auth/NumPad';
import { korapayService } from '../../services/payment/korapayService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentComplete: (method: 'cash' | 'card' | 'bank_transfer', details: any) => Promise<void>;
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer';

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  totalAmount, 
  onPaymentComplete 
}) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMethod('cash');
      setAmountTendered('');
      setProcessing(false);
      setError('');
      setReference(korapayService.generateReference());
    }
  }, [isOpen]);

  const change = parseFloat(amountTendered || '0') - totalAmount;
  const isCashSufficient = parseFloat(amountTendered || '0') >= totalAmount;

  const handleNumPad = (num: number) => {
    setAmountTendered(prev => prev + num);
  };

  const handleClear = () => {
    setAmountTendered('');
  };

  const handleCashPayment = async () => {
    if (!isCashSufficient) {
      setError('Insufficient amount');
      return;
    }
    setProcessing(true);
    await onPaymentComplete('cash', {
      amountTendered: parseFloat(amountTendered),
      change: change
    });
    setProcessing(false);
  };

  const handleKorapay = async (selectedMethod: 'card' | 'bank_transfer') => {
    setProcessing(true);
    setError('');

    try {
      await korapayService.initializePayment({
        amount: totalAmount,
        reference: reference,
        customerEmail: customerEmail || undefined,
        channels: [selectedMethod], // Restrict to specific channel based on selection
        onSuccess: async (data) => {
          await onPaymentComplete(selectedMethod, {
            reference: reference,
            gatewayResponse: data
          });
          setProcessing(false);
        },
        onClose: () => {
          setProcessing(false);
          // Don't close parent modal, let user retry or switch method
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to initialize payment');
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex overflow-hidden h-[600px]">
        
        {/* Left: Payment Methods */}
        <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>
          
          <div className="space-y-3 flex-1">
            <button
              onClick={() => setMethod('cash')}
              disabled={processing}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                method === 'cash' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Banknote size={24} />
              <span className="font-semibold">Cash</span>
            </button>

            <button
              onClick={() => setMethod('card')}
              disabled={processing}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                method === 'card' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <CreditCard size={24} />
              <span className="font-semibold">Card</span>
            </button>

            <button
              onClick={() => setMethod('bank_transfer')}
              disabled={processing}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                method === 'bank_transfer' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Building2 size={24} />
              <span className="font-semibold">Bank Transfer</span>
            </button>
          </div>

          <div className="mt-auto pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500">Total Due</span>
              <span className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
            </div>
            <Button variant="ghost" fullWidth onClick={onClose} disabled={processing}>
              Cancel Transaction
            </Button>
          </div>
        </div>

        {/* Right: Payment Details */}
        <div className="flex-1 p-8 flex flex-col relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">
              {method === 'cash' ? 'Cash Payment' : 
               method === 'card' ? 'Card Payment' : 'Bank Transfer'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          {/* CASH VIEW */}
          {method === 'cash' && (
            <div className="flex-1 flex flex-col">
              <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                 <div className="flex justify-between mb-4">
                   <span className="text-gray-600">Total Amount</span>
                   <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between mb-4 items-center">
                   <span className="text-gray-600">Amount Tendered</span>
                   <div className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 text-xl font-bold min-w-[150px] text-right">
                     {amountTendered ? `$${parseFloat(amountTendered).toFixed(2)}` : '$0.00'}
                   </div>
                 </div>
                 <div className={`flex justify-between pt-4 border-t border-gray-200 ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                   <span className="font-medium">Change Due</span>
                   <span className="font-bold text-xl">${change > 0 ? change.toFixed(2) : '0.00'}</span>
                 </div>
              </div>

              {error && <p className="text-red-500 text-center mb-4">{error}</p>}

              <div className="flex-1">
                 <NumPad 
                   onNumberClick={handleNumPad} 
                   onClear={handleClear} 
                   showEnter={false}
                 />
              </div>

              <Button 
                size="lg" 
                fullWidth 
                onClick={handleCashPayment}
                disabled={!isCashSufficient || processing}
                className="mt-6"
              >
                {processing ? 'Processing...' : `Complete Payment ($${totalAmount.toFixed(2)})`}
              </Button>
            </div>
          )}

          {/* KORAPAY VIEW (Card & Bank) */}
          {(method === 'card' || method === 'bank_transfer') && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600">
                {method === 'card' ? <CreditCard size={40} /> : <Building2 size={40} />}
              </div>
              
              <h4 className="text-xl font-semibold mb-2">
                Pay with {method === 'card' ? 'Card' : 'Bank Transfer'}
              </h4>
              <p className="text-gray-500 max-w-xs mb-8">
                Click the button below to launch the secure Korapay payment terminal.
                Reference: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{reference}</span>
              </p>

              <div className="w-full max-w-sm mb-6 text-left">
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Email (Optional)</label>
                <input 
                  type="email" 
                  placeholder="customer@example.com"
                  className="w-full border border-gray-300 rounded-lg p-3"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 mb-4 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                size="lg" 
                fullWidth 
                onClick={() => handleKorapay(method)}
                disabled={processing}
                className="max-w-sm"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={20} /> Waiting for Gateway...
                  </span>
                ) : (
                  'Launch Payment Terminal'
                )}
              </Button>
              
              <p className="mt-4 text-xs text-gray-400">
                Secured by Korapay
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};