import { Merchant } from '../../types';
import { getDocument } from '../firebase/firestore';

/**
 * Merchant Service
 * Handles all merchant-level reads and account checks
 */

/**
 * Fetch a merchant document by merchantId
 * @param merchantId The unique business/merchant ID
 * @returns The merchant document or null if not found
 */
export const getMerchant = async (merchantId: string): Promise<Merchant | null> => {
  try {
    const merchant = await getDocument('merchants', merchantId);
    return merchant as Merchant | null;
  } catch (error) {
    console.error(`Error fetching merchant ${merchantId}:`, error);
    throw error;
  }
};

/**
 * Check if a merchant account is active
 * @param merchantId The unique business/merchant ID
 * @returns true if merchant is active, false otherwise
 */
export const isMerchantActive = async (merchantId: string): Promise<boolean> => {
  try {
    const merchant = await getMerchant(merchantId);
    if (!merchant) {
      console.warn(`Merchant ${merchantId} not found`);
      return false;
    }
    return merchant.isActive === true;
  } catch (error) {
    console.error(`Error checking merchant activation status for ${merchantId}:`, error);
    throw error;
  }
};

export const merchantService = {
  getMerchant,
  isMerchantActive,
};
