import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDB } from '../services/offline/db';
import { inventoryService } from '../services/inventory/inventoryService';
import { Button } from '../components/common/Button';
import { Plus, Search, Filter, AlertTriangle, Edit2, Trash2, ArrowRightLeft } from 'lucide-react';
import { Product } from '../types';
import { ProductForm } from '../components/inventory/ProductForm';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { ReauthModal } from '../components/auth/ReauthModal';
import { useAuthStore } from '../stores/useAuthStore';

export const Inventory: React.FC = () => {
  const products = useLiveQuery(() => offlineDB.products.toArray());
  const { user } = useAuthStore();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAdjustment, setPendingAdjustment] = useState<{adj: number, reason: string} | null>(null);

  // Derived Data
  const categories: string[] = useMemo(() => {
    if (!products) return ['All'];
    return ['All', ...Array.from(new Set(products.map(p => p.category)))] as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesLowStock = showLowStockOnly ? p.stock_quantity <= p.reorder_level : true;
      
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, searchTerm, selectedCategory, showLowStockOnly]);

  const lowStockCount = useMemo(() => {
    return products?.filter(p => p.stock_quantity <= p.reorder_level).length || 0;
  }, [products]);

  // Handlers
  const handleSaveProduct = async (data: any) => {
    if (editingProduct?.id) {
      await inventoryService.updateProduct(editingProduct.id as string, data);
    } else {
      await inventoryService.addProduct(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await inventoryService.deleteProduct(id);
    }
  };

  const initiateAdjustment = (product: Product) => {
    setAdjustingProduct(product);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustmentConfirm = async (adjustment: number, reason: string) => {
    // Store pending data and ask for PIN
    setPendingAdjustment({ adj: adjustment, reason });
    setIsAuthModalOpen(true);
  };

  const executeAdjustment = async () => {
    if (pendingAdjustment && adjustingProduct && user) {
      await inventoryService.adjustStock(
        adjustingProduct.id as string, 
        pendingAdjustment.adj, 
        pendingAdjustment.reason,
        user.id,
        adjustingProduct.stock_quantity
      );
      setPendingAdjustment(null);
      setAdjustingProduct(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Manage products, stock levels, and pricing.</p>
        </div>
        <Button 
          onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }} 
          className="gap-2"
        >
          <Plus size={18} />
          Add Product
        </Button>
      </div>

      {/* Metrics / Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">{lowStockCount} Products Low on Stock</h3>
              <p className="text-sm text-orange-700">Some items are below their reorder level.</p>
            </div>
          </div>
          <Button 
            variant={showLowStockOnly ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={showLowStockOnly ? "bg-orange-600 hover:bg-orange-700" : "bg-white text-orange-700 border border-orange-200 hover:bg-orange-50"}
          >
            {showLowStockOnly ? "Show All Items" : "View Low Stock Items"}
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts?.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.stock_quantity <= product.reorder_level && (
                        <span className="text-xs text-red-600 font-medium">Low Stock</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{product.sku}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">${product.cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        product.stock_quantity <= product.reorder_level 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.stock_quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => initiateAdjustment(product)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Adjust Stock"
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}
                          className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id as string)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between">
           <span>Showing {filteredProducts?.length} products</span>
           <span>Total Value: ${filteredProducts?.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Modals */}
      <ProductForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleSaveProduct}
        initialData={editingProduct}
      />
      
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        product={adjustingProduct}
        onConfirm={handleAdjustmentConfirm}
      />

      <ReauthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={executeAdjustment}
        actionName="authorize stock adjustment"
      />
    </div>
  );
};