import React, { useState, useEffect } from 'react';
import { X, DollarSign, Save } from 'lucide-react';
import { Button } from '../common/Button';
import { transactionService } from '../../services/transactions/transactionService';
import { useAuthStore } from '../../stores/useAuthStore';
import { DailyCashRegister } from '../../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [activeRegister, setActiveRegister] = useState<DailyCashRegister | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [totals, setTotals] = useState<{ cashSales: number, expectedCash: number } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadRegisterStatus();
    }
  }, [isOpen, user]);

  const loadRegisterStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await transactionService.getCurrentRegister(user.id);
      setActiveRegister(reg);
      if (reg) {
        const stats = await transactionService.getRegisterTotals(reg);
        setTotals(stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await transactionService.openRegister(user, parseFloat(amount));
      onClose();
      alert('Register Opened Successfully');
    } catch (e) {
      alert('Failed to open register');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRegister) return;
    setLoading(true);
    try {
      await transactionService.closeRegister(activeRegister.id as number, parseFloat(amount), notes);
      onClose();
      alert('Register Closed Successfully');
    } catch (e) {
      alert('Failed to close register');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">
            {activeRegister ? 'Close Register (End Shift)' : 'Open Register (Start Shift)'}
          </h3>
          <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="p-6">
          {!activeRegister ? (
            // OPEN REGISTER FORM
            <form onSubmit={handleOpen} className="space-y-4">
              <p className="text-gray-600 text-sm">Please count the cash currently in the drawer to start your shift.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Cash Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <Button fullWidth disabled={loading}>
                {loading ? 'Opening...' : 'Open Register'}
              </Button>
            </form>
          ) : (
            // CLOSE REGISTER FORM
            <form onSubmit={handleClose} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Opening Balance:</span>
                  <span className="font-medium">${activeRegister.opening_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cash Sales:</span>
                  <span className="font-medium">${totals?.cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900">
                  <span>Expected Cash:</span>
                  <span>${totals?.expectedCash.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cash Count</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              {amount && totals && (
                 <div className={`text-sm font-medium ${parseFloat(amount) - totals.expectedCash < 0 ? 'text-red-600' : 'text-green-600'}`}>
                   Difference: ${(parseFloat(amount) - totals.expectedCash).toFixed(2)}
                 </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain any discrepancies..."
                />
              </div>

              <Button fullWidth variant="danger" disabled={loading}>
                {loading ? 'Closing...' : 'Close Register & End Shift'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};