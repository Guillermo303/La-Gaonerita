import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  const [promotion, setPromotion] = useState(() => {
    try { return JSON.parse(localStorage.getItem('promotion') || 'null'); } catch { return null; }
  });

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('promotion', JSON.stringify(promotion)); }, [promotion]);

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
  const updateNotes = (menuItemId, notes) => setItems(prev => prev.map(i => i.menu_item_id === menuItemId ? { ...i, notes } : i));
  const clear = () => { setItems([]); setPromotion(null); };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  const discount = useMemo(() => {
    if (!promotion) return 0;
    if (promotion.applicable_items) {
      const itemIds = JSON.parse(promotion.applicable_items);
      const eligibleTotal = items.filter(i => itemIds.includes(i.menu_item_id)).reduce((s, i) => s + i.price * i.quantity, 0);
      if (eligibleTotal === 0) return 0;
      return promotion.discount_type === 'percentage' ? eligibleTotal * (promotion.discount_value / 100) : Math.min(promotion.discount_value, eligibleTotal);
    }
    if (promotion.min_purchase > 0 && subtotal < promotion.min_purchase) return 0;
    return promotion.discount_type === 'percentage' ? subtotal * (promotion.discount_value / 100) : Math.min(promotion.discount_value, subtotal);
  }, [promotion, items, subtotal]);

  const finalTotal = subtotal - discount;

  return (
    <CartContext.Provider value={{ items, add, updateQty, updateNotes, remove, clear, count, subtotal, discount, finalTotal, promotion, setPromotion }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
