// app/context/CartContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
    quantity: number;
    stock: number;
}

interface CartContextType {
    cartItems: CartItem[]; // Changé pour correspondre exactement à CartDrawer
    addToCart: (product: any) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void; // Ajouté
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    // Charger le panier depuis le localStorage au démarrage
    useEffect(() => {
        const savedCart = localStorage.getItem('ndanty_cart');
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Erreur de lecture du panier", e);
            }
        }
    }, []);

    // Sauvegarder le panier dans le localStorage à chaque modification
    useEffect(() => {
        localStorage.setItem('ndanty_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Ajouter un produit au panier
    const addToCart = (product: any) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === product.id);

            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    alert("Désolé, la quantité maximale en stock pour cette pièce unique a été atteinte.");
                    return prevItems;
                }
                return prevItems.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }

            return [...prevItems, {
                id: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: 1,
                stock: product.stock
            }];
        });
    };

    // Mettre à jour manuellement la quantité (+ / -)
    const updateQuantity = (productId: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id === productId) {
                    if (newQuantity > item.stock) {
                        alert("Quantité maximale disponible en stock atteinte.");
                        return item;
                    }
                    return { ...item, quantity: newQuantity };
                }
                return item;
            })
        );
    };

    // Retirer complètement un produit du panier
    const removeFromCart = (productId: number) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    };

    // Vider complètement le panier
    const clearCart = () => setCartItems([]);

    // Calculs rapides du prix total et du nombre d'articles
    const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart doit être utilisé à l'intérieur d'un CartProvider");
    }
    return context;
}