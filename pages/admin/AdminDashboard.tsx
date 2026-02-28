import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/useAdminAuthStore';
import { Merchant, PlatformInvoice } from '../../types';
import { updateDocument, queryDocuments } from '../../services/firebase/firestore';
import { getMerchant } from '../../services/merchant/merchantService';
import { LogOut, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuthStore();
  
  // State
  const [inactiveMerchants, setInactiveMerchants] = useState<Merchant[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingMerchant, setActivatingMerchant] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all merchants and filter inactive ones
      const allMerchants = await queryDocuments('merchants', []);
      const inactive = (allMerchants as any[]).filter(m => !m.isActive);
      setInactiveMerchants(inactive);

      // Fetch unpaid invoices
      const allInvoices = await queryDocuments('platform_invoices', []);
      const unpaid = (allInvoices as any[])
        .filter(inv => inv.status === 'unpaid')
        .sort((a, b) => {
          const dateA = a.periodEnd?.toDate?.() || new Date(a.periodEnd);
          const dateB = b.periodEnd?.toDate?.() || new Date(b.periodEnd);
          return dateB.getTime() - dateA.getTime();
        });
      setUnpaidInvoices(unpaid);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMerchant = async (merchantId: string) => {
    try {
      setActivatingMerchant(merchantId);
      setError('');

      if (!user) {
        setError('User not authenticated');
        return;
      }

      await updateDocument('merchants', merchantId, {
        isActive: true,
        activatedAt: new Date().toISOString(),
        activatedBy: user.uid
      });

      setSuccessMessage(`Merchant account activated successfully!`);
      
      // Refresh list
      await fetchData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error activating merchant:', err);
      setError('Failed to activate merchant account');
    } finally {
      setActivatingMerchant(null);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      setMarkingPaid(invoiceId);
      setError('');

      await updateDocument('platform_invoices', invoiceId, {
        status: 'paid',
        paidAt: new Date().toISOString()
      });

      setSuccessMessage('Invoice marked as paid!');
      
      // Refresh list
      await fetchData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error marking invoice paid:', err);
      setError('Failed to update invoice status');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatDate = (date: any): string => {
    try {
      const d = date?.toDate?.() || new Date(date);
      return new Date(d).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm mt-1">Welcome, {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel A: Inactive Merchants */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Pending Merchant Activations
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {inactiveMerchants.length} merchant{inactiveMerchants.length !== 1 ? 's' : ''} awaiting activation
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {inactiveMerchants.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No inactive merchants</p>
                </div>
              ) : (
                inactiveMerchants.map((merchant) => (
                  <div key={merchant.id} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900">{merchant.businessName}</h3>
                      <div className="text-sm text-gray-600 space-y-1 mt-2">
                        <p>📧 {merchant.ownerEmail}</p>
                        <p>📱 {merchant.phone}</p>
                        <p className="text-xs text-gray-500">
                          Requested: {formatDate(merchant.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => merchant.id && handleActivateMerchant(merchant.id)}
                      disabled={activatingMerchant === merchant.id}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded transition text-sm font-medium"
                    >
                      {activatingMerchant === merchant.id ? 'Activating...' : 'Activate Account'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel B: Unpaid Invoices */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Outstanding Invoices
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {unpaidInvoices.length} invoice{unpaidInvoices.length !== 1 ? 's' : ''} pending payment
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {unpaidInvoices.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No outstanding invoices</p>
                </div>
              ) : (
                unpaidInvoices.map((invoice) => (
                  <div key={invoice.id} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900">{invoice.businessName}</h3>
                      <div className="text-sm text-gray-600 space-y-1 mt-2">
                        <p>
                          Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                        </p>
                        <p>{invoice.transactionCount} transactions</p>
                        <p className="font-semibold text-gray-900">
                          Sales: {formatCurrency(invoice.totalSalesValue)}
                        </p>
                        <p className="font-bold text-blue-600">
                          Fee Owed: {formatCurrency(invoice.totalPlatformFee)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => invoice.id && handleMarkInvoicePaid(invoice.id)}
                      disabled={markingPaid === invoice.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded transition text-sm font-medium"
                    >
                      {markingPaid === invoice.id ? 'Updating...' : 'Mark as Paid'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
