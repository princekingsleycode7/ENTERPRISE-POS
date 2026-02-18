import React, { useState, useEffect } from 'react';
import { Save, Building2, Receipt } from 'lucide-react';
import { Button } from '../common/Button';
import { Settings } from '../../types';
import { ReauthModal } from '../auth/ReauthModal';
import { useAuthStore } from '../../stores/useAuthStore';
import { settingsService } from '../../services/settings/settingsService';
import { useCartStore } from '../../stores/useCartStore';

interface StoreSettingsProps {
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({ settings, onUpdate }) => {
  const { user } = useAuthStore();
  const { setTaxRate } = useCartStore();
  
  const [formData, setFormData] = useState<Partial<Settings>>({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({
      store_name: settings.store_name,
      address: settings.address,
      phone: settings.phone,
      currency: settings.currency,
      tax_rate: settings.tax_rate * 100, // Display as percentage
      tax_enabled: settings.tax_enabled,
      tax_label: settings.tax_label
    });
  }, [settings]);

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const taxRateDecimal = (formData.tax_rate || 0) / 100;
      
      const updates = {
        ...formData,
        tax_rate: taxRateDecimal,
      } as Settings;

      const updated = await settingsService.updateSettings(updates, user.id);
      
      // Update Cart Store global tax rate
      setTaxRate(updated.tax_enabled ? updated.tax_rate : 0);
      
      onUpdate(updated);
      alert('Settings saved successfully');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
      setIsAuthOpen(false);
    }
  };

  return (
    <form onSubmit={handleSaveClick} className="space-y-6">
      {/* Store Info */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 size={20} /> Store Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.store_name || ''}
              onChange={e => setFormData({ ...formData, store_name: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.currency || 'NGN'}
              onChange={e => setFormData({ ...formData, currency: e.target.value })}
            >
              <option value="NGN">Nigerian Naira (₦)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">British Pound (£)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Receipt size={20} /> Tax Configuration
        </h3>
        <div className="flex items-center mb-4">
           <input
             type="checkbox"
             id="taxEnabled"
             className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
             checked={formData.tax_enabled || false}
             onChange={e => setFormData({ ...formData, tax_enabled: e.target.checked })}
           />
           <label htmlFor="taxEnabled" className="ml-2 text-sm font-medium text-gray-700">Enable Tax Calculation</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
             <input
               type="number"
               step="0.1"
               min="0"
               disabled={!formData.tax_enabled}
               className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
               value={formData.tax_rate || 0}
               onChange={e => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Tax Label (e.g., VAT)</label>
             <input
               type="text"
               disabled={!formData.tax_enabled}
               className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
               value={formData.tax_label || ''}
               onChange={e => setFormData({ ...formData, tax_label: e.target.value })}
             />
           </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={loading} className="gap-2">
           <Save size={20} /> Save Changes
        </Button>
      </div>

      <ReauthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        actionName="save store settings"
      />
    </form>
  );
};