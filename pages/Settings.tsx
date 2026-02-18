import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../components/settings/StoreSettings';
import { ReceiptSettings } from '../components/settings/ReceiptSettings';
import { EmployeeManagement } from '../components/settings/EmployeeManagement';
import { SystemSettings } from '../components/settings/SystemSettings';
import { Settings as SettingsType } from '../types';
import { settingsService } from '../services/settings/settingsService';
import { useAuthStore } from '../stores/useAuthStore';
import { Lock } from 'lucide-react';

export const Settings: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState('store');
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await settingsService.getSettings();
    setSettings(data);
    setLoading(false);
  };

  if (!hasPermission('manage_settings')) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
         <div className="text-center p-8 bg-white rounded-xl shadow-sm">
           <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
           <p className="text-gray-500">You need admin privileges to access settings.</p>
         </div>
      </div>
    );
  }

  if (loading || !settings) {
    return <div className="p-10 text-center">Loading settings...</div>;
  }

  const tabs = [
    { id: 'store', label: 'Store & Tax' },
    { id: 'receipt', label: 'Receipts' },
    { id: 'employees', label: 'Users' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col h-full overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage store configuration, users, and system preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {activeTab === 'store' && <StoreSettings settings={settings} onUpdate={setSettings} />}
        {activeTab === 'receipt' && <ReceiptSettings settings={settings} onUpdate={setSettings} />}
        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'system' && <SystemSettings settings={settings} onUpdate={setSettings} />}
      </div>
    </div>
  );
};