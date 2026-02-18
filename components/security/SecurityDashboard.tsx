import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertOctagon, UserX, Unlock } from 'lucide-react';
import { auditService } from '../../services/firebase/audit';
import { settingsService } from '../../services/settings/settingsService';
import { Employee } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../common/Button';

export const SecurityDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<{
    failedLogins: number;
    accountLocks: number;
    voids: number;
    lockedAccounts: Employee[];
  } | null>(null);

  const loadMetrics = async () => {
    const data = await auditService.getSecurityMetrics();
    setMetrics(data);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleUnlock = async (empId: string) => {
    if (!user) return;
    if (confirm('Unlock this account?')) {
      await settingsService.unlockEmployee(empId, user.id);
      loadMetrics();
    }
  };

  if (!metrics) return <div>Loading security metrics...</div>;

  return (
    <div className="space-y-6 mb-8">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Shield size={20} className="text-blue-600" /> Security Dashboard (Today)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <Lock size={24} />
          </div>
          <div>
             <p className="text-sm text-red-800 font-medium">Failed Logins</p>
             <h3 className="text-2xl font-bold text-red-900">{metrics.failedLogins}</h3>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
            <UserX size={24} />
          </div>
          <div>
             <p className="text-sm text-orange-800 font-medium">Account Lockouts</p>
             <h3 className="text-2xl font-bold text-orange-900">{metrics.accountLocks}</h3>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <AlertOctagon size={24} />
          </div>
          <div>
             <p className="text-sm text-yellow-800 font-medium">Void Transactions</p>
             <h3 className="text-2xl font-bold text-yellow-900">{metrics.voids}</h3>
          </div>
        </div>
      </div>

      {/* Locked Accounts List */}
      {metrics.lockedAccounts.length > 0 && (
        <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-3 border-b border-red-200 flex justify-between items-center">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <Lock size={16} /> Locked Accounts Action Required
            </h3>
          </div>
          <div className="p-0">
             <table className="w-full text-left text-sm">
               <thead className="bg-gray-50 border-b">
                 <tr>
                   <th className="px-6 py-3">Employee</th>
                   <th className="px-6 py-3">Role</th>
                   <th className="px-6 py-3 text-right">Action</th>
                 </tr>
               </thead>
               <tbody>
                 {metrics.lockedAccounts.map(acc => (
                   <tr key={acc.id} className="border-b last:border-0">
                     <td className="px-6 py-4 font-medium">{acc.name}</td>
                     <td className="px-6 py-4 capitalize">{acc.role}</td>
                     <td className="px-6 py-4 text-right">
                       <Button size="sm" variant="secondary" onClick={() => handleUnlock(acc.id!)} className="gap-2">
                         <Unlock size={14} /> Unlock
                       </Button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
};