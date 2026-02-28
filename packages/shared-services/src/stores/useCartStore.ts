import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartState, Product, HoldTransaction } from '../types';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      heldTransactions: [],
      taxRate: 0.075, // Default 7.5%

      setTaxRate: (rate: number) => set({ taxRate: rate }),

      addToCart: (product: Product) => {
        const { items } = get();
        const existingItem = items.find(item => item.id === product.id);
        const currentQty = existingItem ? existingItem.quantity : 0;
        
        if (currentQty + 1 > product.stock_quantity) {
          return false; // Out of stock
        }

        if (existingItem) {
          set({
            items: items.map(item =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          });
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] });
        }
        return true;
      },

      removeFromCart: (productId) => {
        set({ items: get().items.filter(item => item.id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        const { items } = get();
        const item = items.find(i => i.id === productId);
        if (!item) return;

        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        if (quantity > item.stock_quantity) {
          // Cannot exceed stock
          // Optionally we could return false here to indicate failure to UI
          return;
        }

        set({
          items: items.map(item =>
            item.id === productId ? { ...item, quantity } : item
          )
        });
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      holdTransaction: (note) => {
        const { items, heldTransactions } = get();
        if (items.length === 0) return;

        const hold: HoldTransaction = {
          id: `HOLD-${Date.now()}`,
          items: [...items],
          timestamp: Date.now(),
          note
        };

        set({
          heldTransactions: [...heldTransactions, hold],
          items: []
        });
      },

      retrieveTransaction: (id) => {
        const { heldTransactions } = get();
        const hold = heldTransactions.find(h => h.id === id);
        if (!hold) return;

        // Overwrite current cart
        set({
          items: hold.items,
          heldTransactions: heldTransactions.filter(h => h.id !== id)
        });
      },

      discardHeldTransaction: (id) => {
         set({
            heldTransactions: get().heldTransactions.filter(h => h.id !== id)
         });
      }
    }),
    {
      name: 'pos-cart-storage',
      partialize: (state) => ({ 
        items: state.items,
        heldTransactions: state.heldTransactions 
      }),
    }
  )
);
