'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  discount?: string;
  deliveryTime?: string;
  rating?: number;
  isBestSeller?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShopDetails {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
}

interface CartContextType {
  cartItems: CartItem[];
  shop: ShopDetails | null;
  addToCart: (product: Product, shopDetails: ShopDetails) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('nexthood_cart');
      const storedShop = localStorage.getItem('nexthood_cart_shop');
      if (storedCart) setCartItems(JSON.parse(storedCart));
      if (storedShop) setShop(JSON.parse(storedShop));
    } catch (e) {
      console.error('Error loading cart from localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage when changed
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('nexthood_cart', JSON.stringify(cartItems));
      if (shop) {
        localStorage.setItem('nexthood_cart_shop', JSON.stringify(shop));
      } else {
        localStorage.removeItem('nexthood_cart_shop');
      }
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  }, [cartItems, shop, isLoaded]);

  const addToCart = (product: Product, shopDetails: ShopDetails) => {
    // If shop changes, reset cart
    if (shop && shop.id !== shopDetails.id) {
      setShop(shopDetails);
      setCartItems([{ product, quantity: 1 }]);
      return;
    }

    if (!shop) {
      setShop(shopDetails);
    }

    const maxStock = (product as any).stock !== undefined ? Number((product as any).stock) : 9999;

    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > maxStock) {
          alert(`Cannot add more "${product.name}". Only ${maxStock} units available.`);
          return prevItems;
        }
        return prevItems.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          const maxStock = (item.product as any).stock !== undefined ? Number((item.product as any).stock) : 9999;
          if (quantity > maxStock) {
            alert(`Cannot increase quantity for "${item.product.name}". Only ${maxStock} units available.`);
            return item;
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prevItems) => {
      const updated = prevItems.filter((item) => item.product.id !== productId);
      if (updated.length === 0) {
        setShop(null);
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setShop(null);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        shop,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
