import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'tierra-mate-cart';
const CartContext = createContext(null);

function trimIdentityValue(value) {
  return value == null ? '' : String(value).trim();
}

export function createCartLineId(item) {
  const personalizations = (item.personalizations ?? [])
    .map((option) => ({
      optionId: String(option.optionId),
      selectedValue: trimIdentityValue(option.selectedValue),
      customerNote: trimIdentityValue(option.customerNote),
    }))
    .sort((left, right) => left.optionId.localeCompare(right.optionId, undefined, { numeric: true }));
  return JSON.stringify({ variantId: String(item.variantId), personalizations });
}

function normalizeItem(item) {
  const personalizations = (item.personalizations ?? []).map((option) => ({
    ...option,
    selectedValue: trimIdentityValue(option.selectedValue),
    customerNote: trimIdentityValue(option.customerNote),
  }));
  const normalized = { ...item, quantity: Math.max(1, Number(item.quantity) || 1), personalizations };
  return { ...normalized, cartLineId: createCartLineId(normalized) };
}

export function normalizeCart(items) {
  if (!Array.isArray(items)) return [];
  return items.reduce((result, rawItem) => {
    if (!rawItem?.variantId) return result;
    const item = normalizeItem(rawItem);
    const existingIndex = result.findIndex((entry) => entry.cartLineId === item.cartLineId);
    if (existingIndex < 0) return [...result, item];
    const next = [...result];
    const existing = next[existingIndex];
    next[existingIndex] = {
      ...existing,
      quantity: existing.quantity + item.quantity,
    };
    return next;
  }, []);
}

function loadCart() {
  try {
    return normalizeCart(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return [];
  }
}

function quantityForVariant(items, variantId, excludedLineId = null) {
  return items.reduce((sum, item) => (
    String(item.variantId) === String(variantId) && item.cartLineId !== excludedLineId
      ? sum + item.quantity
      : sum
  ), 0);
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
    quantityForVariant: (variantId) => quantityForVariant(items, variantId),
    addItem(rawItem) {
      const item = normalizeItem(rawItem);
      const used = quantityForVariant(items, item.variantId);
      const availableToAdd = Math.max(0, Number(item.stock) - used);
      const addedQuantity = Math.min(item.quantity, availableToAdd);
      if (addedQuantity < 1) return { addedQuantity: 0, availableToAdd };
      setItems((current) => {
        const existing = current.find((entry) => entry.cartLineId === item.cartLineId);
        if (!existing) return [...current, { ...item, quantity: addedQuantity }];
        return current.map((entry) => entry.cartLineId === item.cartLineId
          ? { ...entry, quantity: entry.quantity + addedQuantity, stock: item.stock }
          : entry);
      });
      return { addedQuantity, availableToAdd };
    },
    updateQuantity(cartLineId, quantity) {
      const line = items.find((item) => item.cartLineId === cartLineId);
      if (!line) return { quantity: 0, limited: false };
      const usedByOtherLines = quantityForVariant(items, line.variantId, cartLineId);
      const maximum = Math.max(1, Number(line.stock) - usedByOtherLines);
      const requested = Math.max(1, Number(quantity) || 1);
      const nextQuantity = Math.min(requested, maximum);
      setItems((current) => current.map((item) => item.cartLineId === cartLineId
        ? { ...item, quantity: nextQuantity }
        : item));
      return { quantity: nextQuantity, limited: nextQuantity < requested };
    },
    removeItem(cartLineId) {
      setItems((current) => current.filter((item) => item.cartLineId !== cartLineId));
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
