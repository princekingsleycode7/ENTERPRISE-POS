import React, { useState } from 'react';
import { Printer, CheckCircle, XCircle, Usb, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { printerService } from '../../services/printer/printerService';

export const PrinterSettings: React.FC = () => {
  const [isConnected, setIsConnected] = useState(printerService.getStatus());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const success = await printerService.connect();
      setIsConnected(success);
    } catch (err) {
      setError('Could not connect to printer. Ensure it is plugged in and you select the correct port.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await printerService.disconnect();
    setIsConnected(false);
  };

  const handleTestPrint = async () => {
    try {
      await printerService.testPrint();
    } catch (err) {
      setError('Test print failed.');
      setIsConnected(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Printer size={20} />
          Receipt Printer Configuration
        </h2>
        <p className="text-sm text-gray-500">Connect a thermal printer via USB (Web Serial).</p>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
              <Usb size={24} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {isConnected ? 'Printer Connected' : 'No Printer Connected'}
              </h3>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Ready to print receipts' : 'Connect a USB thermal printer to enable printing'}
              </p>
            </div>
          </div>
          <div>
            {isConnected ? (
              <Button variant="danger" size="sm" onClick={handleDisconnect}>Disconnect</Button>
            ) : (
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect Printer'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paper Width</label>
              <select className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50">
                 <option value="58mm">58mm (Standard)</option>
                 <option value="80mm">80mm (Wide)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Select the roll width of your thermal printer.</p>
           </div>
           
           <div className="flex items-end">
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={handleTestPrint}
                disabled={!isConnected}
              >
                Print Test Receipt
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};