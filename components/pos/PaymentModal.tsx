/**
 * components/pos/PaymentModal.tsx  (UPDATED)
 *
 * Changes from original:
 *  - Added "Moniepoint POS" payment method (card via physical terminal & POS Transfer)
 *  - Moniepoint flow uses moniepointService (push-to-terminal + Firestore listener)
 *  - KoraPay flow preserved exactly as-is
 *  - Added terminal serial input (falls back to store settings)
 *  - Added a real-time "Waiting for terminal…" status panel
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X, CreditCard, Banknote, Building2, CheckCircle,
  AlertCircle, Loader2, Smartphone, RefreshCw
} from 'lucide-react';
import { Button } from '../common/Button';
import { NumPad } from '../auth/NumPad';
import { korapayService } from '../../services/payment/korapayService';
import {
  moniepointService,
  MoniepointPaymentMethod,
  MoniepointWebhookPayload,
} from '../../services/payment/moniepointService';
import { settingsService } from '../../services/settings/settingsService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentComplete: (
    method: 'cash' | 'card' | 'bank_transfer' | 'moniepoint',
    details: any
  ) => Promise<void>;
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'moniepoint';
type MoniepointSubMethod = 'CARD_PURCHASE' | 'POS_TRANSFER' | 'ANY';
type TerminalState = 'idle' | 'waiting' | 'success' | 'failed' | 'timeout';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  onPaymentComplete,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [reference, setReference] = useState('');

  // Moniepoint-specific state
  const [moniepointSubMethod, setMoniepointSubMethod] =
    useState<MoniepointSubMethod>('ANY');
  const [terminalSerial, setTerminalSerial] = useState('');
  const [terminalState, setTerminalState] = useState<TerminalState>('idle');
  const [terminalMessage, setTerminalMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const cancelMoniepointRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMethod('cash');
      setAmountTendered('');
      setProcessing(false);
      setError('');
      setReference(korapayService.generateReference());
      setTerminalState('idle');
      setTerminalMessage('');
      setElapsedSeconds(0);

      // Load terminal serial from store settings
      settingsService.getSettings().then((settings) => {
        if (settings?.moniepoint_terminal_serial) {
          setTerminalSerial(settings.moniepoint_terminal_serial);
        }
      });
    }

    // Cancel any in-progress terminal payment when modal closes
    return () => {
      if (!isOpen) {
        cancelMoniepointRef.current?.();
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
  }, [isOpen]);

  // ── Elapsed timer for Moniepoint waiting state ─────────────────────────────
  useEffect(() => {
    if (terminalState === 'waiting') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [terminalState]);

  // ── Cash payment ──────────────────────────────────────────────────────────
  const change = parseFloat(amountTendered || '0') - totalAmount;
  const isCashSufficient = parseFloat(amountTendered || '0') >= totalAmount;

  const handleNumPad = (num: number) => setAmountTendered((prev) => prev + num);
  const handleClear = () => setAmountTendered('');

  const handleCashPayment = async () => {
    if (!isCashSufficient) { setError('Insufficient amount'); return; }
    setProcessing(true);
    await onPaymentComplete('cash', {
      amountTendered: parseFloat(amountTendered),
      change,
    });
    setProcessing(false);
  };

  // ── KoraPay (online card / bank transfer) ─────────────────────────────────
  const handleKorapay = async (selectedMethod: 'card' | 'bank_transfer') => {
    setProcessing(true);
    setError('');
    try {
      await korapayService.initializePayment({
        amount: totalAmount,
        reference,
        customerEmail: customerEmail || undefined,
        channels: [selectedMethod],
        onSuccess: async (data) => {
          await onPaymentComplete(selectedMethod, { reference, gatewayResponse: data });
          setProcessing(false);
        },
        onClose: () => { setProcessing(false); },
      });
    } catch (err) {
      console.error(err);
      setError('Failed to initialize payment');
      setProcessing(false);
    }
  };

  // ── Moniepoint POS Terminal ───────────────────────────────────────────────
  const handleMoniepoint = async () => {
    if (!terminalSerial.trim()) {
      setError('Terminal serial number is required. Check store settings.');
      return;
    }

    setProcessing(true);
    setError('');
    setTerminalState('waiting');
    setTerminalMessage('Waiting for customer to present card or transfer…');

    const moniepointRef = moniepointService.generateReference();
    setReference(moniepointRef);

    const cancelFn = await moniepointService.initializePayment({
      amount: totalAmount,
      reference: moniepointRef,
      terminalSerial: terminalSerial.trim(),
      paymentMethod: moniepointSubMethod as MoniepointPaymentMethod,

      onSuccess: async (data: MoniepointWebhookPayload) => {
        setTerminalState('success');
        setTerminalMessage(`Payment approved! ₦${data.amount.toLocaleString()} received.`);
        await onPaymentComplete('moniepoint', {
          reference: moniepointRef,
          transactionReference: data.transactionReference,
          transactionStatus: data.transactionStatus,
          actualPaymentMethod: data.actualPaymentMethod,
          amount: data.amount,
          responseCode: data.responseCode,
          responseMessage: data.responseMessage,
        });
        setProcessing(false);
      },

      onFailed: (data: MoniepointWebhookPayload | null) => {
        setTerminalState('failed');
        setTerminalMessage(
          data?.responseMessage ?? 'Payment declined or failed. Please try again.'
        );
        setError(data?.responseMessage ?? 'Payment failed');
        setProcessing(false);
      },

      onTimeout: () => {
        setTerminalState('timeout');
        setTerminalMessage('No response from terminal. Please check the POS device.');
        setError('Terminal timed out. Try again or use a different payment method.');
        setProcessing(false);
      },
    });

    cancelMoniepointRef.current = cancelFn;
  };

  const handleCancelMoniepoint = () => {
    cancelMoniepointRef.current?.();
    setTerminalState('idle');
    setProcessing(false);
    setError('');
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl md:rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh] md:max-h-[600px]">

        {/* ── Left: Payment Methods ── */}
        <div className="hidden md:flex md:w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>

          <div className="space-y-3 flex-1">
            {/* Cash */}
            <button onClick={() => setMethod('cash')} disabled={processing}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                method === 'cash'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}>
              <Banknote size={24} />
              <span className="font-semibold">Cash</span>
            </button>

            {/* KoraPay Card */}
            <button onClick={() => setMethod('card')} disabled={processing}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                method === 'card'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}>
              <CreditCard size={24} />
              <span className="font-semibold">Card (Online)</span>
            </button>

            {/* KoraPay Bank Transfer */}
            <button onClick={() => setMethod('bank_transfer')} disabled={processing}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                method === 'bank_transfer'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}>
              <Building2 size={24} />
              <span className="font-semibold">Bank Transfer</span>
            </button>

            {/* ✨ Moniepoint POS Terminal */}
            <button onClick={() => setMethod('moniepoint')} disabled={processing}
              className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                method === 'moniepoint'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}>
              <Smartphone size={24} />
              <div className="text-left">
                <span className="font-semibold block">Moniepoint POS</span>
                <span className={`text-xs ${method === 'moniepoint' ? 'text-green-100' : 'text-gray-400'}`}>
                  Card / Transfer via terminal
                </span>
              </div>
            </button>
          </div>

          {/* Amount due summary */}
          <div className="mt-6 p-4 bg-blue-600 rounded-xl text-white">
            <p className="text-sm opacity-80">Total Due</p>
            <p className="text-2xl font-bold">₦{totalAmount.toLocaleString('en-NG', {
              minimumFractionDigits: 2
            })}</p>
          </div>
        </div>

        {/* ── Right: Method-specific Panel / Mobile Full-screen ── */}
        <div className="w-full md:flex-1 md:w-2/3 p-6 flex flex-col relative overflow-y-auto">
          {/* Close button */}
          <button onClick={onClose} disabled={processing && method === 'moniepoint' && terminalState === 'waiting'}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>

          {/* Mobile Payment Method Selector */}
          <div className="md:hidden mb-6 pt-2">
            <h3 className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wide">Select Payment</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMethod('cash')} disabled={processing}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all text-xs font-semibold ${
                  method === 'cash'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}>
                <Banknote size={20} />
                <span>Cash</span>
              </button>

              <button onClick={() => setMethod('card')} disabled={processing}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all text-xs font-semibold ${
                  method === 'card'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}>
                <CreditCard size={20} />
                <span>Card</span>
              </button>

              <button onClick={() => setMethod('bank_transfer')} disabled={processing}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all text-xs font-semibold ${
                  method === 'bank_transfer'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}>
                <Building2 size={20} />
                <span>Bank</span>
              </button>

              <button onClick={() => setMethod('moniepoint')} disabled={processing}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all text-xs font-semibold ${
                  method === 'moniepoint'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}>
                <Smartphone size={20} />
                <span>Moniepoint</span>
              </button>
            </div>
          </div>

          {/* Total Amount Summary (Mobile) */}
          <div className="md:hidden mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-600 opacity-70">Total Due</p>
            <p className="text-2xl font-bold text-blue-600">₦{totalAmount.toLocaleString('en-NG', {
              minimumFractionDigits: 2
            })}</p>
          </div>

          {/* ── CASH ── */}
          {method === 'cash' && (
            <div className="flex flex-col md:h-full">
              <h3 className="text-lg font-bold mb-4">Cash Payment</h3>
              <p className="text-sm text-gray-500 mb-3">Enter amount tendered by customer:</p>
              <div className="bg-gray-100 rounded-xl p-4 text-center mb-4">
                <span className="text-3xl font-bold">
                  ₦{parseFloat(amountTendered || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex-1 md:flex-1 overflow-y-auto mb-4 md:mb-0">
                <NumPad onNumberClick={handleNumPad} onClear={handleClear} />
              </div>
              {isCashSufficient && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3 flex justify-between">
                  <span className="text-green-700 font-medium">Change:</span>
                  <span className="text-green-700 font-bold">
                    ₦{change.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              <Button onClick={handleCashPayment} disabled={!isCashSufficient || processing}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">
                {processing ? <Loader2 className="animate-spin mx-auto" /> : 'Complete Cash Payment'}
              </Button>
            </div>
          )}

          {/* ── KORAPAY CARD / BANK TRANSFER ── */}
          {(method === 'card' || method === 'bank_transfer') && (
            <div className="flex flex-col md:h-full md:justify-center gap-4">
              <h3 className="text-lg font-bold">
                {method === 'card' ? 'Card Payment (KoraPay)' : 'Bank Transfer (KoraPay)'}
              </h3>
              <p className="text-sm text-gray-500">
                A secure KoraPay popup will open for the customer to complete payment.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email (optional)
                </label>
                <input type="email" value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={16} /><span className="text-sm">{error}</span>
                </div>
              )}
              <Button
                onClick={() => handleKorapay(method as 'card' | 'bank_transfer')}
                disabled={processing}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">
                {processing
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Opening KoraPay…</span>
                  : `Pay ₦${totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
              </Button>
            </div>
          )}

          {/* ── MONIEPOINT POS ── */}
          {method === 'moniepoint' && (
            <div className="flex flex-col md:h-full gap-4">
              <h3 className="text-lg font-bold text-green-700">Moniepoint POS Terminal</h3>

              {/* Sub-method selector */}
              {terminalState === 'idle' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ANY', 'CARD_PURCHASE', 'POS_TRANSFER'] as MoniepointSubMethod[]).map((m) => (
                      <button key={m} onClick={() => setMoniepointSubMethod(m)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                          moniepointSubMethod === m
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}>
                        {m === 'ANY' ? 'Any Method' : m === 'CARD_PURCHASE' ? 'Card Only' : 'Transfer Only'}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Terminal Serial Number
                    </label>
                    <input
                      type="text"
                      value={terminalSerial}
                      onChange={(e) => setTerminalSerial(e.target.value)}
                      placeholder="e.g. P260XXXXXXX"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Set a default in Settings → Store Settings → Moniepoint Terminal
                    </p>
                  </div>
                </>
              )}

              {/* Waiting for terminal */}
              {terminalState === 'waiting' && (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                      <Smartphone size={48} className="text-green-600" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800 text-lg">{terminalMessage}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Terminal: <span className="font-mono">{terminalSerial}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Elapsed: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 w-full text-center">
                    <p className="text-yellow-800 text-sm font-medium">
                      Amount: ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-yellow-600 text-xs mt-1">
                      Customer should tap card or initiate transfer on the POS device
                    </p>
                  </div>
                  <button onClick={handleCancelMoniepoint}
                    className="text-sm text-red-500 underline hover:text-red-700">
                    Cancel & use different method
                  </button>
                </div>
              )}

              {/* Success */}
              {terminalState === 'success' && (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <CheckCircle size={64} className="text-green-500" />
                  <p className="font-bold text-green-700 text-xl">Payment Approved!</p>
                  <p className="text-gray-500 text-sm">{terminalMessage}</p>
                </div>
              )}

              {/* Failed / Timeout */}
              {(terminalState === 'failed' || terminalState === 'timeout') && (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <AlertCircle size={64} className="text-red-400" />
                  <p className="font-bold text-red-600 text-lg">
                    {terminalState === 'timeout' ? 'Terminal Timeout' : 'Payment Failed'}
                  </p>
                  <p className="text-gray-500 text-sm text-center">{terminalMessage}</p>
                  <button
                    onClick={() => { setTerminalState('idle'); setError(''); }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    <RefreshCw size={16} /> Try Again
                  </button>
                </div>
              )}

              {/* Error */}
              {error && terminalState === 'idle' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={16} /><span className="text-sm">{error}</span>
                </div>
              )}

              {/* Push Payment Button */}
              {terminalState === 'idle' && (
                <Button
                  onClick={handleMoniepoint}
                  disabled={processing || !terminalSerial.trim()}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mt-auto">
                  <span className="flex items-center justify-center gap-2">
                    <Smartphone size={18} />
                    Push to Terminal — ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};