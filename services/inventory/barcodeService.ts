/**
 * services/inventory/barcodeService.ts
 * 
 * Barcode/UPC scanning and management
 * Uses jsbarcode library for generating barcodes
 */

import { Product } from '../../types';
import { inventoryService } from './inventoryService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface BarcodeData {
  ean13?: string;
  upca?: string;
  upce?: string;
  code128?: string;
  code39?: string;
  [key: string]: string | undefined;
}

export const barcodeService = {
  /**
   * Scan/lookup product by barcode
   * @param barcodeValue - Barcode value scanned from device
   * @returns Product data if found
   */
  scanBarcode: async (barcodeValue: string): Promise<Product | null> => {
    if (!barcodeValue || barcodeValue.trim().length === 0) {
      throw new Error('Barcode cannot be empty');
    }

    try {
      // Search by barcode in the barcode field
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('barcode', '==', barcodeValue.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.docs.length > 0) {
        const doc = querySnapshot.docs[0];
        const product = {
          ...doc.data(),
          firebaseId: doc.id,
          id: doc.id
        } as Product;
        return product;
      }

      // Fallback: search by SKU if barcode not found
      const skuQuery = query(productsRef, where('sku', '==', barcodeValue.trim()));
      const skuSnapshot = await getDocs(skuQuery);

      if (skuSnapshot.docs.length > 0) {
        const doc = skuSnapshot.docs[0];
        const product = {
          ...doc.data(),
          firebaseId: doc.id,
          id: doc.id
        } as Product;
        return product;
      }

      return null;
    } catch (error) {
      console.error('Barcode scan error:', error);
      throw new Error(`Failed to scan barcode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Update product barcode
   * @param productId - Product ID
   * @param barcodeValue - New barcode value
   */
  updateProductBarcode: async (productId: string, barcodeValue: string): Promise<void> => {
    if (!barcodeValue || barcodeValue.trim().length === 0) {
      throw new Error('Barcode cannot be empty');
    }

    // Check if barcode already exists
    const existing = await barcodeService.scanBarcode(barcodeValue);
    if (existing && existing.id !== productId) {
      throw new Error(`Barcode already assigned to product: ${existing.name}`);
    }

    try {
      await inventoryService.updateProduct(productId, {
        barcode: barcodeValue.trim(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update barcode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Generate barcode image data (URL-based)
   * Uses JsBarcode library (needs to be added to project)
   * 
   * For production, consider using:
   * - jsbarcode npm package
   * - barcode.tec-it.com API
   * - Your own barcode generation service
   */
  generateBarcodeDataURL: async (
    barcodeValue: string,
    format: 'code128' | 'ean13' | 'upca' = 'code128',
    options?: any
  ): Promise<string> => {
    // Using tec-it.com free barcode API as fallback
    // For production, use jsbarcode library instead:
    // import JsBarcode from 'jsbarcode';
    // const canvas = document.createElement('canvas');
    // JsBarcode(canvas, barcodeValue, { format });
    // return canvas.toDataURL();

    const encodedValue = encodeURIComponent(barcodeValue);
    const url = `https://barcode.tec-it.com/barcode.ashx?data=${encodedValue}&code=${format.toUpperCase()}`;
    return url;
  },

  /**
   * Check if barcode is valid (basic validation)
   * Supports EAN-13, UPC-A, UPC-E, CODE128, CODE39
   */
  validateBarcode: (barcodeValue: string, format?: string): boolean => {
    if (!barcodeValue || barcodeValue.trim().length === 0) {
      return false;
    }

    const value = barcodeValue.trim();

    // Basic format validation
    if (format === 'ean13') {
      return /^\d{13}$/.test(value) && barcodeService.validateEAN13Checksum(value);
    } else if (format === 'upca') {
      return /^\d{12}$/.test(value);
    } else if (format === 'upce') {
      return /^\d{6,8}$/.test(value);
    } else if (format === 'code128') {
      return /^[\x00-\x7F]{1,}$/.test(value); // ASCII characters only
    } else if (format === 'code39') {
      return /^[A-Z0-9\s\-\.\/\+\%\$]{1,}$/.test(value);
    }

    // Default: alphanumeric only
    return /^[a-zA-Z0-9\-_]{1,}$/.test(value);
  },

  /**
   * Validate EAN-13 checksum
   */
  validateEAN13Checksum: (ean: string): boolean => {
    if (!/^\d{13}$/.test(ean)) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean[i]);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(ean[12]);
  },

  /**
   * Generate EAN-13 checksum for a 12-digit code
   */
  generateEAN13Checksum: (ean12: string): string => {
    if (!/^\d{12}$/.test(ean12)) {
      throw new Error('EAN-12 must be exactly 12 digits');
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean12[i]);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return ean12 + checkDigit;
  },

  /**
   * List all products with barcode assigned
   */
  getProductsWithBarcode: async (): Promise<Product[]> => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('barcode', '!=', null));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseId: doc.id,
        id: doc.id
      })) as Product[];
    } catch (error) {
      console.error('Error fetching products with barcode:', error);
      return [];
    }
  },

  /**
   * Bulk assign barcodes from CSV-like data
   * Format: SKU, BARCODE
   */
  bulkAssignBarcodes: async (data: Array<{ sku: string; barcode: string }>): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const item of data) {
      try {
        if (!item.sku || !item.barcode) {
          results.failed++;
          results.errors.push(`Missing SKU or barcode for row`);
          continue;
        }

        const product = await inventoryService.getProductBySKU(item.sku);
        if (!product) {
          results.failed++;
          results.errors.push(`Product not found with SKU: ${item.sku}`);
          continue;
        }

        if (!barcodeService.validateBarcode(item.barcode)) {
          results.failed++;
          results.errors.push(`Invalid barcode format for ${item.sku}: ${item.barcode}`);
          continue;
        }

        await barcodeService.updateProductBarcode(product.firebaseId || product.id as string, item.barcode);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Error assigning barcode to ${item.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }
};
