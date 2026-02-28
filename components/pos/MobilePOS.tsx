import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDB } from '../../services/offline/db';
import { useCartStore } from '../../stores/useCartStore';
import { Bell, Menu, Search, MoreVertical } from 'lucide-react';
import { Product } from '../../types';
import { MobileCart } from './MobileCart';

interface MobilePOSProps {
  showCart?: boolean;
}

export const MobilePOS: React.FC<MobilePOSProps> = ({ showCart = false }) => {
  const products = useLiveQuery(() => offlineDB.products.toArray());
  const { addToCart, items } = useCartStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [displayCart, setDisplayCart] = useState(showCart);
  
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
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      
      if (currentTime - lastKeyTime.current > 100) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 0) {
          const code = barcodeBuffer.current;
          barcodeBuffer.current = '';
          
          const product = products?.find(p => p.sku === code);
          if (product) {
            handleProductClick(product);
            setLastScannedCode(code);
            setTimeout(() => setLastScannedCode(''), 2000);
          } else {
            console.log(`Product with SKU ${code} not found`);
          }
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  if (displayCart) {
    return <MobileCart onBack={() => setDisplayCart(false)} />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Menu className="text-blue-600" size={24} />
          </button>
          <h1 className="text-lg font-bold">New Sale</h1>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Bell className="text-slate-500" size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">JD</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Category Filter (Horizontal Scroll) */}
        <div className="px-4 py-2 overflow-x-auto flex gap-2 no-scrollbar pb-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Product Grid */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Search className="w-16 h-16 mb-4 text-slate-200" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock_quantity <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => !isOutOfStock && handleProductClick(product)}
                  disabled={isOutOfStock}
                  className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 group active:scale-95 transition-transform ${
                    isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="relative h-32 bg-slate-100 dark:bg-slate-700">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl font-light">
                        {product.name.charAt(0)}
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isOutOfStock ? 'bg-red-500' :
                      product.stock_quantity <= product.reorder_level ? 'bg-orange-500' :
                      'bg-green-500'
                    }`}>
                      {isOutOfStock ? 'OUT OF STOCK' : `${product.stock_quantity} IN STOCK`}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-slate-400 font-medium">SKU: {product.sku}</p>
                    <h3 className="text-sm font-bold truncate text-slate-900 dark:text-white">{product.name}</h3>
                    <p className="text-blue-600 font-bold mt-1">${product.price.toFixed(2)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-2 shadow-lg max-w-md mx-auto">
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center p-2 text-blue-600">
            <span className="material-icons">point_of_sale</span>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">POS</span>
          </button>
          <button className="flex flex-col items-center p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <span className="material-icons">receipt_long</span>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Transactions</span>
          </button>
          <button className="flex flex-col items-center p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <span className="material-icons">inventory_2</span>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Inventory</span>
          </button>
          <button className="flex flex-col items-center p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <span className="material-icons">analytics</span>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Reports</span>
          </button>
        </div>
      </nav>

      {/* Floating Action Button for Cart */}
      <button
        onClick={() => setDisplayCart(true)}
        className="fixed right-6 bottom-24 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform z-10"
      >
        <div className="relative">
          <span className="material-icons">shopping_cart</span>
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {items.length}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};
