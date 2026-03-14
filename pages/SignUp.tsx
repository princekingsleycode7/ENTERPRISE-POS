import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { setDocument } from '../services/firebase/firestore';
import { pinAuth } from '../services/auth/pinAuth';

export const SignUp: React.FC = () => {
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (pin.length !== 4 || !/^\d+$/.test(pin)) {
            setError('PIN must be exactly 4 digits.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Create Firebase Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. Create Merchants Document
            // We set specific fields; we'll also temporarily make sure merchant_id inject doesn't override uid
            localStorage.setItem('bound_merchant_id', uid);
            await setDocument('merchants', uid, {
                isActive: true, // Auto-activate for now, or could require platform admin approval
                businessName,
                ownerEmail: email,
                createdAt: new Date().toISOString()
            });

            // 3. Create Admin Employee Document
            const pinHash = await pinAuth.hashPIN(pin);
            await setDocument('employees', uid, {
                name: 'Store Admin',
                role: 'admin',
                pin_hash: pinHash,
                active: true,
                merchant_id: uid,
                created_at: new Date().toISOString(),
                access_level: 10
            });

            // 4. Redirect to login
            navigate('/login');

        } catch (err: any) {
            console.error('Signup error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists.');
            } else {
                setError(err.message || 'Failed to create account. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Store className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Register New Store</h1>
                    <p className="text-slate-500 text-center mt-2">
                        Create an admin account to set up your multi-tenant store profile.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Business Name
                        </label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                            placeholder="My Awesome Store"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Admin Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                            placeholder="admin@mystore.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Account Password (For Device Setup)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            4-Digit POS PIN (For Cashier Login)
                        </label>
                        <input
                            type="password"
                            pattern="\d*"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                            placeholder="1234"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 mt-6"
                    >
                        {isLoading ? (
                            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <>
                                <UserPlus className="w-5 h-5" />
                                Register Store
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-sm text-slate-600">
                        Already registered?{' '}
                        <button
                            onClick={() => navigate('/device-setup')}
                            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            Bind Device Here
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
