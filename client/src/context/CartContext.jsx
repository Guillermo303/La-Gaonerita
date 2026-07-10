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

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const add = (item) => {
    setItems(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id);
      if (existing) return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId, delta) => {
    setItems(prev => prev.flatMap(i => {
      if (i.menu_item_id !== menuItemId) return [i];
      const q = i.quantity + delta;
      return q <= 0 ? [] : [{ ...i, quantity: q }];
    }));
  };

  const remove = (menuItemId) => setItems(prev => prev.filter(i => i.menu_item_id !== menuItemId));
  const clear = () => setItems([]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
