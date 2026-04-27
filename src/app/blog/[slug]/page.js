/* src/app/blog/[slug]/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, Calendar, Tag, Clock } from 'lucide-react';
import '../../../styles/blog.css';

export default function SingleBlogPost() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [recentPosts, setRecentPosts] = useState([]);

    useEffect(() => {
        if (slug) fetchPost();
    }, [slug]);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'blogPosts'),
                where('slug', '==', slug),
                where('status', '==', 'published')
            );
            const snap = await getDocs(q);

            if (!snap.empty) {
                const postData = { id: snap.docs[0].id, ...snap.docs[0].data() };
                setPost(postData);

                // Update page title
                document.title = postData.metaTitle || postData.title || 'Blog — Costerbox';

                // Update meta description
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) {
                    metaDesc.setAttribute('content', postData.metaDescription || postData.description || '');
                }

                // Update meta keywords
                let metaKw = document.querySelector('meta[name="keywords"]');
                if (postData.metaKeywords) {
                    if (!metaKw) {
                        metaKw = document.createElement('meta');
                        metaKw.setAttribute('name', 'keywords');
                        document.head.appendChild(metaKw);
                    }
                    metaKw.setAttribute('content', postData.metaKeywords);
                }

                // Fetch related and recent posts
                if (postData.category) {
                    fetchRelated(postData.category, postData.id);
                }
                fetchRecent(postData.id);
            }
        } catch (err) {
            console.error('Error fetching post:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRelated = async (category, currentId) => {
        try {
            const q = query(
                collection(db, 'blogPosts'),
                where('status', '==', 'published'),
                where('category', '==', category)
            );
            const snap = await getDocs(q);
            const related = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(p => p.id !== currentId)
                .slice(0, 3);
            setRelatedPosts(related);
        } catch (err) {
            console.error('Error fetching related posts:', err);
        }
    };

    const fetchRecent = async (currentId) => {
        try {
            const q = query(
                collection(db, 'blogPosts'),
                where('status', '==', 'published')
            );
            const snap = await getDocs(q);
            const fetchedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort client-side
            fetchedPosts.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            // Filter out current post
            const recent = fetchedPosts.filter(p => p.id !== currentId).slice(0, 5);
            setRecentPosts(recent);
        } catch (err) {
            console.error('Error fetching recent posts:', err);
        }
    };

    const formatDate = (ts) => {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getReadingTime = (html) => {
        if (!html) return '1 min';
        const text = html.replace(/<[^>]+>/g, '');
        const words = text.split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        return `${minutes} min read`;
    };

    // --- LOADING ---
    if (loading) {
        return (
            <div className="single-post-wrapper">
                <div className="blog-skeleton" style={{ height: '18px', width: '120px', marginBottom: '30px' }} />
                <div className="blog-skeleton" style={{ height: '24px', width: '200px', marginBottom: '20px', borderRadius: '20px' }} />
                <div className="blog-skeleton" style={{ height: '42px', width: '80%', marginBottom: '12px' }} />
                <div className="blog-skeleton" style={{ height: '42px', width: '60%', marginBottom: '24px' }} />
                <div className="blog-skeleton" style={{ height: '16px', width: '300px', marginBottom: '32px' }} />
                <div className="blog-skeleton" style={{ width: '100%', paddingTop: '50%', marginBottom: '36px' }} />
                <div className="blog-skeleton" style={{ height: '16px', width: '100%', marginBottom: '12px' }} />
                <div className="blog-skeleton" style={{ height: '16px', width: '90%', marginBottom: '12px' }} />
                <div className="blog-skeleton" style={{ height: '16px', width: '75%', marginBottom: '12px' }} />
            </div>
        );
    }

    // --- NOT FOUND ---
    if (!post) {
        return (
            <div className="single-post-wrapper" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <h2 style={{ fontSize: '28px', color: '#333', marginBottom: '12px' }}>Post Not Found</h2>
                <p style={{ color: '#999', marginBottom: '24px' }}>The blog post you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                <Link href="/blog" style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'underline' }}>
                    ← Back to Blog
                </Link>
            </div>
        );
    }

    return (
        <div className="single-post-wrapper">
            <div className="single-post-container">
                <main className="single-post-main">
                    {/* Back Link */}
                    <div style={{ marginBottom: '30px' }}>
                        <Link href="/blog" className="single-post__back">
                            <ArrowLeft size={16} /> Back to Blog
                        </Link>
                    </div>

                    {/* Category Badge & Title Area */}
                    <div className="single-post__header-area">
                        {post.category && (
                            <span className="single-post__category">{post.category}</span>
                        )}
                        <h1 className="single-post__title">{post.title}</h1>
                    </div>

                    {/* Meta Info */}
                    <div className="single-post__meta">
                        <span><Calendar size={14} /> {formatDate(post.createdAt)}</span>
                        <span><Clock size={14} /> {getReadingTime(post.content)}</span>
                        {/* <span><Tag size={14} /> {post.category}</span> */}
                    </div>

                    {/* Featured Image */}
                    {post.featuredImage && (
                        <div className="single-post__feature-image">
                            <img src={post.featuredImage} alt={post.title} />
                        </div>
                    )}

                    {/* Article Content */}
                    <div
                        className="single-post__content"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </main>

                {/* Sidebar */}
                <aside className="single-post-sidebar">
                    <div className="sidebar-widget">
                        <h4 className="sidebar-title">Recent Articles</h4>
                        <div className="sidebar-recent-list">
                            {recentPosts.map(rp => (
                                <Link key={rp.id} href={`/blog/${rp.slug}`} className="sidebar-recent-card">
                                    <div className="sidebar-recent-img">
                                        {rp.featuredImage ? (
                                            <img src={rp.featuredImage} alt={rp.title} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#eee' }}></div>
                                        )}
                                    </div>
                                    <div className="sidebar-recent-info">
                                        <h5 className="sidebar-recent-title">{rp.title}</h5>
                                        <span className="sidebar-recent-date">{formatDate(rp.createdAt)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
                <div style={{ marginTop: '60px', paddingTop: '40px', borderTop: '1px solid #eee' }}>
                    <h3 style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#1a1a1a',
                        marginBottom: '24px'
                    }}>
                        Related Articles
                    </h3>
                    <div className="blog-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {relatedPosts.map(rp => (
                            <Link key={rp.id} href={`/blog/${rp.slug}`} className="blog-card">
                                <div className="blog-card__image-wrap">
                                    {rp.featuredImage ? (
                                        <img src={rp.featuredImage} alt={rp.title} />
                                    ) : (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                                        </div>
                                    )}
                                </div>
                                <div className="blog-card__body">
                                    <span className="blog-card__date">{formatDate(rp.createdAt)}</span>
                                    <h3 className="blog-card__title">{rp.title}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
