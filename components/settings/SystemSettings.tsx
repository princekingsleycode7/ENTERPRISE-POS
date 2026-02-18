import React, { useState } from 'react';
import { Server, Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { Settings } from '../../types';
import { settingsService } from '../../services/settings/settingsService';
import { useAuthStore } from '../../stores/useAuthStore';
import { syncService } from '../../services/offline/syncService';
import { offlineDB } from '../../services/offline/db';

interface SystemSettingsProps {
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ settings, onUpdate }) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    low_stock_threshold: settings.low_stock_threshold,
    auto_sync_interval: settings.auto_sync_interval,
    session_timeout: settings.session_timeout
  });

  const handleSave = async () => {
    if (!user) return;
    try {
      const updated = await settingsService.updateSettings(formData, user.id);
      onUpdate(updated);
      alert('System settings saved');
    } catch (e) {
      alert('Failed to save settings');
    }
  };

  const handleManualSync = async () => {
    try {
      await syncService.syncPendingTransactions();
      await syncService.syncProductsFromFirebase();
      alert('Sync completed successfully');
    } catch (e) {
      alert('Sync failed. Check internet connection.');
    }
  };

  const handleClearCache = async () => {
    if (confirm('WARNING: This will delete all local data. You may lose unsynced transactions. Are you sure?')) {
      await (offlineDB as any).delete();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Server size={20} /> System Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={formData.low_stock_threshold}
              onChange={e => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-400 mt-1">Default level to trigger low stock alerts.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Sync Interval (min)</label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={formData.auto_sync_interval}
              onChange={e => setFormData({ ...formData, auto_sync_interval: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (min)</label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={formData.session_timeout}
              onChange={e => setFormData({ ...formData, session_timeout: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>Save Config</Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
         <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
           <Database size={20} /> Data & Maintenance
         </h3>
         
         <div className="flex flex-col md:flex-row gap-4">
            <Button variant="secondary" onClick={handleManualSync} className="gap-2">
               <RefreshCw size={18} /> Force Sync Now
            </Button>

            <Button variant="danger" onClick={handleClearCache} className="gap-2">
               <AlertTriangle size={18} /> Clear Local Cache
            </Button>
         </div>

         <div className="mt-4 p-4 bg-gray-50 rounded text-xs text-gray-500 font-mono">
            App Version: 1.0.0 <br/>
            Offline DB Version: 5 <br/>
            Current User: {user?.name} ({user?.role})
         </div>
      </div>
    </div>
  );
};