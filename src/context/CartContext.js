/* src/context/CartContext.js */
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
    return useContext(CartContext);
}

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false); // For future slide-out cart if needed

    // Load cart from localStorage on mount
    useEffect(() => {
        const storedCart = localStorage.getItem('costerbox_cart');
        if (storedCart) {
            try {
                setCartItems(JSON.parse(storedCart));
            } catch (error) {
                console.error("Failed to parse cart", error);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('costerbox_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Add item (or update quantity if exists)
    const addToCart = (product, size, qty = 1) => {
        setCartItems(prev => {
            // Check if item specific to ID + Size exists
            const existingIndex = prev.findIndex(item => item.id === product.id && item.selectedSize === size);

            if (existingIndex > -1) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += qty;
                return newCart;
            } else {
                return [...prev, {
                    ...product,
                    selectedSize: size,
                    quantity: qty,
                    price: Number(product.price) // Ensure number
                }];
            }
        });
    };

    // Remove item
    const removeFromCart = (id, size) => {
        setCartItems(prev => prev.filter(item => !(item.id === id && item.selectedSize === size)));
    };

    // Update quantity
    const updateQuantity = (id, size, newQty) => {
        if (newQty < 1) return;
        setCartItems(prev => prev.map(item => {
            if (item.id === id && item.selectedSize === size) {
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    // Clear cart
    const clearCart = () => setCartItems([]);

    // Derived values
    const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}
