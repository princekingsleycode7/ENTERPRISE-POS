import React, { useState, useEffect } from 'react';
import { Download, Search, Filter, ShieldAlert } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/useAuthStore';
import { auditService } from '../services/firebase/audit';
import { AuditLog } from '../types';
import { SecurityDashboard } from '../components/security/SecurityDashboard';

export const AuditLogs: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getLogs({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        action: actionFilter,
        limit: 100
      });
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate, actionFilter]);

  const exportCSV = () => {
    const headers = ['Timestamp', 'Employee', 'Action', 'Resource', 'IP Address', 'Details'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.employee_name || l.employee_id,
      l.action,
      l.resource,
      l.ip_address || 'unknown',
      JSON.stringify(l.details).replace(/,/g, ';') // Simple escape for CSV
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!hasPermission('view_audit_logs')) {
    return <div className="p-8 text-center text-gray-500">Access Denied</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-screen flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs & Security</h1>
          <p className="text-gray-500">Monitor system activity and security events.</p>
        </div>
        <Button variant="secondary" onClick={exportCSV} className="gap-2">
           <Download size={18} /> Export CSV
        </Button>
      </div>

      <SecurityDashboard />

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
           <input 
             type="date"
             className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={startDate}
             onChange={e => setStartDate(e.target.value)}
           />
        </div>

        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
           <input 
             type="date"
             className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={endDate}
             onChange={e => setEndDate(e.target.value)}
           />
        </div>

        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
           <select 
             className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={actionFilter}
             onChange={e => setActionFilter(e.target.value)}
           >
             <option value="all">All Actions</option>
             <option value="LOGIN_SUCCESS">Login Success</option>
             <option value="LOGIN_FAILED">Login Failed</option>
             <option value="VOID_TRANSACTION">Void Transaction</option>
             <option value="UPDATE_SETTINGS">Settings Change</option>
             <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
           </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-600">Timestamp</th>
                <th className="px-6 py-4 font-medium text-gray-600">Employee</th>
                <th className="px-6 py-4 font-medium text-gray-600">Action</th>
                <th className="px-6 py-4 font-medium text-gray-600">Resource</th>
                <th className="px-6 py-4 font-medium text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                 <tr><td colSpan={5} className="text-center py-10">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                 <tr><td colSpan={5} className="text-center py-10 text-gray-500">No logs found for this period.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                       {log.employee_name || log.employee_id}
                       <div className="text-xs text-gray-400 font-mono">{log.ip_address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action.includes('FAILED') || log.action.includes('VOID') ? 'bg-red-100 text-red-700' :
                        log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={log.resource}>
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-mono max-w-md truncate" title={JSON.stringify(log.details, null, 2)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};