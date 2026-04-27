/* src/app/products/page.js */
"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import '../../styles/shop.css';

function ProductsPageContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const catFromUrl = searchParams.get('cat');

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState(catFromUrl || 'All');
    const [loading, setLoading] = useState(true);
    const { isInWishlist, toggleWishlist } = useWishlist();

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const catSnap = await getDocs(collection(db, 'categories'));
                setCategories(catSnap.docs.map(d => d.data().name).filter(Boolean));

                const prodSnap = await getDocs(collection(db, 'products'));
                // Products page shows ONLY non-customizable (direct shipping) products
                const allProds = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setProducts(allProds);

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
    const searchTerm = searchParams.get('search')?.toLowerCase() || "";

    const filteredProducts = products.filter(p => {
        // 1. Search Filter (Higher Priority)
        if (searchTerm) {
            const inName = (p.name || p.title || "").toLowerCase().includes(searchTerm);
            const inDesc = (p.description || "").toLowerCase().includes(searchTerm);
            const inRegion = (p.region || "").toLowerCase().includes(searchTerm);
            const inTags = Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(searchTerm));

            if (!inName && !inDesc && !inRegion && !inTags) return false;
        }

        // 2. Category Filter
        if (filter !== 'All') {
            // Normalize: Remove trailing 's', trim whitespace to prevent mismatches
            const safeFilter = String(filter).trim().toLowerCase();
            const normFilter = safeFilter.replace(/s$/, '');

            const pCat = String(p.category || "").trim().toLowerCase();
            const pRegion = String(p.region || "").trim().toLowerCase();
            const pTags = (Array.isArray(p.tags) ? p.tags : []).map(t => String(t).trim().toLowerCase());

            const matchesCategory =
                pCat === safeFilter ||
                pCat.replace(/s$/, '') === normFilter ||
                pRegion === safeFilter ||
                pRegion.replace(/s$/, '') === normFilter ||
                pTags.includes(safeFilter) ||
                pTags.some(t => t.replace(/s$/, '') === normFilter);

            if (!matchesCategory) return false;
        }

        return true;
    });

    if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading Products...</div>;

    return (
        <>
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
                        <h3 className="filter-title">Browse</h3>
                        <ul className="filter-list">
                            <li className={filter === 'All' ? 'active' : ''} onClick={() => setFilter('All')}>All Products</li>
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
                        <h1>{searchTerm ? `Search Results for "${searchTerm}"` : "Products"}</h1>
                        <p>{searchTerm ? `${filteredProducts.length} items found` : "Products are ready to ship, customization available as per your need0."}</p>
                    </div>

                    <div className="products-grid">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="product-card">
                                <Link href={`/shop/${product.seoHandle || product.id}`} style={{ display: 'block', cursor: 'pointer', height: '100%' }}>
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
                                                    alt={product.title || product.name || 'Product'}
                                                    fill
                                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                                    style={{ objectFit: 'cover' }}
                                                    className="product-img"
                                                />
                                            );
                                        })()}
                                    </div>

                                    <div className="card-details">
                                        <span className="p-region">{product.category || product.region}</span>

                                        <h3 className="p-name">{product.name || product.title}</h3>

                                        <span className="p-price">
                                            ₹{Number(product.price).toLocaleString('en-IN')}
                                            {product.comparePrice && (
                                                <span style={{ textDecoration: 'line-through', color: '#999', marginLeft: '8px', fontSize: '0.85rem' }}>
                                                    ₹{Number(product.comparePrice).toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </span>

                                        <button className="add-btn">
                                            <ShoppingBag size={14} style={{ marginRight: '6px' }} /> Add to Bag
                                        </button>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>
                            <p>No products found {searchTerm ? `for "${searchTerm}"` : "in this category"}.</p>
                            <button onClick={() => {
                                // Reset both filter and search if possible, or just clear filter
                                setFilter('All');
                                if (searchTerm) window.location.href = '/products'; // hard reset for search clear
                            }} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>View All Products</button>
                        </div>
                    )}
                </main>

            </div>
        </>
    );
}

// Suspense wrapper for useSearchParams
export default function ProductsPage() {
    return (
        <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center' }}>Loading Products...</div>}>
            <ProductsPageContent />
        </Suspense>
    );
}
