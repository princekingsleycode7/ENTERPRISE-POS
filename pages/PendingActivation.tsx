import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const PendingActivation: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-gray-800">Account Pending Activation</h1>
        </div>

        {/* Main Message */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-gray-700 text-center">
            Your merchant account is pending activation. To access the POS system, please complete the 
            <span className="font-bold"> ₦25,000 setup payment</span>.
          </p>
        </div>

        {/* Contact Information */}
        <div className="space-y-4 mb-8">
          <div className="border-t pt-4">
            <h2 className="font-semibold text-gray-800 mb-3">Contact Support</h2>
            <div className="space-y-2 text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-lg">💬</span>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <a 
                    href="https://wa.me/2347012345678" 
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    +234 701 234 5678
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">📧</span>
                <div>
                  <p className="font-medium">Email</p>
                  <a 
                    href="mailto:support@enterprisepos.com" 
                    className="text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    support@enterprisepos.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-blue-50 p-4 rounded mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">What's Next?</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Contact our support team via WhatsApp or Email</li>
            <li>Complete the setup payment of ₦25,000</li>
            <li>Receive activation confirmation</li>
            <li>Log back in to access your POS system</li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
};
