import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogIn, KeySquare, UserPlus } from 'lucide-react';
import { adminAuthService } from '../services/admin/adminAuthService';
import { isMerchantActive } from '../services/merchant/merchantService';

export const DeviceSetup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Authenticate the store admin using Firebase Auth
            const result = await adminAuthService.signIn(email, password);

            if (!result.success) {
                throw new Error(result.error || 'Setup failed. Check credentials.');
            }

            const user = adminAuthService.getCurrentUser();
            if (!user) {
                throw new Error('Could not retrieve user details.');
            }

            const uid = user.uid;

            // Look up merchant record
            const isActive = await isMerchantActive(uid);

            // If they are a platform admin, permit them too
            const isPlatformAdmin = await adminAuthService.hasPlatformAdminRole();

            if (!isActive && !isPlatformAdmin) {
                await adminAuthService.signOut();
                throw new Error('This account is not a registered store admin.');
            }

            // Save the linked merchantId to localStorage
            localStorage.setItem('bound_merchant_id', uid);

            // Redirect to pin login screen
            navigate('/login');

        } catch (err: any) {
            setError(err.message || 'An error occurred during setup');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Store className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Device Setup</h1>
                    <p className="text-slate-500 text-center mt-2">
                        Bind this tablet or computer to a specific store using your Admin credentials.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSetup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Store Admin Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="admin@mystore.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Setup Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 mt-6"
                    >
                        {isLoading ? (
                            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <>
                                <KeySquare className="w-5 h-5" />
                                Bind Device
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
                    >
                        <LogIn className="w-4 h-4" />
                        Go to PIN Login
                    </button>
                    <button
                        onClick={() => navigate('/signup')}
                        className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Create new store account
                    </button>
                </div>
            </div>
        </div>
    );
};
