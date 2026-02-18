import React, { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Product } from '../../types';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (adjustment: number, reason: string) => Promise<void>;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ 
  isOpen, 
  onClose, 
  product, 
  onConfirm 
}) => {
  const [type, setType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('Restock');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !product) return null;

  const REASONS = {
    add: ['Restock', 'Return', 'Inventory Correction', 'Other'],
    remove: ['Damaged', 'Expired', 'Theft', 'Inventory Correction', 'Other']
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    setLoading(true);
    try {
      const adjustment = type === 'add' ? quantity : -quantity;
      const finalReason = reason === 'Other' ? customReason : reason;
      await onConfirm(adjustment, finalReason);
      onClose();
      // Reset state
      setQuantity(0);
      setReason(REASONS[type][0]);
      setCustomReason('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-900">Adjust Stock</h3>
            <p className="text-sm text-gray-500">{product.name} (Current: {product.stock_quantity})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => { setType('add'); setReason(REASONS['add'][0]); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'add' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowUpCircle size={16} /> Add
            </button>
            <button
              type="button"
              onClick={() => { setType('remove'); setReason(REASONS['remove'][0]); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'remove' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowDownCircle size={16} /> Remove
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                className="w-full text-center text-2xl font-bold border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={quantity || ''}
                onChange={e => setQuantity(parseInt(e.target.value))}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={reason}
                onChange={e => setReason(e.target.value)}
              >
                {REASONS[type].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {reason === 'Other' && (
              <div>
                <input
                  type="text"
                  placeholder="Enter specific reason..."
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button 
              type="submit" 
              fullWidth 
              disabled={loading || quantity <= 0}
              className={type === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {loading ? 'Processing...' : `Confirm ${type === 'add' ? 'Addition' : 'Removal'}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};