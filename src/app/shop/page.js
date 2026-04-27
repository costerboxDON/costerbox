/* src/app/shop/page.js */
"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ChatWindow from '../../components/ChatWindow';
import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, ShoppingBag, X, Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import '../../styles/shop.css';

function ShopPageContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const catFromUrl = searchParams.get('cat');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState(catFromUrl || 'All');
    const [loading, setLoading] = useState(true);
    const { isInWishlist, toggleWishlist } = useWishlist();

    // Track which product is currently being discussed
    const [activeChatProduct, setActiveChatProduct] = useState(null);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const catSnap = await getDocs(collection(db, 'categories'));
                setCategories(catSnap.docs.map(d => d.data().name).filter(Boolean));

                const prodSnap = await getDocs(collection(db, 'products'));
                // Archive shows ONLY customizable products
                const allProds = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setProducts(allProds.filter(p => p.isCustomizable === true));

                setLoading(false);
            } catch (error) {
                console.error("Error:", error);
            }
        };
        fetchData();
    }, []);

    // Update filter when URL param changes
    useEffect(() => {
        if (catFromUrl) setFilter(catFromUrl);
    }, [catFromUrl]);

    // --- FILTER LOGIC ---
    // Support filtering by category name, region, or tags (like "bestseller", "new-arrival")
    const filteredProducts = filter === 'All'
        ? products
        : products.filter(p => {
            // Match by category
            if (p.category === filter) return true;
            // Match by region
            if (p.region === filter) return true;
            // Match by tag (tags stored as array in Firestore)
            if (Array.isArray(p.tags) && p.tags.includes(filter.toLowerCase())) return true;
            return false;
        });

    // --- HANDLER: OPEN CHAT ---
    const handleOpenChat = (product) => {
        if (!user) {
            router.push('/secured/login');
            return;
        }
        setActiveChatProduct(product);
    };

    if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading Archive...</div>;

    return (
        <>
            {/* --- CHAT MODAL OVERLAY --- */}
            {activeChatProduct && user && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '16px' }}>
                    <ChatWindow
                        chatId={`inquiry_${user.uid}_${activeChatProduct.id}`}
                        artisanId={activeChatProduct.artisanId}
                        productName={activeChatProduct.name}
                        onClose={() => setActiveChatProduct(null)}
                    />
                </div>
            )}

            {/* MOBILE FILTERS */}
            <div className="mobile-filters">
                <span
                    className={`m-filter-chip ${filter === 'All' ? 'active' : ''}`}
                    onClick={() => setFilter('All')}
                >
                    All
                </span>
                {categories.map((cat, i) => (
                    <span
                        key={i}
                        className={`m-filter-chip ${filter === cat ? 'active' : ''}`}
                        onClick={() => setFilter(cat)}
                    >
                        {cat}
                    </span>
                ))}
            </div>

            <div className="shop-container">

                {/* SIDEBAR */}
                <aside className="sidebar">
                    <div className="filter-group">
                        <h3 className="filter-title">Collections</h3>
                        <ul className="filter-list">
                            <li className={filter === 'All' ? 'active' : ''} onClick={() => setFilter('All')}>All Archive</li>
                            <li onClick={() => setFilter('New Arrivals')}>New Arrivals</li>
                        </ul>
                    </div>

                    <div className="filter-group">
                        <h3 className="filter-title">Categories</h3>
                        <ul className="filter-list">
                            {categories.map((cat, i) => (
                                <li
                                    key={i}
                                    className={filter === cat ? 'active' : ''}
                                    onClick={() => setFilter(cat)}
                                >
                                    {cat}
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="main-gallery">
                    <div className="gallery-header">
                        <h1>The Artisan Archive</h1>
                        <p>Curated pieces from the heart of Rajasthan. Respecting the hands that create.</p>
                    </div>

                    <div className="products-grid">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="product-card">

                                <Link href={`/shop/${product.seoHandle || product.id}`} style={{ display: 'block', cursor: 'pointer' }}>
                                    <div className="img-box" style={{ position: 'relative' }}>
                                        {product.badge && <span className="badge">{product.badge}</span>}

                                        {/* Wishlist Button Overlay */}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleWishlist(product);
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
                                            title={isInWishlist(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                                        >
                                            <Heart
                                                size={16}
                                                fill={isInWishlist(product.id) ? "#e53935" : "none"}
                                                color={isInWishlist(product.id) ? "#e53935" : "#1a1a1a"}
                                            />
                                        </button>

                                        {/* IMAGE LOGIC */}
                                        {(() => {
                                            let finalImage = product.featuredImage;
                                            if (!finalImage && product.media && product.media.length > 0) {
                                                finalImage = product.media[0];
                                            }
                                            if (!finalImage) {
                                                finalImage = 'https://via.placeholder.com/400x500?text=No+Image';
                                            }
                                            return (
                                                <Image
                                                    src={finalImage}
                                                    alt={product.title || product.name || 'Product Image'}
                                                    fill
                                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                                    style={{ objectFit: 'cover' }}
                                                    className="product-img"
                                                />
                                            );
                                        })()}
                                    </div>
                                </Link>

                                <div className="card-details">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span className="p-region">{product.region}</span>
                                        {product.isCustomizable && (
                                            <span style={{
                                                fontSize: '10px',
                                                textTransform: 'uppercase',
                                                color: '#1a1a1a',
                                                letterSpacing: '0.5px',
                                                border: '1px solid #ddd',
                                                padding: '2px 6px',
                                                borderRadius: '2px',
                                                background: '#f9f9f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}>
                                                <MessageCircle size={10} /> Customizable
                                            </span>
                                        )}
                                    </div>

                                    {/* 3. WRAP TITLE IN LINK */}
                                    <Link href={`/shop/${product.seoHandle || product.id}`} style={{ textDecoration: 'none' }}>
                                        <h3 className="p-name">{product.name || product.title}</h3>
                                    </Link>

                                    <span className="p-price">{product.price}</span>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        {/* STANDARD ADD TO CART */}
                                        <button className="add-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <ShoppingBag size={16} /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>
                            <p>No artifacts found in this collection.</p>
                            <button onClick={() => setFilter('All')} style={{ textDecoration: 'underline' }}>View All</button>
                        </div>
                    )}
                </main>

            </div>
        </>
    );
}

// Suspense wrapper for useSearchParams
export default function ShopPage() {
    return (
        <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center' }}>Loading Archive...</div>}>
            <ShopPageContent />
        </Suspense>
    );
}