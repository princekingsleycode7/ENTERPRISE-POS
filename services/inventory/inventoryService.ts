import { addDocument, updateDocument, deleteDocument, getDocuments } from '../firebase/firestore';
import { offlineDB } from '../offline/db';
import { Product, AuditLog } from '../../types';
import { logAuditAction } from '../firebase/audit';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const inventoryService = {
  // Add a new product
  async addProduct(product: Omit<Product, 'id'>) {
    try {
      // 1. Add to Firebase (offline SDK handles queueing)
      const newDoc = await addDocument('products', {
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. Add to Dexie for immediate local UI update
      await offlineDB.products.put({ ...product, id: newDoc.id });
      
      return newDoc.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  },

  // Update an existing product
  async updateProduct(id: string, updates: Partial<Product>) {
    try {
      const updatedData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // 1. Update Firebase
      await updateDocument('products', id, updatedData);

      // 2. Update Dexie
      await offlineDB.products.update(id, updatedData);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete a product
  async deleteProduct(id: string) {
    try {
      await deleteDocument('products', id);
      await offlineDB.products.delete(id);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Adjust stock level
  async adjustStock(
    productId: string, 
    adjustment: number, 
    reason: string, 
    employeeId: string,
    currentStock: number
  ) {
    try {
      const newStock = currentStock + adjustment;
      if (newStock < 0) throw new Error("Stock cannot be negative");

      // Update Product
      await this.updateProduct(productId, { stock_quantity: newStock });

      // Log Audit
      const auditDetails = {
        previous_stock: currentStock,
        new_stock: newStock,
        adjustment,
        reason
      };

      await logAuditAction('STOCK_ADJUSTMENT', `Product:${productId}`, auditDetails);
      
      // Also save audit to local DB for redundancy
      await offlineDB.audit_logs.add({
        employee_id: employeeId,
        action: 'STOCK_ADJUSTMENT',
        resource: productId,
        timestamp: new Date().toISOString(),
        details: auditDetails
      });

    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  },

  // Get product by SKU
  async getProductBySKU(sku: string): Promise<Product | null> {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('sku', '==', sku));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.docs.length > 0) {
        const doc = querySnapshot.docs[0];
        return {
          ...doc.data(),
          firebaseId: doc.id,
          id: doc.id
        } as Product;
      }

      return null;
    } catch (error) {
      console.error('Error getting product by SKU:', error);
      return null;
    }
  },

  // Get all products
  async getAllProducts(): Promise<Product[]> {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseId: doc.id,
        id: doc.id
      })) as Product[];
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  },

  // Get products by category
  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('category', '==', category));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseId: doc.id,
        id: doc.id
      })) as Product[];
    } catch (error) {
      console.error('Error getting products by category:', error);
      return [];
    }
  },

  // Get low stock products
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);

      return querySnapshot.docs
        .map(doc => ({
          ...doc.data(),
          firebaseId: doc.id,
          id: doc.id
        }))
        .filter(product => product.stock_quantity <= product.reorder_level) as Product[];
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return [];
    }
  }
};