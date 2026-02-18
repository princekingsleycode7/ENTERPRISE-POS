import React, { useState, useEffect } from 'react';
import { Save, Printer, FileText } from 'lucide-react';
import { Button } from '../common/Button';
import { Settings } from '../../types';
import { settingsService } from '../../services/settings/settingsService';
import { useAuthStore } from '../../stores/useAuthStore';
import { PrinterSettings } from './PrinterSettings';

interface ReceiptSettingsProps {
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
}

export const ReceiptSettings: React.FC<ReceiptSettingsProps> = ({ settings, onUpdate }) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({
      receipt_header: settings.receipt_header,
      receipt_footer: settings.receipt_footer,
      show_tax_breakdown: settings.show_tax_breakdown,
      paper_width: settings.paper_width
    });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const updated = await settingsService.updateSettings(formData as Settings, user.id);
      onUpdate(updated);
      alert('Receipt settings saved');
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Printer Connection */}
      <PrinterSettings />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Form */}
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} /> Receipt Layout
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Header</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Welcome to ModernPOS"
                value={formData.receipt_header || ''}
                onChange={e => setFormData({ ...formData, receipt_header: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Thank you for your business!"
                value={formData.receipt_footer || ''}
                onChange={e => setFormData({ ...formData, receipt_footer: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
               <label className="text-sm font-medium text-gray-700">Show Tax Breakdown</label>
               <input
                 type="checkbox"
                 className="w-4 h-4 text-blue-600 rounded"
                 checked={formData.show_tax_breakdown || false}
                 onChange={e => setFormData({ ...formData, show_tax_breakdown: e.target.checked })}
               />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper Width</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.paper_width || '58mm'}
                onChange={e => setFormData({ ...formData, paper_width: e.target.value as any })}
              >
                <option value="58mm">58mm (Standard)</option>
                <option value="80mm">80mm (Wide)</option>
              </select>
            </div>

            <div className="pt-4">
              <Button type="submit" fullWidth disabled={loading} className="gap-2">
                <Save size={18} /> Save Changes
              </Button>
            </div>
          </div>
        </form>

        {/* Live Preview */}
        <div className="bg-gray-100 p-6 rounded-xl flex items-center justify-center border border-gray-200">
           <div className={`bg-white shadow-md p-4 text-xs font-mono text-gray-800 leading-tight ${formData.paper_width === '80mm' ? 'w-[300px]' : 'w-[220px]'}`}>
              <div className="text-center mb-2">
                 <p className="font-bold text-sm mb-1">{settings.store_name}</p>
                 <p className="whitespace-pre-wrap mb-1">{formData.receipt_header}</p>
                 <p>--------------------------------</p>
              </div>
              
              <div className="mb-2 space-y-1">
                 <p>Receipt #: TRX-123456</p>
                 <p>Date: {new Date().toLocaleString()}</p>
                 <p>Cashier: {user?.name}</p>
              </div>
              <p>--------------------------------</p>
              
              <div className="mb-2 space-y-1">
                 <div className="flex justify-between"><span>Espresso</span><span>$3.50</span></div>
                 <div className="flex justify-between"><span>Croissant</span><span>$3.00</span></div>
              </div>
              <p>--------------------------------</p>
              
              <div className="mb-2 space-y-1 font-bold">
                 <div className="flex justify-between"><span>Subtotal</span><span>$6.50</span></div>
                 {formData.show_tax_breakdown && (
                   <div className="flex justify-between"><span>{settings.tax_label}</span><span>$0.49</span></div>
                 )}
                 <div className="flex justify-between text-sm mt-1"><span>TOTAL</span><span>$6.99</span></div>
              </div>
              <p>--------------------------------</p>
              
              <div className="text-center mt-4">
                 <p className="whitespace-pre-wrap">{formData.receipt_footer}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};