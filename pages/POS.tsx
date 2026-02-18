import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDB } from '../services/offline/db';
import { useCartStore } from '../stores/useCartStore';
import { Search } from 'lucide-react';
import { Cart } from '../components/pos/Cart';
import { Product } from '../types';

export const POS: React.FC = () => {
  const products = useLiveQuery(() => offlineDB.products.toArray());
  const { addToCart } = useCartStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lastScannedCode, setLastScannedCode] = useState('');
  
  // Barcode Scanner Buffer
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // Derived Data
  const categories: string[] = useMemo(() => {
    if (!products) return ['All'];
    return ['All', ...Array.from(new Set(products.map(p => p.category))).sort()] as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(lowerSearch) || 
        p.sku.toLowerCase().includes(lowerSearch);
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleProductClick = (product: Product) => {
    const success = addToCart(product);
    if (!success) {
      alert(`Out of stock: ${product.name}`);
    }
  };

  // Barcode Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a text input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      
      // If time between keystrokes is long, reset buffer (it's manual typing, not scanner)
      if (currentTime - lastKeyTime.current > 100) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 0) {
          const code = barcodeBuffer.current;
          barcodeBuffer.current = '';
          
          // Attempt to find product by SKU
          const product = products?.find(p => p.sku === code);
          if (product) {
            handleProductClick(product);
            setLastScannedCode(code);
            // Clear message after 2 seconds
            setTimeout(() => setLastScannedCode(''), 2000);
          } else {
             // Optional: Play error sound
             console.log(`Product with SKU ${code} not found`);
          }
        }
      } else if (e.key.length === 1) {
        // Printable characters only
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, addToCart]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Left Panel: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <div className="bg-white p-4 border-b border-gray-200 shadow-sm z-10">
           <div className="flex gap-4">
             <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products (Name, SKU)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
             </div>
             {lastScannedCode && (
               <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-lg text-sm font-medium animate-pulse">
                 Scanned: {lastScannedCode}
               </div>
             )}
           </div>

           {/* Categories Tabs */}
           <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                 <Search size={32} />
               </div>
               <p>No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock_quantity <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => !isOutOfStock && handleProductClick(product)}
                    disabled={isOutOfStock}
                    className={`
                      relative group flex flex-col text-left bg-white rounded-xl border transition-all duration-200
                      ${isOutOfStock 
                        ? 'opacity-60 border-gray-200 cursor-not-allowed' 
                        : 'border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 active:scale-[0.98]'
                      }
                    `}
                  >
                    {/* Image Placeholder */}
                    <div className="aspect-[4/3] w-full bg-gray-100 rounded-t-xl overflow-hidden relative">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-light select-none">
                          {product.name.charAt(0)}
                        </div>
                      )}
                      
                      {/* Stock Badge */}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm ${
                         isOutOfStock ? 'bg-red-500 text-white' : 
                         product.stock_quantity <= product.reorder_level ? 'bg-orange-400 text-white' : 'bg-white/90 text-gray-700 backdrop-blur-sm'
                      }`}>
                         {isOutOfStock ? 'Out of Stock' : `${product.stock_quantity} Left`}
                      </div>
                    </div>

                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-xs text-gray-500 mb-2 font-mono">{product.sku}</p>
                      <div className="mt-auto">
                        <span className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <div className="w-[400px] min-w-[350px] relative z-20">
         <Cart />
      </div>
    </div>
  );
};