/* src/components/Header.js */
"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Search, ShoppingBag, User, Menu, X, Package, LogOut, ChevronDown, Heart } from 'lucide-react';
import '../styles/header.css';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { cartCount } = useCart();
    const { wishlist } = useWishlist();
    const wishlistCount = wishlist.length;

    // State for Mobile Menu, Search & Products Dropdown
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [productsOpen, setProductsOpen] = useState(false);
    const [mobileProductsOpen, setMobileProductsOpen] = useState(false); // Isolated mobile state
    // Initialize with default categories to ensure menu is never empty
    const [categories, setCategories] = useState(['Coasters', 'Notebooks', 'Tote Bags', 'Placemats']);
    const dropdownRef = useRef(null);

    // Fetch categories from Firestore
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catSnap = await getDocs(collection(db, 'categories'));
                const cats = catSnap.docs.map(d => d.data().name).filter(Boolean);
                // Only update if we successfully fetched categories
                if (cats.length > 0) {
                    setCategories(cats);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Close desktop dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setProductsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/');
        setMobileMenuOpen(false);
    };

    // Hide Header on Admin/Secured pages (except Login)
    if (pathname.startsWith('/secured') && pathname !== '/secured/login') {
        return null;
    }

    return (
        <nav className="nav-wrapper">
            <div className="nav-bar">

                {/* 1. MOBILE TOGGLE (Left) */}
                <div className="mobile-toggle" onClick={() => setMobileMenuOpen(true)}>
                    <Menu size={22} />
                </div>

                {/* 2. LOGO (Center) */}
                <Link href="/" className="brand-logo">
                    <img src="/logo.png" alt="CosterBox" className="logo-img" />
                </Link>

                {/* 3. DESKTOP ICONS (Right) */}
                <div className="desktop-icons">

                    {/* Products Dropdown */}
                    <div className="nav-dropdown" ref={dropdownRef}>
                        <button
                            className="icon-link nav-dropdown-trigger"
                            onClick={() => setProductsOpen(!productsOpen)}
                        >
                            Products <ChevronDown size={14} className={`chevron ${productsOpen ? 'open' : ''}`} />
                        </button>

                        {productsOpen && (
                            <div className="nav-dropdown-menu">
                                <Link href="/products" className="nav-dropdown-item" onClick={() => setProductsOpen(false)}>
                                    All Products
                                </Link>
                                {categories.length > 0 && <div className="nav-dropdown-divider" />}
                                {categories.map((cat, i) => (
                                    <Link
                                        href={`/products?cat=${encodeURIComponent(cat)}`}
                                        key={i}
                                        className="nav-dropdown-item"
                                        onClick={() => setProductsOpen(false)}
                                    >
                                        {cat}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link href="/shop" className="icon-link">Archive</Link>
                    <Link href="/blog" className="icon-link">Costerbox Stories</Link>

                    {/* Search Bar Logic */}
                    <div className={`search-container ${searchOpen ? 'active' : ''}`}>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const term = e.target.search.value;
                            if (term.trim()) {
                                router.push(`/products?search=${encodeURIComponent(term)}`);
                                setSearchOpen(false);
                            }
                        }}
                            style={{ display: 'flex', alignItems: 'center' }}
                        >
                            <input
                                name="search"
                                type="text"
                                className="search-input"
                                placeholder="Search..."
                                autoComplete="off"
                            />
                            <button type="button" className="icon-link search-trigger" onClick={() => {
                                if (searchOpen) {
                                    const input = document.querySelector('.search-input');
                                    if (input && input.value.trim()) {
                                        router.push(`/products?search=${encodeURIComponent(input.value.trim())}`);
                                        setSearchOpen(false);
                                    } else {
                                        setSearchOpen(false);
                                    }
                                } else {
                                    setSearchOpen(true);
                                }
                            }}>
                                <Search size={20} />
                            </button>
                        </form>
                    </div>

                    <Link href="/wishlist" className="icon-link" title="Wishlist" style={{ position: 'relative' }}>
                        <Heart size={20} />
                        {wishlistCount > 0 && <span style={{
                            position: 'absolute', top: '-5px', right: '-5px',
                            background: '#c41e3a', color: 'white', fontSize: '10px',
                            fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{wishlistCount}</span>}
                    </Link>

                    <Link href="/cart" className="icon-link" title="Cart" style={{ position: 'relative' }}>
                        <ShoppingBag size={20} />
                        {cartCount > 0 && <span style={{
                            position: 'absolute', top: '-5px', right: '-5px',
                            background: '#c41e3a', color: 'white', fontSize: '10px',
                            fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{cartCount}</span>}
                    </Link>

                    {user ? (
                        <>
                            <Link href="/orders" className="icon-link" title="My Orders"><Package size={20} /></Link>
                            <button onClick={handleLogout} className="icon-link" title="Logout"><LogOut size={20} /></button>
                        </>
                    ) : (
                        <Link href="/secured/login" className="icon-link" title="Login"><User size={20} /></Link>
                    )}
                </div>

                {/* 4. MOBILE RIGHT SECTION */}
                <div className="mobile-right-section">
                    <div className="mobile-search-trigger" onClick={() => setSearchOpen(!searchOpen)}><Search size={20} /></div>
                    <Link href="/cart" className="mobile-cart-link" style={{ position: 'relative' }}>
                        <ShoppingBag size={20} />
                        {cartCount > 0 && <span style={{
                            position: 'absolute', top: '-5px', right: '-5px',
                            background: '#c41e3a', color: 'white', fontSize: '10px',
                            fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{cartCount}</span>}
                    </Link>
                </div>
            </div>

            {/* --- MOBILE SIDEBAR MENU --- */}
            <div className={`mobile-menu-expansion ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-header">
                    <span className="menu-title">
                        {user ? `Hi, ${user.displayName?.split(' ')[0] || 'User'}` : 'Menu'}
                    </span>
                    <X className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)} />
                </div>

                <div className="mobile-menu-content" style={{ overflowY: 'auto', flex: 1 }}>
                    <Link href="/" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>

                    {/* Mobile Products Accordion */}
                    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <button
                            type="button"
                            className="mobile-link mobile-accordion-trigger"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMobileProductsOpen(prev => !prev);
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                padding: '15px 20px',
                                fontSize: '15px',
                                color: '#333'
                            }}
                        >
                            <span style={{ fontWeight: 400 }}>Products</span>
                            <ChevronDown
                                size={16}
                                style={{
                                    transform: mobileProductsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }}
                            />
                        </button>

                        {/* Render Dropdown Content */}
                        {mobileProductsOpen && (
                            <div className="mobile-accordion-content" style={{ background: '#fafafa', paddingBottom: '10px' }}>
                                <div
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setMobileProductsOpen(false);
                                        setMobileMenuOpen(false);
                                        router.push('/products');
                                    }}
                                    className="mobile-link mobile-sublink"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderBottom: 'none',
                                        paddingTop: '10px',
                                        paddingBottom: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All Products
                                </div>

                                {/* Dynamic Categories */}
                                {(categories || []).map((cat, i) => (
                                    <div
                                        key={i}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setMobileProductsOpen(false);
                                            setMobileMenuOpen(false);
                                            router.push(`/products?cat=${encodeURIComponent(cat)}`);
                                        }}
                                        className="mobile-link mobile-sublink"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            textTransform: 'capitalize',
                                            borderBottom: 'none',
                                            paddingTop: '10px',
                                            paddingBottom: '10px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {cat}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link href="/shop" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Archive</Link>
                    <Link href="/about" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
                    <Link href="/contact" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
                    <Link href="/blog" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Costerbox Stories</Link>
                    <Link href="/cart" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Cart</Link>

                    {user ? (
                        <>
                            <Link href="/orders" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
                            <button
                                className="mobile-link mobile-link-btn"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link href="/secured/login" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                    )}
                </div>
            </div>

            {/* --- MOBILE SEARCH BAR --- */}
            <div className={`mobile-search-bar ${searchOpen ? 'open' : ''}`}>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.querySelector('input');
                    if (input && input.value.trim()) {
                        router.push(`/products?search=${encodeURIComponent(input.value.trim())}`);
                        setSearchOpen(false);
                    }
                }}>
                    <input type="text" placeholder="Search products..." />
                    <button type="button" onClick={() => setSearchOpen(false)} style={{ marginRight: '10px' }}><X size={18} /></button>
                    <button type="submit"><Search size={18} /></button>
                </form>
            </div>

            {/* OVERLAY */}
            <div
                className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />
        </nav>
    );
}