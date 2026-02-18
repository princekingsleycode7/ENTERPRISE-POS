import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { Lock } from 'lucide-react';
import { NumPad } from '../components/auth/NumPad';

export const Login: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) return;

    const result = await login(pin);
    if (result === true) {
      navigate('/pos');
    } else {
      // result is either false or an error string
      setError(typeof result === 'string' ? result : 'Invalid PIN.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ModernPOS</h2>
          <p className="text-gray-500 mb-8">Enter your 4-digit PIN</p>

          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-colors ${
                  i < pin.length ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-6 animate-pulse">{error}</p>
          )}

          <NumPad 
            onNumberClick={handleNumberClick}
            onClear={handleClear}
            onEnter={handleSubmit}
          />
          
          <div className="mt-6 text-xs text-gray-400">
             <p>Default Admin PIN: 1234</p>
          </div>
        </div>
      </div>
    </div>
  );
};