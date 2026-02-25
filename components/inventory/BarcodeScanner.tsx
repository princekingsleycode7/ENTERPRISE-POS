/**
 * components/inventory/BarcodeScanner.tsx
 * 
 * Barcode scanner component for product lookup
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { barcodeService } from '../../services/inventory/barcodeService';
import { Product } from '../../types';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned?: (product: Product) => void;
  mode?: 'lookup' | 'assign';
  productId?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onProductScanned,
  mode = 'lookup',
  productId
}) => {
  const { addNotification } = useNotificationStore();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    setLoading(true);
    setScannedProduct(null);

    try {
      if (mode === 'lookup') {
        // Scan product
        const product = await barcodeService.scanBarcode(barcode);
        if (product) {
          setScannedProduct(product);
          addNotification('success', `Found: ${product.name}`);
          if (onProductScanned) {
            onProductScanned(product);
          }
        } else {
          addNotification('error', `Product not found with barcode: ${barcode}`);
        }
      } else {
        // Assign barcode to product
        if (!productId) {
          addNotification('error', 'No product selected');
          return;
        }

        if (!barcodeService.validateBarcode(barcode)) {
          addNotification('error', 'Invalid barcode format');
          setBarcodeInput('');
          return;
        }

        await barcodeService.updateProductBarcode(productId, barcode);
        addNotification('success', `Barcode assigned successfully!`);
        setBarcodeInput('');
        setScannedProduct(null);
        onClose();
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      addNotification('error', error instanceof Error ? error.message : 'Scan failed');
    } finally {
      setLoading(false);
      setBarcodeInput('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(barcodeInput);
    }
  };

  const handleManualEntry = async () => {
    if (!barcodeInput.trim()) {
      addNotification('error', 'Please enter a barcode');
      return;
    }
    await handleScan(barcodeInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'lookup' ? 'Scan Product' : 'Assign Barcode'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {mode === 'lookup'
                ? 'Point your barcode scanner at the product or enter the barcode manually.'
                : 'Scan or manually enter the barcode to assign to this product.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode / UPC Code
            </label>
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={manualEntry ? 'Enter barcode manually' : 'Ready to scan...'}
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg font-mono"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-2">
              {manualEntry ? 'Press Enter to submit' : 'Scanner will auto-submit when ready'}
            </p>
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin inline-block w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full" />
              <p className="text-sm text-gray-600 mt-2">Processing...</p>
            </div>
          )}

          {scannedProduct && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-green-900">{scannedProduct.name}</h4>
                  <p className="text-sm text-green-700 mt-1">
                    SKU: {scannedProduct.sku} | Stock: {scannedProduct.stock_quantity}
                  </p>
                  {scannedProduct.imageUrl && (
                    <img
                      src={scannedProduct.imageUrl}
                      alt={scannedProduct.name}
                      className="w-full h-32 object-cover rounded mt-3"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {!manualEntry && barcodeInput && !loading && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setManualEntry(true)}
              className="w-full text-sm"
            >
              Scanner not responding? Click to enter manually
            </Button>
          )}

          {manualEntry && (
            <Button
              type="button"
              onClick={handleManualEntry}
              disabled={!barcodeInput.trim() || loading}
              className="w-full"
            >
              <Search size={18} />
              {mode === 'lookup' ? 'Search Product' : 'Assign Barcode'}
            </Button>
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
