import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      return [];
    }
  });
  const [customizations, setCustomizations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart_customizations') || '{}');
    } catch {
      return {};
    }
  });
  const [orderType, setOrderType] = useState(() => localStorage.getItem('orderType') || '');
  const [orderTime, setOrderTime] = useState(() => localStorage.getItem('orderTime') || '');

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('cart_customizations', JSON.stringify(customizations));
  }, [customizations]);

  useEffect(() => {
    localStorage.setItem('orderType', orderType);
  }, [orderType]);

  useEffect(() => {
    localStorage.setItem('orderTime', orderTime);
  }, [orderTime]);

  const itemKey = (menuItemId, variant = '') => variant ? `${menuItemId}:${variant}` : String(menuItemId);

  const add = (item, variant = '') => {
    const key = itemKey(item.id, variant);
    setItems(prev => {
      const existing = prev.find(i => itemKey(i.menu_item_id, i.variant) === key);
      if (existing) return prev.map(i => itemKey(i.menu_item_id, i.variant) === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menu_item_id: item.id, name: variant ? `${item.name} (${variant})` : item.name, price: item.price, quantity: 1, variant: variant || null, ready_to_serve: !!item.ready_to_serve }];
    });
  };

  const updateQty = (menuItemId, delta, variant = '') => {
    const key = itemKey(menuItemId, variant);
    setItems(prev => prev.flatMap(i => {
      if (itemKey(i.menu_item_id, i.variant) !== key) return [i];
      const q = i.quantity + delta;
      return q <= 0 ? [] : [{ ...i, quantity: q }];
    }));
  };

  const remove = (menuItemId, variant = '') => {
    const key = itemKey(menuItemId, variant);
    setItems(prev => prev.filter(i => itemKey(i.menu_item_id, i.variant) !== key));
  };

  const getQty = (menuItemId, variant = '') => {
    const key = itemKey(menuItemId, variant);
    const found = items.find(i => itemKey(i.menu_item_id, i.variant) === key);
    return found?.quantity || 0;
  };

  const clear = () => { setItems([]); setCustomizations({}); setOrderType(''); setOrderTime(''); };

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, getQty, clear, count, total, customizations, setCustomizations, orderType, setOrderType, orderTime, setOrderTime }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
