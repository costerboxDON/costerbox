/* src/app/wishlist/page.js */
"use client";
import React from 'react';
import Link from 'next/link';
import { useWishlist } from '../../context/WishlistContext';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import '../../styles/shop.css'; // Reusing shop styles for consistency

export default function WishlistPage() {
    const { wishlist, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleMoveToCart = (product) => {
        addToCart(product);
        removeFromWishlist(product.id);
    };

    if (wishlist.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Your Wishlist is Empty</h1>
                <p style={{ color: '#666', marginBottom: '30px' }}>Save items you love to review them later.</p>
                <Link href="/products" style={{
                    padding: '12px 30px',
                    background: '#1a1a1a',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '4px'
                }}>
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '50px 20px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '40px', textAlign: 'center' }}>My Wishlist ({wishlist.length})</h1>

            <div className="products-grid">
                {wishlist.map(product => (
                    <div key={product.id} className="product-card" style={{ position: 'relative' }}>

                        {/* Remove Button */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                removeFromWishlist(product.id);
                            }}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 10,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                            }}
                            title="Remove from Wishlist"
                        >
                            <Trash2 size={16} color="#c62828" />
                        </button>

                        <Link href={`/shop/${product.seoHandle || product.id}`} style={{ display: 'block', cursor: 'pointer' }}>
                            <div className="img-box">
                                {product.badge && <span className="badge">{product.badge}</span>}
                                {(() => {
                                    let finalImage = product.featuredImage;
                                    if (!finalImage && product.media && product.media.length > 0) {
                                        finalImage = product.media[0];
                                    }
                                    if (!finalImage) {
                                        finalImage = 'https://via.placeholder.com/400x500?text=No+Image';
                                    }
                                    return (
                                        <img
                                            src={finalImage}
                                            alt={product.title || product.name || 'Product'}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    );
                                })()}
                            </div>
                        </Link>

                        <div className="card-details">
                            <span className="p-region">{product.category || product.region}</span>

                            <Link href={`/shop/${product.seoHandle || product.id}`} style={{ textDecoration: 'none' }}>
                                <h3 className="p-name">{product.name || product.title}</h3>
                            </Link>

                            <span className="p-price">
                                ₹{Number(product.price).toLocaleString('en-IN')}
                            </span>

                            <button
                                onClick={() => handleMoveToCart(product)}
                                className="add-btn"
                                style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                                Move to Cart
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
