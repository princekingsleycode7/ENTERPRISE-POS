import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Settings as SettingsIcon, LogOut, FileBarChart, Wifi, WifiOff, History, Wallet, ShieldAlert, RefreshCw, CheckCircle, Clock, Calculator } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { RegisterModal } from './transactions/RegisterModal';
import { useSyncStore } from '../stores/useSyncStore';

export const Layout: React.FC = () => {
  const { logout, user, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { isSyncing, pendingCount } = useSyncStore();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/pos', icon: ShoppingCart, label: 'POS' },
    { to: '/transactions', icon: History, label: 'Transactions' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/reports', icon: FileBarChart, label: 'Reports' },
  ];

  if (hasPermission('view_audit_logs')) {
    navItems.push({ to: '/audit', icon: ShieldAlert, label: 'Audit Logs' });
  }

  if (hasPermission('manage_settings')) {
    navItems.push({ to: '/tax-advisor', icon: Calculator, label: 'Tax Advisor' });
    navItems.push({ to: '/settings', icon: SettingsIcon, label: 'Settings' });
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="text-xl font-bold text-gray-800">ModernPOS</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
          
          <button
             onClick={() => setIsRegisterOpen(true)}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
          >
             <Wallet size={20} />
             Shift Register
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
           {/* Status Indicators */}
          <div className="space-y-2 mb-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Online' : 'Offline Mode'}
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              isSyncing ? 'bg-blue-50 text-blue-700' : 
              pendingCount > 0 ? 'bg-orange-50 text-orange-700' : 
              'bg-gray-100 text-gray-600'
            }`}>
               {isSyncing ? (
                 <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
               ) : pendingCount > 0 ? (
                 <><Clock size={14} /> {pendingCount} Pending</>
               ) : (
                 <><CheckCircle size={14} /> Synced</>
               )}
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Register Modal */}
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </div>
  );
};