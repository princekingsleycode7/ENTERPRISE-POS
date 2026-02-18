import { ENV } from '../../config/env';

interface KorapayConfig {
  key: string;
  reference: string;
  amount: number;
  currency: string;
  customer: {
    name: string;
    email: string;
  };
  notification_url?: string;
  channels?: string[];
  onSuccess: (data: any) => void;
  onClose: () => void;
  onFailed?: (data: any) => void;
}

// Declare window interface for Korapay
declare global {
  interface Window {
    Korapay: {
      initialize: (config: KorapayConfig) => void;
    };
  }
}

export const korapayService = {
  isScriptLoaded: false,

  loadScript: (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (korapayService.isScriptLoaded || window.Korapay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';
      script.async = true;
      script.onload = () => {
        korapayService.isScriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        console.error("Failed to load Korapay script");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  },

  /**
   * Initialize a payment using Korapay Modal
   */
  initializePayment: async (params: {
    amount: number;
    reference: string;
    customerEmail?: string;
    customerName?: string;
    channels?: string[]; // ['card', 'bank_transfer', 'mobile_money']
    onSuccess: (response: any) => void;
    onClose: () => void;
  }) => {
    const loaded = await korapayService.loadScript();
    if (!loaded || !window.Korapay) {
      alert("Payment gateway failed to load. Please check internet connection.");
      params.onClose();
      return;
    }

    // Ensure amount is valid
    if (params.amount <= 0) {
      console.error("Invalid amount");
      return;
    }

    window.Korapay.initialize({
      key: ENV.KORAPAY.PUBLIC_KEY,
      reference: params.reference,
      amount: params.amount,
      currency: 'NGN', // Default to NGN for Korapay
      customer: {
        name: params.customerName || 'Guest Customer',
        email: params.customerEmail || 'guest@example.com',
      },
      channels: params.channels || ['card', 'bank_transfer'],
      onSuccess: (data) => {
        console.log('Korapay Success:', data);
        params.onSuccess(data);
      },
      onClose: () => {
        console.log('Korapay Modal Closed');
        params.onClose();
      }
    });
  },

  /**
   * Helper to generate a unique transaction reference
   */
  generateReference: (): string => {
    return `KORA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
};