/* src/app/secured/superadmin/blog/page.js */
"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { db, storage } from '../../../../lib/firebase';
import {
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
    query, orderBy, serverTimestamp, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
    ArrowLeft, Plus, Save, Trash2, Edit2, Eye, EyeOff,
    Image as ImageIcon, X, Search, FileText, Tag, Clock, ExternalLink, LayoutTemplate
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import '../../../../styles/blog.css';

// Dynamic import for React Quill (client only)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

export default function BlogAdminPage() {
    const router = useRouter();

    // --- VIEW STATE ---
    const [view, setView] = useState('list'); // 'list' | 'editor'
    const [editingPost, setEditingPost] = useState(null);

    // --- LIST STATE ---
    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- EDITOR STATE ---
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewCatInput, setShowNewCatInput] = useState(false);
    const [featuredImage, setFeaturedImage] = useState(null);
    const [featuredImageUrl, setFeaturedImageUrl] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [metaKeywords, setMetaKeywords] = useState('');
    const [status, setStatus] = useState('draft'); // 'draft' | 'published'
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [activeTab, setActiveTab] = useState('content'); // 'content' | 'seo'
    const [showPreview, setShowPreview] = useState(false);

    const fileInputRef = useRef(null);

    // --- QUILL TOOLBAR CONFIG ---
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],
            ['clean']
        ]
    }), []);

    const quillFormats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'list', 'align',
        'blockquote', 'code-block', 'link', 'image', 'video'
    ];

    // --- FETCH POSTS ---
    useEffect(() => {
        fetchPosts();
        fetchCategories();
    }, []);

    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Error fetching blog posts:', err);
        } finally {
            setLoadingPosts(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const q = query(collection(db, 'blogCategories'), orderBy('name', 'asc'));
            const snap = await getDocs(q);
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Error fetching blog categories:', err);
        }
    };

    // --- SLUG GENERATOR ---
    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleTitleChange = (val) => {
        setTitle(val);
        if (!editingPost) {
            setSlug(generateSlug(val));
        }
    };

    // --- ADD NEW CATEGORY ---
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const docRef = await addDoc(collection(db, 'blogCategories'), {
                name: newCategoryName.trim(),
                createdAt: serverTimestamp()
            });
            const newCat = { id: docRef.id, name: newCategoryName.trim() };
            setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
            setCategory(newCategoryName.trim());
            setNewCategoryName('');
            setShowNewCatInput(false);
            showToast('Category added!');
        } catch (err) {
            console.error('Error adding category:', err);
            alert('Failed to add category');
        }
    };

    // --- FEATURE IMAGE UPLOAD ---
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFeaturedImage(file);
        setFeaturedImageUrl(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setFeaturedImage(null);
        setFeaturedImageUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- SAVE / PUBLISH ---
    const handleSave = async (publishStatus) => {
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }
        if (!slug.trim()) {
            alert('Please enter a slug');
            return;
        }

        setSaving(true);
        try {
            let imageUrl = featuredImageUrl;

            // Upload new image if selected
            if (featuredImage) {
                const imgRef = ref(storage, `blog/${Date.now()}_${featuredImage.name}`);
                await uploadBytes(imgRef, featuredImage);
                imageUrl = await getDownloadURL(imgRef);
            }

            const postData = {
                title: title.trim(),
                slug: slug.trim(),
                description: description.trim(),
                content,
                category: category.trim(),
                featuredImage: imageUrl,
                metaTitle: metaTitle.trim(),
                metaDescription: metaDescription.trim(),
                metaKeywords: metaKeywords.trim(),
                status: publishStatus || status,
                updatedAt: serverTimestamp()
            };

            if (editingPost) {
                // UPDATE
                await updateDoc(doc(db, 'blogPosts', editingPost.id), postData);
                showToast('Post updated successfully!');
            } else {
                // CREATE
                postData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'blogPosts'), postData);
                showToast('Post created successfully!');
            }

            await fetchPosts();
            resetEditor();
            setView('list');
        } catch (err) {
            console.error('Error saving post:', err);
            alert('Failed to save post');
        } finally {
            setSaving(false);
        }
    };

    // --- DELETE ---
    const handleDelete = async (post) => {
        if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
        try {
            if (post.featuredImage && post.featuredImage.includes('firebasestorage')) {
                const imgRef = ref(storage, post.featuredImage);
                await deleteObject(imgRef).catch(() => { });
            }
            await deleteDoc(doc(db, 'blogPosts', post.id));
            setPosts(prev => prev.filter(p => p.id !== post.id));
            showToast('Post deleted');
        } catch (err) {
            console.error('Error deleting post:', err);
            alert('Failed to delete post');
        }
    };

    // --- EDIT ---
    const startEdit = (post) => {
        setEditingPost(post);
        setTitle(post.title || '');
        setSlug(post.slug || '');
        setDescription(post.description || '');
        setContent(post.content || '');
        setCategory(post.category || '');
        setFeaturedImageUrl(post.featuredImage || '');
        setFeaturedImage(null);
        setMetaTitle(post.metaTitle || '');
        setMetaDescription(post.metaDescription || '');
        setMetaKeywords(post.metaKeywords || '');
        setStatus(post.status || 'draft');
        setActiveTab('content');
        setView('editor');
    };

    const resetEditor = () => {
        setEditingPost(null);
        setTitle('');
        setSlug('');
        setDescription('');
        setContent('');
        setCategory('');
        setFeaturedImage(null);
        setFeaturedImageUrl('');
        setMetaTitle('');
        setMetaDescription('');
        setMetaKeywords('');
        setStatus('draft');
        setActiveTab('content');
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // --- FORMAT DATE ---
    const formatDate = (ts) => {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // --- FILTERED POSTS ---
    const filteredPosts = posts.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ============================================================
    // RENDER: LIST VIEW
    // ============================================================
    if (view === 'list') {
        return (
            <div className="blog-editor">
                <div className="blog-editor__header">
                    <div className="blog-editor__header-left">
                        <button className="blog-editor__back-btn" onClick={() => router.back()}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1>Blog Posts</h1>
                    </div>
                    <div className="blog-editor__actions">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', padding: '6px 14px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <Search size={16} color="#888" />
                            <input
                                placeholder="Search posts..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', width: '160px' }}
                            />
                        </div>
                        <button
                            className="blog-editor__btn blog-editor__btn--primary"
                            onClick={() => { resetEditor(); setView('editor'); }}
                        >
                            <Plus size={18} /> New Post
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
                    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '16px 22px', flex: 1, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a' }}>{posts.length}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '16px 22px', flex: 1, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Published</div>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#166534' }}>{posts.filter(p => p.status === 'published').length}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '16px 22px', flex: 1, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Drafts</div>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#92400e' }}>{posts.filter(p => p.status !== 'published').length}</div>
                    </div>
                </div>

                {/* Post List */}
                {loadingPosts ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading posts...</div>
                ) : filteredPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                        <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', color: '#ddd' }} />
                        <h3 style={{ margin: '0 0 8px', color: '#777' }}>
                            {searchTerm ? 'No posts match your search' : 'No blog posts yet'}
                        </h3>
                        <p style={{ fontSize: '14px' }}>
                            {searchTerm ? 'Try a different search term' : 'Click "New Post" to create your first blog post'}
                        </p>
                    </div>
                ) : (
                    <div className="blog-list__grid">
                        {filteredPosts.map(post => (
                            <div key={post.id} className="blog-list__item" onClick={() => startEdit(post)}>
                                {post.featuredImage ? (
                                    <img src={post.featuredImage} alt="" className="blog-list__item-img" />
                                ) : (
                                    <div className="blog-list__item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ImageIcon size={20} color="#ccc" />
                                    </div>
                                )}
                                <div className="blog-list__item-info">
                                    <h4 className="blog-list__item-title">{post.title}</h4>
                                    <div className="blog-list__item-meta">
                                        {post.category && <span><Tag size={12} /> {post.category}</span>}
                                        <span><Clock size={12} /> {formatDate(post.createdAt)}</span>
                                        <span className={`blog-list__status blog-list__status--${post.status === 'published' ? 'published' : 'draft'}`}>
                                            {post.status === 'published' ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                </div>
                                <div className="blog-list__item-actions" onClick={e => e.stopPropagation()}>
                                    {post.status === 'published' && post.slug && (
                                        <a
                                            href={`/blog/${post.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="View Live Post"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                width: '32px', height: '32px', borderRadius: '6px',
                                                background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534'
                                            }}
                                        >
                                            <ExternalLink size={15} />
                                        </a>
                                    )}
                                    <button onClick={() => startEdit(post)} title="Edit"><Edit2 size={16} /></button>
                                    <button className="delete-btn" onClick={() => handleDelete(post)} title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {toast && <div className="blog-toast">{toast}</div>}
            </div>
        );
    }

    // ============================================================
    // RENDER: EDITOR VIEW
    // ============================================================
    return (
        <div className="blog-editor">
            {/* Header */}
            <div className="blog-editor__header">
                <div className="blog-editor__header-left">
                    <button className="blog-editor__back-btn" onClick={() => { resetEditor(); setView('list'); }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>{editingPost ? 'Edit Post' : 'New Post'}</h1>
                </div>
                <div className="blog-editor__actions">
                    {/* PREVIEW BUTTON — always visible in editor */}
                    <button
                        className="blog-editor__btn blog-editor__btn--secondary"
                        onClick={() => setShowPreview(true)}
                        title="Preview post as it will appear on the blog"
                    >
                        <LayoutTemplate size={16} /> Preview
                    </button>

                    {editingPost?.status === 'published' && editingPost?.slug && (
                        <a
                            href={`/blog/${editingPost.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="blog-editor__btn blog-editor__btn--secondary"
                            style={{ textDecoration: 'none', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                        >
                            <ExternalLink size={16} /> View Live Post
                        </a>
                    )}
                    <button
                        className="blog-editor__btn blog-editor__btn--secondary"
                        onClick={() => handleSave('draft')}
                        disabled={saving}
                    >
                        <EyeOff size={16} /> {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                        className="blog-editor__btn blog-editor__btn--primary"
                        onClick={() => handleSave('published')}
                        disabled={saving}
                    >
                        <Eye size={16} /> {saving ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </div>

            {/* Title Input */}
            <div className="blog-editor__card" style={{ padding: '0' }}>
                <input
                    type="text"
                    className="blog-editor__input blog-editor__input--title"
                    placeholder="Enter post title..."
                    value={title}
                    onChange={e => handleTitleChange(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '20px 24px' }}
                />
            </div>

            {/* Tabs */}
            <div className="blog-editor__tabs">
                <button
                    className={`blog-editor__tab ${activeTab === 'content' ? 'blog-editor__tab--active' : ''}`}
                    onClick={() => setActiveTab('content')}
                >
                    Content
                </button>
                <button
                    className={`blog-editor__tab ${activeTab === 'seo' ? 'blog-editor__tab--active' : ''}`}
                    onClick={() => setActiveTab('seo')}
                >
                    SEO & Meta
                </button>
            </div>

            {/* CONTENT TAB */}
            {activeTab === 'content' && (
                <>
                    {/* Slug + Description + Category */}
                    <div className="blog-editor__card">
                        <h3>Post Details</h3>

                        <div className="blog-editor__field">
                            <label className="blog-editor__label">Slug (URL)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '13px', color: '#999' }}>/blog/</span>
                                <input
                                    type="text"
                                    className="blog-editor__input"
                                    value={slug}
                                    onChange={e => setSlug(generateSlug(e.target.value))}
                                    placeholder="post-url-slug"
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>

                        <div className="blog-editor__field">
                            <label className="blog-editor__label">Short Description (shown on blog grid)</label>
                            <textarea
                                className="blog-editor__textarea"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Brief description of the post for the blog listing page..."
                                rows={3}
                            />
                        </div>

                        <div className="blog-editor__field">
                            <label className="blog-editor__label">Category</label>
                            <div className="blog-editor__category-row">
                                <select
                                    className="blog-editor__category-select"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                                {!showNewCatInput ? (
                                    <button className="blog-editor__add-cat-btn" onClick={() => setShowNewCatInput(true)}>
                                        <Plus size={14} /> New
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input
                                            type="text"
                                            className="blog-editor__input"
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            placeholder="Category name"
                                            style={{ width: '160px' }}
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                        />
                                        <button className="blog-editor__add-cat-btn" onClick={handleAddCategory} style={{ background: '#1a1a1a', color: '#fff', border: 'none' }}>
                                            Add
                                        </button>
                                        <button className="blog-editor__add-cat-btn" onClick={() => { setShowNewCatInput(false); setNewCategoryName(''); }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rich Text Editor */}
                    <div className="blog-editor__card">
                        <h3>Article Content</h3>
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Write your article here..."
                            style={{ minHeight: '400px' }}
                        />
                    </div>

                    {/* Featured Image */}
                    <div className="blog-editor__card">
                        <h3>Featured Image</h3>
                        {featuredImageUrl ? (
                            <div className="blog-editor__image-preview">
                                <img src={featuredImageUrl} alt="Featured" />
                                <button className="blog-editor__image-remove" onClick={removeImage} title="Remove Image">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="blog-editor__image-upload">
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                />
                                <ImageIcon size={32} color="#ccc" style={{ marginBottom: '10px' }} />
                                <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#555' }}>Click or drag to upload</p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>Recommended: 1200 × 630 px</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SEO TAB */}
            {activeTab === 'seo' && (
                <div className="blog-editor__card">
                    <h3>SEO & Meta Data</h3>

                    <div className="blog-editor__field">
                        <label className="blog-editor__label">Meta Title</label>
                        <input
                            type="text"
                            className="blog-editor__input"
                            value={metaTitle}
                            onChange={e => setMetaTitle(e.target.value)}
                            placeholder="SEO title (defaults to post title if empty)"
                        />
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            {(metaTitle || title).length}/60 characters
                        </div>
                    </div>

                    <div className="blog-editor__field">
                        <label className="blog-editor__label">Meta Description</label>
                        <textarea
                            className="blog-editor__textarea"
                            value={metaDescription}
                            onChange={e => setMetaDescription(e.target.value)}
                            placeholder="SEO description for search engines..."
                            rows={3}
                        />
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            {metaDescription.length}/160 characters
                        </div>
                    </div>

                    <div className="blog-editor__field">
                        <label className="blog-editor__label">Keywords</label>
                        <input
                            type="text"
                            className="blog-editor__input"
                            value={metaKeywords}
                            onChange={e => setMetaKeywords(e.target.value)}
                            placeholder="keyword1, keyword2, keyword3..."
                        />
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            Separate keywords with commas
                        </div>
                    </div>

                    {/* SEO Preview */}
                    <div style={{ marginTop: '24px', padding: '20px', background: '#f9f9f9', borderRadius: '10px', border: '1px solid #eee' }}>
                        <div style={{ fontSize: '12px', color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                            Google Preview
                        </div>
                        <div style={{ fontSize: '18px', color: '#1a0dab', fontWeight: 400, marginBottom: '4px', lineHeight: 1.3 }}>
                            {metaTitle || title || 'Post Title'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#006621', marginBottom: '4px' }}>
                            costerbox.com/blog/{slug || 'post-slug'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#545454', lineHeight: 1.5 }}>
                            {metaDescription || description || 'Enter a meta description to see preview...'}
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="blog-toast">{toast}</div>}

            {/* ============================================================ */}
            {/* PREVIEW MODAL                                                 */}
            {/* ============================================================ */}
            {showPreview && (
                <div className="blog-preview-overlay" onClick={() => setShowPreview(false)}>
                    <div className="blog-preview-modal" onClick={e => e.stopPropagation()}>

                        {/* Preview Header Bar */}
                        <div className="blog-preview-topbar">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <LayoutTemplate size={18} color="#888" />
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#555' }}>
                                    Blog Post Preview
                                </span>
                                <span style={{
                                    fontSize: '11px', background: '#fef3c7', color: '#92400e',
                                    padding: '3px 10px', borderRadius: '20px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                    Draft
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: '#aaa' }}>
                                    /blog/{slug || 'post-slug'}
                                </span>
                                <button
                                    className="blog-editor__btn blog-editor__btn--primary"
                                    onClick={() => { setShowPreview(false); handleSave('published'); }}
                                    style={{ fontSize: '13px', padding: '8px 18px' }}
                                >
                                    <Eye size={14} /> Publish Now
                                </button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '6px', borderRadius: '6px', color: '#888',
                                        display: 'flex', alignItems: 'center'
                                    }}
                                    title="Close preview"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Preview Content matches live blog post layout */}
                        <div className="blog-preview-body">
                            <div className="single-post-wrapper" style={{ maxWidth: '860px', margin: '0 auto' }}>

                                {/* Category + Title */}
                                <div className="single-post__header-area">
                                    {category && (
                                        <span className="single-post__category">{category}</span>
                                    )}
                                    <h1 className="single-post__title">
                                        {title || <span style={{ color: '#ccc', fontStyle: 'italic' }}>No title yet</span>}
                                    </h1>
                                </div>

                                {/* Meta bar */}
                                <div className="single-post__meta">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#999' }}>
                                        <Clock size={14} /> {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#999' }}>
                                        <Tag size={14} /> {category || 'Uncategorised'}
                                    </span>
                                </div>

                                {/* Description / Intro */}
                                {description && (
                                    <p style={{
                                        fontSize: '18px', color: '#555', lineHeight: '1.7',
                                        borderLeft: '4px solid #1a1a1a', paddingLeft: '20px',
                                        margin: '0 0 30px', fontStyle: 'italic'
                                    }}>
                                        {description}
                                    </p>
                                )}

                                {/* Featured Image */}
                                {featuredImageUrl && (
                                    <div className="single-post__feature-image">
                                        <img src={featuredImageUrl} alt={title || 'Featured'} />
                                    </div>
                                )}

                                {/* Article Content */}
                                {content ? (
                                    <div
                                        className="single-post__content"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                    />
                                ) : (
                                    <div style={{
                                        textAlign: 'center', padding: '60px 20px',
                                        color: '#ccc', border: '2px dashed #eee', borderRadius: '12px'
                                    }}>
                                        <FileText size={40} strokeWidth={1} style={{ marginBottom: '12px' }} />
                                        <p style={{ margin: 0, fontSize: '16px' }}>No content written yet</p>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
