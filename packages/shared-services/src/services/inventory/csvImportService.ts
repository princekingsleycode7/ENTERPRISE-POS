/**
 * services/inventory/csvImportService.ts
 * 
 * Handles batch product imports from CSV files
 * Supports both full product data and quick inventory updates
 */

import { Product } from '../../types';
import { inventoryService } from './inventoryService';
import { db } from '../firebase/config';
import { collection, writeBatch, doc } from 'firebase/firestore';

export interface CSVImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{
    rowNumber: number;
    reason: string;
    data?: any;
  }>;
  message: string;
}

export interface CSVProductRow {
  name: string;
  sku: string;
  category?: string;
  price: string | number;
  cost?: string | number;
  stock_quantity?: string | number;
  reorder_level?: string | number;
  description?: string;
  imageUrl?: string;
  barcode?: string;
}

export const csvImportService = {
  /**
   * Parse CSV file and import products
   */
  importFromCSV: async (file: File): Promise<CSVImportResult> => {
    const result: CSVImportResult = {
      success: false,
      totalRows: 0,
      importedCount: 0,
      skippedCount: 0,
      errors: [],
      message: ''
    };

    try {
      const text = await file.text();
      const rows = csvImportService.parseCSV(text);
      result.totalRows = rows.length;

      if (rows.length === 0) {
        result.message = 'CSV file is empty';
        return result;
      }

      // Process in batches of 500 (Firestore limit is 500 per batch)
      const batchSize = 500;
      const batches = Math.ceil(rows.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batchRows = rows.slice(i * batchSize, (i + 1) * batchSize);
        await csvImportService.processBatch(batchRows, result, i * batchSize);
      }

      result.success = result.importedCount > 0 && result.errors.length === 0;
      result.message = `Imported ${result.importedCount} products. Skipped ${result.skippedCount}.`;

      return result;
    } catch (error) {
      result.success = false;
      result.message = `Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push({
        rowNumber: 0,
        reason: result.message
      });
      return result;
    }
  },

  /**
   * Process a batch of rows using Firestore batch write
   */
  processBatch: async (
    rows: CSVProductRow[],
    result: CSVImportResult,
    startRowNumber: number
  ): Promise<void> => {
    const batch = writeBatch(db);
    const productsRef = collection(db, 'products');
    let batchHasData = false;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = startRowNumber + i + 2; // +2 because row 1 is headers
      const row = rows[i];

      try {
        // Validate required fields
        if (!row.name || !row.sku) {
          result.skippedCount++;
          result.errors.push({
            rowNumber,
            reason: 'Missing required fields: name and/or sku'
          });
          continue;
        }

        // Parse and validate data
        const product: Product & { [key: string]: any } = {
          name: String(row.name).trim(),
          sku: String(row.sku).trim(),
          category: String(row.category || 'Other').trim(),
          price: Number(row.price) || 0,
          cost: Number(row.cost) || 0,
          stock_quantity: Number(row.stock_quantity) || 0,
          reorder_level: Number(row.reorder_level) || 10,
          description: row.description ? String(row.description).trim() : '',
          imageUrl: row.imageUrl ? String(row.imageUrl).trim() : '',
          barcode: row.barcode ? String(row.barcode).trim() : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Validate price
        if (product.price < 0 || product.cost < 0) {
          result.skippedCount++;
          result.errors.push({
            rowNumber,
            reason: 'Price and cost must be non-negative',
            data: row
          });
          continue;
        }

        // Check for duplicate SKU
        const existingSKU = await csvImportService.checkSKUExists(product.sku);
        if (existingSKU) {
          result.skippedCount++;
          result.errors.push({
            rowNumber,
            reason: `SKU already exists: ${product.sku}`,
            data: row
          });
          continue;
        }

        // Add to batch
        const docRef = doc(productsRef);
        product.firebaseId = docRef.id;
        batch.set(docRef, product);
        batchHasData = true;
        result.importedCount++;
      } catch (error) {
        result.skippedCount++;
        result.errors.push({
          rowNumber,
          reason: `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: row
        });
      }
    }

    // Commit batch if it has data
    if (batchHasData) {
      await batch.commit();
    }
  },

  /**
   * Check if SKU already exists in Firebase
   */
  checkSKUExists: async (sku: string): Promise<boolean> => {
    try {
      const existing = await inventoryService.getProductBySKU(sku);
      return !!existing;
    } catch {
      return false;
    }
  },

  /**
   * Parse CSV text into rows
   * Handles quoted fields and commas within fields
   */
  parseCSV: (csvText: string): CSVProductRow[] => {
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) return []; // Need header + at least 1 data row

    // Get headers
    const headers = csvImportService.parseCSVLine(lines[0]);
    const rows: CSVProductRow[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = csvImportService.parseCSVLine(lines[i]);
      
      if (values.length === 0) continue; // Skip empty lines

      const row: any = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().trim()] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  },

  /**
   * Parse a single CSV line, handling quoted fields
   */
  parseCSVLine: (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  },

  /**
   * Generate sample CSV template for download
   */
  generateCSVTemplate: (): string => {
    const headers = [
      'name',
      'sku',
      'category',
      'price',
      'cost',
      'stock_quantity',
      'reorder_level',
      'description',
      'imageUrl',
      'barcode'
    ];

    const sampleRows = [
      ['Espresso', 'COF-ESP-001', 'Coffee', '3.50', '0.50', '100', '10', 'Single shot espresso', '', '1234567890'],
      ['Cappuccino', 'COF-CAP-001', 'Coffee', '4.50', '0.80', '80', '10', 'Espresso with steamed milk', '', '1234567891'],
      ['Croissant', 'BAK-CRO-001', 'Bakery', '2.99', '0.50', '50', '5', 'Butter croissant', '', '1234567892']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  },

  /**
   * Download CSV template as file
   */
  downloadTemplate: (): void => {
    const csvContent = csvImportService.generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Quick inventory update from CSV (SKU + stock_quantity only)
   * Useful for quick stock adjustments
   */
  quickUpdateInventory: async (file: File): Promise<CSVImportResult> => {
    const result: CSVImportResult = {
      success: false,
      totalRows: 0,
      importedCount: 0,
      skippedCount: 0,
      errors: [],
      message: ''
    };

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      if (lines.length < 2) {
        result.message = 'CSV file is empty';
        return result;
      }

      result.totalRows = lines.length - 1;

      const batch = writeBatch(db);
      const productsRef = collection(db, 'products');
      let batchHasData = false;

      // Parse lines
      for (let i = 1; i < lines.length; i++) {
        const [sku, quantity] = csvImportService.parseCSVLine(lines[i]);
        
        if (!sku || quantity === undefined) {
          result.skippedCount++;
          result.errors.push({
            rowNumber: i + 1,
            reason: 'Missing SKU or quantity'
          });
          continue;
        }

        try {
          const product = await inventoryService.getProductBySKU(sku);
          if (!product) {
            result.skippedCount++;
            result.errors.push({
              rowNumber: i + 1,
              reason: `Product not found with SKU: ${sku}`
            });
            continue;
          }

          const docRef = doc(productsRef, product.firebaseId || product.id as string);
          batch.update(docRef, {
            stock_quantity: Number(quantity),
            updated_at: new Date().toISOString()
          });
          batchHasData = true;
          result.importedCount++;
        } catch (error) {
          result.skippedCount++;
          result.errors.push({
            rowNumber: i + 1,
            reason: `Error updating stock: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      if (batchHasData) {
        await batch.commit();
      }

      result.success = result.importedCount > 0;
      result.message = `Updated ${result.importedCount} products. Skipped ${result.skippedCount}.`;
      return result;
    } catch (error) {
      result.success = false;
      result.message = `Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  }
};
