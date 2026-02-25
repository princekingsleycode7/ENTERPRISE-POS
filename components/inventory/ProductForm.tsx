import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Loader } from 'lucide-react';
import { Product } from '../../types';
import { Button } from '../common/Button';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { storageService } from '../../services/firebase/storage';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: Product;
}

const CATEGORIES = [
  'Coffee', 'Bakery', 'Drinks', 'Food', 'Merchandise', 'Beans', 'Other'
];

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { addNotification } = useNotificationStore();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Coffee',
    price: 0,
    cost: 0,
    stock_quantity: 0,
    reorder_level: 10,
    description: '',
    imageUrl: '',
    barcode: ''
  });
  
  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        sku: initialData.sku,
        category: initialData.category,
        price: initialData.price,
        cost: initialData.cost,
        stock_quantity: initialData.stock_quantity,
        reorder_level: initialData.reorder_level,
        description: initialData.description || '',
        imageUrl: initialData.imageUrl || '',
        barcode: (initialData as any).barcode || ''
      });
    } else {
      // Reset for new product
      setFormData({
        name: '',
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        category: 'Coffee',
        price: 0,
        cost: 0,
        stock_quantity: 0,
        reorder_level: 10,
        description: '',
        imageUrl: '',
        barcode: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (formData.price < 0) newErrors.price = 'Price cannot be negative';
    if (formData.cost < 0) newErrors.cost = 'Cost cannot be negative';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      addNotification('error', 'Please fix the errors in the form.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      addNotification('success', `Product ${initialData ? 'updated' : 'created'} successfully!`);
      onClose();
    } catch (error) {
      console.error(error);
      addNotification('error', 'Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Use Firebase ID if available, otherwise use SKU
      const productId = initialData?.firebaseId || initialData?.id || formData.sku;
      
      // Upload to Cloud Storage
      const downloadUrl = await storageService.uploadProductImage(file, String(productId));
      
      // Replace old image if updating
      if (initialData?.imageUrl && initialData.imageUrl !== downloadUrl) {
        await storageService.deleteProductImage(initialData.imageUrl).catch(err => {
          console.warn('Failed to delete old image:', err);
        });
      }
      
      setFormData({ ...formData, imageUrl: downloadUrl });
      addNotification('success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      addNotification('error', error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const getInputClass = (field: string) => 
    `w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
      errors[field] ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={getInputClass('name')}
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({...errors, name: ''});
                  }}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={getInputClass('sku')}
                  value={formData.sku}
                  onChange={e => {
                    setFormData({ ...formData, sku: e.target.value });
                    if (errors.sku) setErrors({...errors, sku: ''});
                  }}
                />
                 {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  <input
                    list="categories"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  />
                  <datalist id="categories">
                    {CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className={`${getInputClass('price')} pl-7`}
                      value={formData.price}
                      onChange={e => {
                        setFormData({ ...formData, price: parseFloat(e.target.value) });
                        if (errors.price) setErrors({...errors, price: ''});
                      }}
                    />
                  </div>
                   {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className={`${getInputClass('cost')} pl-7`}
                      value={formData.cost}
                      onChange={e => {
                        setFormData({ ...formData, cost: parseFloat(e.target.value) });
                        if (errors.cost) setErrors({...errors, cost: ''});
                      }}
                    />
                  </div>
                   {errors.cost && <p className="text-xs text-red-500 mt-1">{errors.cost}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!!initialData}
                    className={`w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none ${initialData ? 'bg-gray-100 text-gray-500' : ''}`}
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.reorder_level}
                    onChange={e => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="sr-only"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                      uploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader size={18} className="animate-spin text-blue-500" />
                        <span className="text-sm text-gray-600">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {formData.imageUrl ? 'Change image' : 'Click to upload image'}
                        </span>
                      </>
                    )}
                  </label>
                </div>
                {formData.imageUrl && (
                  <p className="text-xs text-gray-500 mt-2 truncate">Image uploaded: {formData.imageUrl.split('/').pop()}</p>
                )}
              </div>
              {formData.imageUrl && (
                <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode / UPC</label>
              <input
                type="text"
                placeholder="e.g., 1234567890123"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Assign barcode/UPC code to this product</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g., Single shot espresso"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};