/* src/app/blog/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { ArrowRight } from 'lucide-react';
import '../../styles/blog.css';

export default function BlogPage() {
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch published posts only
            const q = query(
                collection(db, 'blogPosts'),
                where('status', '==', 'published')
            );
            const snap = await getDocs(q);
            const fetchedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort client-side to avoid composite index requirement
            fetchedPosts.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setPosts(fetchedPosts);

            // Extract unique categories
            const cats = [...new Set(fetchedPosts.map(p => p.category).filter(Boolean))];
            setCategories(cats);
        } catch (err) {
            console.error('Error fetching blog posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (ts) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const filteredPosts = activeCategory === 'All'
        ? posts
        : posts.filter(p => p.category === activeCategory);

    return (
        <div className="blog-page">
            {/* Hero */}
            <div className="blog-page__hero">
                <h1>Our Blog</h1>
                <p>Stories of craftsmanship, design inspiration, and the artisans behind every creation.</p>
            </div>

            {/* Category Filters */}
            {categories.length > 0 && (
                <div className="blog-page__filters">
                    <button
                        className={`blog-page__filter-btn ${activeCategory === 'All' ? 'blog-page__filter-btn--active' : ''}`}
                        onClick={() => setActiveCategory('All')}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`blog-page__filter-btn ${activeCategory === cat ? 'blog-page__filter-btn--active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Blog Grid */}
            {loading ? (
                <div className="blog-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ borderRadius: '16px', overflow: 'hidden' }}>
                            <div className="blog-skeleton" style={{ width: '100%', paddingTop: '60%' }} />
                            <div style={{ padding: '22px 20px' }}>
                                <div className="blog-skeleton" style={{ height: '14px', width: '40%', marginBottom: '12px' }} />
                                <div className="blog-skeleton" style={{ height: '20px', width: '90%', marginBottom: '10px' }} />
                                <div className="blog-skeleton" style={{ height: '14px', width: '70%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="blog-page__empty">
                    <h3>No posts found</h3>
                    <p>{activeCategory !== 'All' ? `No posts in "${activeCategory}" yet. Check back soon!` : 'We\'re working on some great content. Stay tuned!'}</p>
                </div>
            ) : (
                <div className="blog-grid">
                    {filteredPosts.map(post => (
                        <Link
                            key={post.id}
                            href={`/blog/${post.slug}`}
                            className="blog-card"
                        >
                            <div className="blog-card__image-wrap">
                                {post.featuredImage ? (
                                    <img src={post.featuredImage} alt={post.title} />
                                ) : (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                                    </div>
                                )}
                                {post.category && (
                                    <span className="blog-card__category">{post.category}</span>
                                )}
                            </div>
                            <div className="blog-card__body">
                                <span className="blog-card__date">{formatDate(post.createdAt)}</span>
                                <h3 className="blog-card__title">{post.title}</h3>
                                {post.description && (
                                    <p className="blog-card__desc">{post.description}</p>
                                )}
                                <span className="blog-card__read-more">
                                    Read More <ArrowRight size={14} />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
