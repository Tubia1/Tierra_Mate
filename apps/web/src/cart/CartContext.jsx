import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'tierra-mate-cart';
const CartContext = createContext(null);

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => {
      const extras = item.personalizations.reduce((total, option) => total + Number(option.extraPrice || 0), 0);
      return sum + ((Number(item.price) + extras) * item.quantity);
    }, 0),
    addItem(item) {
      setItems((current) => {
        const existing = current.find((entry) => String(entry.variantId) === String(item.variantId));
        if (!existing) return [...current, item];
        return current.map((entry) => String(entry.variantId) === String(item.variantId)
          ? { ...item, quantity: Math.min(entry.quantity + item.quantity, item.stock) }
          : entry);
      });
    },
    updateQuantity(variantId, quantity) {
      setItems((current) => current.map((item) => String(item.variantId) === String(variantId)
        ? { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, item.stock)) }
        : item));
    },
    removeItem(variantId) {
      setItems((current) => current.filter((item) => String(item.variantId) !== String(variantId)));
    },
    clearCart() { setItems([]); },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart debe usarse dentro de CartProvider');
  return value;
}
