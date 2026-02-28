import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartState, Product, HoldTransaction } from '../types';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      heldTransactions: [],
      taxRate: 0.075, // Default 7.5% (legacy, used as fallback)

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
          return;
        }

        set({
          items: items.map(item =>
            item.id === productId ? { ...item, quantity } : item
          )
        });
      },

      clearCart: () => set({ items: [] }),

      /**
       * Calculate total with per-item tax classification
       * Items with tax_class === 'VAT Exempt' are taxed at 0%
       * All other items are taxed at 7.5%
       * Returns subtotal (before tax)
       */
      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      /**
       * Calculate tax amount with per-item tax classification [Phase 3]
       * VAT-exempt items (tax_class === 'VAT Exempt') are not taxed
       * Other items are taxed at 7.5%
       */
      getTax: () => {
        const items = get().items;
        return items.reduce((tax, item) => {
          const itemSubtotal = item.price * item.quantity;
          // Default to taxable unless explicitly exempt
          const isTaxExempt = item.tax_class === 'VAT Exempt';
          const taxRate = isTaxExempt ? 0 : 0.075;
          return tax + (itemSubtotal * taxRate);
        }, 0);
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