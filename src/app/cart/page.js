/* src/app/cart/page.js */
"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ArrowRight, Trash2, ArrowLeft } from 'lucide-react';
import '../../styles/cart.css';



export default function CartPage() {
    const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const router = useRouter();

    const handleCheckout = () => {
        if (cartItems.length === 0) return;
        if (!user) {
            // Store intent?
            router.push('/secured/login?redirect=/checkout');
        } else {
            router.push('/checkout');
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="cart-page">
                <div className="cart-empty">
                    <img
                        src="https://img.icons8.com/ios-filled/100/eeeeee/shopping-cart.png"
                        alt="Cart Empty"
                        style={{ marginBottom: '20px' }}
                    />
                    <h2>Your cart is empty.</h2>
                    <p>It looks like you haven't added anything yet.</p>
                    <Link href="/products">Continue Shopping</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <h1 className="cart-title">Shopping Cart</h1>

            <div className="cart-layout">
                {/* ITEMS LIST */}
                <div className="cart-items">
                    {cartItems.map((item, index) => {
                        const mainImg = item.featuredImage || (item.media && item.media[0]) || 'https://via.placeholder.com/100';
                        const itemTotal = Number(item.price) * item.quantity;

                        return (
                            <div key={`${item.id}-${item.selectedSize}`} className="cart-item">
                                <Link href={`/shop/${item.id}`}>
                                    <img src={mainImg} alt={item.title} className="cart-item-image" />
                                </Link>
                                <div className="cart-item-info">
                                    <Link href={`/shop/${item.id}`} className="cart-item-title">
                                        {item.name || item.title}
                                    </Link>
                                    <div className="cart-item-variant">Size: {item.selectedSize || 'Standard'}</div>
                                    <div className="cart-item-price">₹{Number(item.price).toLocaleString('en-IN')}</div>

                                    <div className="cart-qty-wrapper">
                                        <button
                                            className="qty-btn"
                                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                        >-</button>
                                        <span className="qty-display">{item.quantity}</span>
                                        <button
                                            className="qty-btn"
                                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                                        >+</button>

                                        <button
                                            className="remove-btn"
                                            onClick={() => removeFromCart(item.id, item.selectedSize)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 'bold' }}>
                                    ₹{itemTotal.toLocaleString('en-IN')}
                                </div>
                            </div>
                        );
                    })}

                    <button
                        onClick={clearCart}
                        style={{ background: 'none', border: 'none', textDecoration: 'underline', color: '#999', alignSelf: 'start', marginTop: '20px', cursor: 'pointer' }}
                    >
                        Clear Cart
                    </button>
                </div>

                {/* SUMMARY */}
                <div className="cart-summary">
                    <h3 className="summary-title">Order Summary</h3>

                    <div className="summary-row">
                        <span>Subtotal ({cartItems.length} items)</span>
                        <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="summary-row">
                        <span>Shipping</span>
                        <span>Computed at checkout</span>
                    </div>

                    <div className="summary-row total">
                        <span>Total</span>
                        <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <button className="checkout-btn" onClick={handleCheckout}>
                        Check Out <ArrowRight size={16} />
                    </button>

                    <div style={{ marginTop: '20px', fontSize: '12px', color: '#777', textAlign: 'center' }}>
                        <p>Secure Checkout with Razorpay/Stripe.</p>
                        <p>We accept all major cards & UPI.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
