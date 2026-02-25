/**
 * components/inventory/CSVImportModal.tsx
 * 
 * Modal for CSV product batch import
 */

import React, { useState } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { csvImportService, CSVImportResult } from '../../services/inventory/csvImportService';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { addNotification } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [importType, setImportType] = useState<'full' | 'quick'>('full');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let importResult: CSVImportResult;

      if (importType === 'full') {
        importResult = await csvImportService.importFromCSV(file);
      } else {
        importResult = await csvImportService.quickUpdateInventory(file);
      }

      setResult(importResult);

      if (importResult.success) {
        addNotification('success', importResult.message);
        if (onImportComplete) {
          setTimeout(() => onImportComplete(), 500);
        }
      } else {
        addNotification('error', importResult.message);
      }
    } catch (error) {
      console.error('Import error:', error);
      addNotification('error', 'Failed to import CSV file');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    csvImportService.downloadTemplate();
    addNotification('success', 'Template downloaded!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">
            Import Products from CSV
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!result ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Two import modes available:</strong>
                </p>
                <ul className="text-sm text-blue-800 mt-2 ml-4 list-disc space-y-1">
                  <li><strong>Full Import:</strong> Create new products with all details (name, SKU, price, category, stock, etc.)</li>
                  <li><strong>Quick Update:</strong> Update existing product stock levels (SKU + quantity only)</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  importType === 'full'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="importType"
                    value="full"
                    checked={importType === 'full'}
                    onChange={e => setImportType(e.target.value as 'full' | 'quick')}
                    className="mr-2"
                  />
                  <span className="font-medium">Full Product Import</span>
                  <p className="text-xs text-gray-600 mt-1">All product details including stock</p>
                </label>

                <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  importType === 'quick'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="importType"
                    value="quick"
                    checked={importType === 'quick'}
                    onChange={e => setImportType(e.target.value as 'full' | 'quick')}
                    className="mr-2"
                  />
                  <span className="font-medium">Quick Stock Update</span>
                  <p className="text-xs text-gray-600 mt-1">Update stock levels only (SKU, quantity)</p>
                </label>
              </div>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={downloadTemplate}
                  className="w-full gap-2 mb-4"
                >
                  <Download size={18} />
                  Download Template ({importType === 'full' ? 'Full' : 'Quick'})
                </Button>
              </div>

              <div>
                <label htmlFor="csv-upload" className="block mb-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="font-medium text-gray-900">Select CSV File</p>
                    <p className="text-sm text-gray-600 mt-1">Click to browse or drag and drop</p>
                  </div>
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  disabled={loading}
                  className="sr-only"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-medium mb-2">CSV Format Guidelines:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>First row must be headers</li>
                  <li>Required columns: <code className="bg-white px-1">name</code>, <code className="bg-white px-1">sku</code></li>
                  <li>Optional: category, price, cost, stock_quantity, reorder_level, description, imageUrl, barcode</li>
                  <li>Commas in fields should be quoted: "Smith, John"</li>
                  <li>Maximum 500 rows per file (auto-batched if more)</li>
                </ul>
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                  <p className="mt-3 text-gray-600">Processing CSV file...</p>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className={`border rounded-lg p-6 mb-6 ${
                result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
                  ) : (
                    <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
                  )}
                  <div>
                    <h3 className={`font-bold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.message}
                    </h3>
                    <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      Total rows: {result.totalRows} | Imported: {result.importedCount} | Skipped: {result.skippedCount}
                    </p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Issues Found ({result.errors.length})</h4>
                  <div className="bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {result.errors.slice(0, 20).map((error, idx) => (
                      <div key={idx} className="border-b border-gray-100 last:border-b-0 p-3 text-sm">
                        <p className="font-medium text-gray-900">Row {error.rowNumber}</p>
                        <p className="text-gray-600">{error.reason}</p>
                      </div>
                    ))}
                    {result.errors.length > 20 && (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        ... and {result.errors.length - 20} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResult(null)}
                  className="flex-1"
                >
                  Import Another File
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
