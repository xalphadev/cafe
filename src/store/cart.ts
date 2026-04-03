import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, SelectedOption } from "@/types";

// key for deduplication: same product + same options combination
function cartKey(productId: string, options: SelectedOption[]) {
  const optKey = options.map(o => o.optionId).sort().join(",");
  return `${productId}::${optKey}`;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
  itemUnitPrice: (item: CartItem) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const key = cartKey(newItem.productId, newItem.options ?? []);
        set((state) => {
          const existing = state.items.find(i => cartKey(i.productId, i.options ?? []) === key);
          if (existing) {
            return { items: state.items.map(i => cartKey(i.productId, i.options ?? []) === key ? { ...i, quantity: i.quantity + 1 } : i) };
          }
          return { items: [...state.items, { ...newItem, options: newItem.options ?? [], quantity: 1 }] };
        });
      },

      removeItem: (key) => set(state => ({ items: state.items.filter(i => cartKey(i.productId, i.options ?? []) !== key) })),

      updateQuantity: (key, quantity) => {
        if (quantity <= 0) { get().removeItem(key); return; }
        set(state => ({ items: state.items.map(i => cartKey(i.productId, i.options ?? []) === key ? { ...i, quantity } : i) }));
      },

      clearCart: () => set({ items: [] }),

      itemUnitPrice: (item) => item.price + (item.options ?? []).reduce((s, o) => s + o.priceAdded, 0),

      total: () => {
        const { itemUnitPrice } = get();
        return get().items.reduce((sum, item) => sum + itemUnitPrice(item) * item.quantity, 0);
      },

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "cart-storage" }
  )
);

export { cartKey };
