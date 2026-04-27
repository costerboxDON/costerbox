/* src/app/secured/superadmin/add-product/page.js */
"use client";
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { db, storage } from '../../../../lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './add-product.css';

// Dynamically import React Quill (SSR-safe for Next.js)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

function AddProductContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // FORM STATE
    const [formData, setFormData] = useState({
        title: '', description: '', price: '', comparePrice: '', costPerItem: '',
        stock: '', sku: '', barcode: '', weight: '', hsCode: '',
        status: 'Active', category: '', vendor: 'Costerbox',
        media: [], tags: '',
        seoTitle: '', seoDesc: '', seoHandle: '',
        // NEW FIELDS
        sizes: '', // Comma separated string for input
        highlights: [], // Array of { label, value }
        materials: '',
        shippingInfo: '',
        careInfo: '',
        faqs: '',

        sizeGuideImage: '' // CHANGED: from sizeGuide text to Image URL
    });

    // MEDIA & CATEGORY STATE
    const [categories, setCategories] = useState([]);

    // ========= FETCH CATEGORIES FROM FIRESTORE =========
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catSnap = await getDocs(collection(db, 'categories'));
                const cats = catSnap.docs.map(d => d.data().name).filter(Boolean);
                setCategories(cats);
                if (cats.length > 0 && !formData.category) {
                    setFormData(prev => ({ ...prev, category: cats[0] }));
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                setCategories(['Sarees', 'Lehengas', 'Suits', 'Fabrics', 'Menswear']);
            }
        };
        fetchCategories();
    }, []);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCat, setNewCat] = useState('');
    const [imageFiles, setImageFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    // SIZE GUIDE IMAGE STATE
    const [sizeGuideFile, setSizeGuideFile] = useState(null);
    const [sizeGuidePreview, setSizeGuidePreview] = useState(null);

    // DRAG & DROP STATE
    const [dragIndex, setDragIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragSource, setDragSource] = useState(null); // 'existing' or 'new'

    // SEO AUTO-GENERATE STATE
    const [seoManualTitle, setSeoManualTitle] = useState(false);
    const [seoManualDesc, setSeoManualDesc] = useState(false);
    const [seoManualHandle, setSeoManualHandle] = useState(false);

    // ========= QUILL CONFIG =========
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'clean']
        ],
    }), []);

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'link'
    ];

    // ========= FETCH DATA IF EDITING =========
    useEffect(() => {
        if (editId) {
            const fetchData = async () => {
                const docSnap = await getDoc(doc(db, "products", editId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        ...data,
                        media: data.media || (data.featuredImage ? [data.featuredImage] : []),
                        seoTitle: data.seoTitle || '',
                        seoDesc: data.seoDesc || '',
                        seoHandle: data.seoHandle || '',

                        // Ensure tags is ALWAYS a string for the input
                        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),

                        // Map new fields
                        sizes: (data.sizes || []).join(', '),
                        highlights: data.highlights || [],
                        materials: data.materials || '',
                        shippingInfo: data.shippingInfo || '',
                        careInfo: data.careInfo || '',
                        faqs: data.faqs || '',

                        sizeGuideImage: data.sizeGuideImage || '' // Load existing image
                    });
                    // If editing & seo fields were manually set, mark them as manual
                    if (data.seoTitle) setSeoManualTitle(true);
                    if (data.seoDesc) setSeoManualDesc(true);
                    if (data.seoHandle) setSeoManualHandle(true);
                }
            };
            fetchData();
        }
    }, [editId]);

    // ========= SEO AUTO-GENERATION =========
    useEffect(() => {
        if (!seoManualTitle && formData.title) {
            setFormData(prev => ({ ...prev, seoTitle: prev.title }));
        }
    }, [formData.title, seoManualTitle]);

    useEffect(() => {
        if (!seoManualDesc && formData.description) {
            const plainText = formData.description.replace(/<[^>]*>/g, '').trim();
            const truncated = plainText.length > 160 ? plainText.substring(0, 157) + '...' : plainText;
            setFormData(prev => ({ ...prev, seoDesc: truncated }));
        }
    }, [formData.description, seoManualDesc]);

    useEffect(() => {
        if (!seoManualHandle && formData.title) {
            const handle = formData.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            setFormData(prev => ({ ...prev, seoHandle: handle }));
        }
    }, [formData.title, seoManualHandle]);

    // ========= HANDLERS =========
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Highlight Handlers
    const addHighlight = () => {
        setFormData(prev => ({ ...prev, highlights: [...(prev.highlights || []), { label: '', value: '' }] }));
    };

    const updateHighlight = (index, field, val) => {
        const updated = [...(formData.highlights || [])];
        updated[index][field] = val;
        setFormData({ ...formData, highlights: updated });
    };

    const removeHighlight = (index) => {
        const updated = (formData.highlights || []).filter((_, i) => i !== index);
        setFormData({ ...formData, highlights: updated });
    };

    const handleFileSelect = (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...files]);
            setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
        }
    };

    const removeMedia = (index, isExisting) => {
        if (isExisting) {
            const updated = formData.media.filter((_, i) => i !== index);
            setFormData({ ...formData, media: updated });
        } else {
            const updatedFiles = imageFiles.filter((_, i) => i !== index);
            const updatedPreviews = previews.filter((_, i) => i !== index);
            setImageFiles(updatedFiles);
            setPreviews(updatedPreviews);
        }
    };

    // SIZE GUIDE HANDLE SELECT
    const handleSizeGuideFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSizeGuideFile(file);
            setSizeGuidePreview(URL.createObjectURL(file));
        }
    };

    // ========= DRAG & DROP (Shopify-style) =========
    const handleDragStart = (e, index, source) => {
        setDragIndex(index);
        setDragSource(source);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index, source) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Only allow reordering within the same group
        if (source === dragSource) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e, dropIndex, source) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === dropIndex || source !== dragSource) {
            setDragIndex(null);
            setDragOverIndex(null);
            setDragSource(null);
            return;
        }

        if (source === 'existing') {
            const updated = [...formData.media];
            const [draggedItem] = updated.splice(dragIndex, 1);
            updated.splice(dropIndex, 0, draggedItem);
            setFormData({ ...formData, media: updated });
        } else {
            const updatedFiles = [...imageFiles];
            const updatedPreviews = [...previews];
            const [draggedFile] = updatedFiles.splice(dragIndex, 1);
            const [draggedPreview] = updatedPreviews.splice(dragIndex, 1);
            updatedFiles.splice(dropIndex, 0, draggedFile);
            updatedPreviews.splice(dropIndex, 0, draggedPreview);
            setImageFiles(updatedFiles);
            setPreviews(updatedPreviews);
        }

        setDragIndex(null);
        setDragOverIndex(null);
        setDragSource(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
        setDragSource(null);
    };

    const handleAddCategory = async () => {
        if (newCat && newCat.trim()) {
            const trimmed = newCat.trim();
            try {
                // Save to Firestore categories collection
                await addDoc(collection(db, 'categories'), { name: trimmed, createdAt: new Date() });
                setCategories([...categories, trimmed]);
                setFormData({ ...formData, category: trimmed });
            } catch (err) {
                console.error('Error adding category:', err);
                setCategories([...categories, trimmed]);
                setFormData({ ...formData, category: trimmed });
            }
            setNewCat('');
            setIsAddingCategory(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedSku = formData.sku?.trim();
        if (!trimmedSku) {
            alert("SKU is required.");
            return;
        }

        setLoading(true);
        try {
            // Check for duplicate SKU
            const skuQuery = query(collection(db, "products"), where("sku", "==", trimmedSku));
            const skuSnap = await getDocs(skuQuery);
            const exists = skuSnap.docs.some(doc => doc.id !== editId);

            if (exists) {
                alert(`The SKU "${trimmedSku}" is already in use by another product. Please choose a unique SKU.`);
                setLoading(false);
                return;
            }

            let finalMedia = [...formData.media];

            if (imageFiles.length > 0) {
                setUploading(true);
                const uploadPromises = imageFiles.map(async (file) => {
                    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                    await uploadBytes(storageRef, file);
                    return await getDownloadURL(storageRef);
                });
                const newUrls = await Promise.all(uploadPromises);
                finalMedia = [...finalMedia, ...newUrls];
                setUploading(false);
            }

            // UPLOAD SIZE GUIDE IMAGE IF NEW FILE IS SELECTED
            let finalSizeGuideImage = formData.sizeGuideImage;
            if (sizeGuideFile) {
                setUploading(true);
                const sgRef = ref(storage, `size_guides/${Date.now()}_${sizeGuideFile.name}`);
                await uploadBytes(sgRef, sizeGuideFile);
                finalSizeGuideImage = await getDownloadURL(sgRef);
                setUploading(false);
            }

            console.log("FINAL SIZE GUIDE SAVING:", finalSizeGuideImage); // DEBUG LOG

            // Parse tags string into array
            let tagsArray = [];
            if (Array.isArray(formData.tags)) {
                tagsArray = formData.tags;
            } else if (typeof formData.tags === 'string') {
                tagsArray = formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            }
            const sizesArray = (formData.sizes || '').split(',').map(s => s.trim()).filter(Boolean);

            const payload = {
                ...formData,
                price: Number(formData.price),
                stock: Number(formData.stock),
                media: finalMedia,
                featuredImage: finalMedia[0] || '',
                tags: tagsArray,
                sizes: sizesArray, // Override string with array
                seoTitle: formData.seoTitle,
                seoDesc: formData.seoDesc,
                seoHandle: formData.seoHandle,
                sizeGuideImage: finalSizeGuideImage, // Save the URL
                updatedAt: new Date()
            };

            if (editId) {
                await updateDoc(doc(db, "products", editId), payload);
                alert("Saved Changes!");
            } else {
                payload.createdAt = new Date();
                await addDoc(collection(db, "products"), payload);
                alert("Product Created!");
            }
            router.push('/secured/superadmin/manage-products');
        } catch (err) {
            alert("Error: " + err.message);
        }
        setLoading(false);
    };

    // ========= SEO CHARACTER COUNTS =========
    const seoTitleCount = (formData.seoTitle || '').length;
    const seoDescCount = (formData.seoDesc || '').length;

    return (
        <div className="page-container">

            {/* HEADER */}
            <div className="header-actions">
                <h1 className="page-title">{editId ? 'Edit Product' : 'Add Product'}</h1>
                <button onClick={() => router.back()} className="btn-secondary" style={{ color: '#000', borderColor: '#ddd' }}>
                    Discard
                </button>
            </div>

            <form onSubmit={handleSubmit} className="main-layout">

                {/* === LEFT COLUMN (MAIN CONTENT) === */}
                <div className="left-column">

                    {/* 1. Title & Description */}
                    <div className="card">
                        <div className="form-group">
                            <label>Title</label>
                            <input name="title" value={formData.title} onChange={handleChange} className="input-field" placeholder="Short sleeve t-shirt" required />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <div className="quill-wrapper">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.description}
                                    onChange={(value) => setFormData({ ...formData, description: value })}
                                    modules={quillModules}
                                    formats={quillFormats}
                                    placeholder="Write a detailed product description..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Highlights & Sizes (NEW) */}
                    <div className="card">
                        <h3>Product Attributes</h3>

                        <div className="form-group">
                            <label>Sizes (Separate by comma)</label>
                            <input
                                name="sizes"
                                value={formData.sizes}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="S, M, L, XL, XXL"
                            />
                        </div>

                        <div className="form-group">
                            <label>Highlights (e.g. Fit, Fabric, Color)</label>
                            {formData.highlights && formData.highlights.map((h, i) => (
                                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <input
                                        className="input-field"
                                        placeholder="Label (e.g. Fit)"
                                        value={h.label}
                                        onChange={(e) => updateHighlight(i, 'label', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        className="input-field"
                                        placeholder="Value (e.g. Regular)"
                                        value={h.value}
                                        onChange={(e) => updateHighlight(i, 'value', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeHighlight(i)}
                                        style={{ background: '#ff4444', color: '#fff', border: 'none', borderRadius: '4px', width: '36px', cursor: 'pointer', fontSize: '18px' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addHighlight}
                                className="btn-secondary"
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                                + Add Highlight
                            </button>
                        </div>
                    </div>

                    {/* 3. Detailed Information (NEW) */}
                    <div className="card">
                        <h3>Detailed Information</h3>

                        <div className="form-group">
                            <label>Materials</label>
                            <ReactQuill theme="snow" value={formData.materials} onChange={(val) => setFormData({ ...formData, materials: val })} modules={quillModules} formats={quillFormats} placeholder="Material details..." />
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>Shipping Info</label>
                            <ReactQuill theme="snow" value={formData.shippingInfo} onChange={(val) => setFormData({ ...formData, shippingInfo: val })} modules={quillModules} formats={quillFormats} placeholder="Shipping details..." />
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>Care Instructions</label>
                            <ReactQuill theme="snow" value={formData.careInfo} onChange={(val) => setFormData({ ...formData, careInfo: val })} modules={quillModules} formats={quillFormats} placeholder="Care instructions..." />
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>FAQs</label>
                            <ReactQuill theme="snow" value={formData.faqs} onChange={(val) => setFormData({ ...formData, faqs: val })} modules={quillModules} formats={quillFormats} placeholder="Product FAQs..." />
                        </div>

                        <div className="form-group" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <label style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>Size Guide Image</label>

                            <div style={{
                                border: '2px dashed #ccc',
                                borderRadius: '8px',
                                padding: '20px',
                                textAlign: 'center',
                                background: '#f9f9f9',
                                position: 'relative'
                            }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSizeGuideFileSelect}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer',
                                        zIndex: 10
                                    }}
                                />

                                {sizeGuidePreview || formData.sizeGuideImage ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img
                                            src={sizeGuidePreview || formData.sizeGuideImage}
                                            alt="Size Guide"
                                            style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', border: '1px solid #ddd' }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Click to change image</p>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation(); // Stop click from triggering input
                                                // We need to set z-index of input to -1 temporarily or handle this better
                                                // Actually, simpler to just have a clear button outside the input area or overlay with higher z-index
                                            }}
                                            style={{
                                                display: 'none' // Removing the delete button for now to simplify interaction, replacing works fine
                                            }}
                                        >
                                            ×
                                        </button>
                                        {/* Custom Close Button Overlay that actually works with z-index */}
                                        <div
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSizeGuideFile(null);
                                                setSizeGuidePreview(null);
                                                setFormData({ ...formData, sizeGuideImage: '' });
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '-10px',
                                                right: '-10px',
                                                background: 'red',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                zIndex: 20, // Higher than input
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            ×
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ fontSize: '30px', marginBottom: '10px' }}>🖼️</div>
                                        <p style={{ margin: 0, fontWeight: '500', color: '#333' }}>Click to upload Size Chart Image</p>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#888' }}>Supports JPG, PNG, WEBP</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 4. Media — Drag & Drop Reorder */}
                    <div className="card">
                        <h3>
                            Media
                            {(formData.media.length > 0 || previews.length > 0) && (
                                <span className="media-hint">— drag to reorder, first image is featured</span>
                            )}
                        </h3>
                        <div className="media-dropzone">
                            <input type="file" multiple onChange={handleFileSelect} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                            <div className="dropzone-icon">📁</div>
                            <p>Drag & drop images here</p>
                            <span className="dropzone-link">or click to browse files</span>
                        </div>

                        {/* Existing Media (from DB when editing) */}
                        {formData.media.length > 0 && (
                            <div className="media-grid">
                                {formData.media.map((url, i) => (
                                    <div
                                        key={`existing-${i}`}
                                        className={`media-item${dragIndex === i && dragSource === 'existing' ? ' dragging' : ''}${dragOverIndex === i && dragSource === 'existing' ? ' drag-over' : ''}${i === 0 ? ' featured' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, i, 'existing')}
                                        onDragOver={(e) => handleDragOver(e, i, 'existing')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, i, 'existing')}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="drag-handle">⠿</div>
                                        <div className="media-order">{i + 1}</div>
                                        <img src={url} alt="media" />
                                        <button type="button" onClick={() => removeMedia(i, true)} className="remove-media">×</button>
                                        {i === 0 && <div className="featured-badge">★ MAIN</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* New Uploads (Previews) */}
                        {previews.length > 0 && (
                            <>
                                {formData.media.length > 0 && <div className="media-divider">New uploads</div>}
                                <div className="media-grid">
                                    {previews.map((url, i) => (
                                        <div
                                            key={`new-${i}`}
                                            className={`media-item new-upload${dragIndex === i && dragSource === 'new' ? ' dragging' : ''}${dragOverIndex === i && dragSource === 'new' ? ' drag-over' : ''}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, i, 'new')}
                                            onDragOver={(e) => handleDragOver(e, i, 'new')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, i, 'new')}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <div className="drag-handle">⠿</div>
                                            <div className="media-order">{formData.media.length + i + 1}</div>
                                            <img src={url} alt="preview" />
                                            <button type="button" onClick={() => removeMedia(i, false)} className="remove-media">×</button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 5. Pricing */}
                    <div className="card">
                        <h3>Pricing</h3>
                        <div className="form-row">
                            <div className="form-col">
                                <label>Price</label>
                                <input name="price" type="number" value={formData.price} onChange={handleChange} className="input-field" placeholder="₹ 0.00" required />
                            </div>
                            <div className="form-col">
                                <label>Compare-at price</label>
                                <input name="comparePrice" type="number" value={formData.comparePrice} onChange={handleChange} className="input-field" placeholder="₹ 0.00" />
                                <div className="helper-text">To show a reduced price, move the original price here.</div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-col">
                                <label>Cost per item</label>
                                <input name="costPerItem" type="number" value={formData.costPerItem} onChange={handleChange} className="input-field" placeholder="₹ 0.00" />
                                <div className="helper-text">Customers won't see this</div>
                            </div>
                        </div>
                    </div>

                    {/* 6. Inventory */}
                    <div className="card">
                        <h3>Inventory</h3>
                        <div className="form-row">
                            <div className="form-col">
                                <label>SKU (Stock Keeping Unit)</label>
                                <input name="sku" value={formData.sku} onChange={handleChange} className="input-field" />
                            </div>
                            <div className="form-col">
                                <label>Barcode (ISBN, UPC, GTIN, etc.)</label>
                                <input name="barcode" value={formData.barcode} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Quantity</label>
                            <input name="stock" type="number" value={formData.stock} onChange={handleChange} className="input-field" style={{ width: '150px' }} />
                        </div>
                    </div>

                    {/* 7. Shipping */}
                    <div className="card">
                        <h3>Shipping</h3>
                        <div className="form-row">
                            <div className="form-col">
                                <label>Weight (kg)</label>
                                <input name="weight" value={formData.weight} onChange={handleChange} className="input-field" placeholder="0.0" />
                            </div>
                            <div className="form-col">
                                <label>HS Code</label>
                                <input name="hsCode" value={formData.hsCode} onChange={handleChange} className="input-field" placeholder="Harmonized System Code" />
                            </div>
                        </div>
                    </div>

                    {/* 8. SEO — Dynamic Meta Title & Description */}
                    <div className="card seo-card">
                        <h3>🔍 Search Engine Listing</h3>

                        {/* Google Preview */}
                        <div className="seo-preview">
                            <div className="seo-preview-label">Google Preview</div>
                            <div className="seo-url">
                                https://costerbox.in/products/{formData.seoHandle || formData.sku || '...'}
                            </div>
                            <div className="seo-title-preview">
                                {formData.seoTitle || 'Product Title'}
                            </div>
                            <div className="seo-desc-preview">
                                {formData.seoDesc || 'Product description will appear here automatically when you write a description above.'}
                            </div>
                        </div>

                        {/* SEO Page Title */}
                        <div className="form-group">
                            <label>
                                Page Title
                                {!seoManualTitle && formData.seoTitle && (
                                    <span className="seo-auto-badge">⚡ Auto-generated</span>
                                )}
                            </label>
                            <input
                                className="input-field"
                                value={formData.seoTitle}
                                onChange={(e) => {
                                    setSeoManualTitle(true);
                                    setFormData({ ...formData, seoTitle: e.target.value });
                                }}
                                placeholder="SEO page title"
                            />
                            <div className={`seo-counter${seoTitleCount > 70 ? ' danger' : seoTitleCount > 60 ? ' warning' : ''}`}>
                                {seoTitleCount}/70 characters
                                {seoManualTitle && (
                                    <span className="seo-reset" onClick={() => setSeoManualTitle(false)}>
                                        Reset to auto
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* SEO Meta Description */}
                        <div className="form-group">
                            <label>
                                Meta Description
                                {!seoManualDesc && formData.seoDesc && (
                                    <span className="seo-auto-badge">⚡ Auto-generated</span>
                                )}
                            </label>
                            <textarea
                                className="input-field seo-textarea"
                                value={formData.seoDesc}
                                onChange={(e) => {
                                    setSeoManualDesc(true);
                                    setFormData({ ...formData, seoDesc: e.target.value });
                                }}
                                placeholder="SEO meta description"
                            />
                            <div className={`seo-counter${seoDescCount > 160 ? ' danger' : seoDescCount > 140 ? ' warning' : ''}`}>
                                {seoDescCount}/160 characters
                                {seoManualDesc && (
                                    <span className="seo-reset" onClick={() => setSeoManualDesc(false)}>
                                        Reset to auto
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* URL Handle */}
                        <div className="form-group">
                            <label>
                                URL Handle
                                {!seoManualHandle && formData.seoHandle && (
                                    <span className="seo-auto-badge">⚡ Auto-generated</span>
                                )}
                            </label>
                            <div className="handle-input-wrapper">
                                <span className="handle-prefix">/products/</span>
                                <input
                                    className="input-field handle-input"
                                    value={formData.seoHandle}
                                    onChange={(e) => {
                                        setSeoManualHandle(true);
                                        setFormData({ ...formData, seoHandle: e.target.value });
                                    }}
                                    placeholder="product-url-handle"
                                />
                            </div>
                            {seoManualHandle && (
                                <div className="seo-counter">
                                    <span className="seo-reset" onClick={() => setSeoManualHandle(false)}>
                                        Reset to auto
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* === RIGHT COLUMN (SIDEBAR) === */}
                <div className="right-column">

                    {/* Status */}
                    <div className="card">
                        <h3>Status & Type</h3>
                        <div className="form-group">
                            <label>Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="select-field">
                                <option value="Active">Active</option>
                                <option value="Draft">Draft</option>
                            </select>
                        </div>

                        {/* CUSTOMIZATION TOGGLE */}
                        <div className="form-group" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="isCustomizable"
                                    checked={formData.isCustomizable || false}
                                    onChange={(e) => setFormData({ ...formData, isCustomizable: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontWeight: '500' }}>Is Customizable?</span>
                            </label>
                            <p className="helper-text" style={{ marginLeft: '28px', marginTop: '5px' }}>
                                If checked, users pay 70% advance. Orders are routed to zonal artisans for acceptance.
                            </p>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <span className={`status-badge ${formData.status === 'Active' ? 'status-active' : 'status-draft'}`}>
                                {formData.status}
                            </span>
                            {formData.isCustomizable && (
                                <span className="status-badge" style={{ background: '#e0f2fe', color: '#0369a1', marginLeft: '5px' }}>
                                    Custom
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Organization */}
                    <div className="card">
                        <h3>Product organization</h3>

                        <div className="form-group">
                            <label>Category</label>
                            {!isAddingCategory ? (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <select name="category" value={formData.category} onChange={handleChange} className="select-field">
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setIsAddingCategory(true)} style={{ border: '1px solid #ddd', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <input value={newCat} onChange={(e) => setNewCat(e.target.value)} className="input-field" placeholder="New Category" autoFocus />
                                    <button type="button" onClick={handleAddCategory} style={{ background: 'green', color: '#fff', border: 'none', borderRadius: '4px', width: '30px' }}>✓</button>
                                    <button type="button" onClick={() => setIsAddingCategory(false)} style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', width: '30px' }}>×</button>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Vendor</label>
                            <input name="vendor" value={formData.vendor} onChange={handleChange} className="input-field" />
                        </div>

                        <div className="form-group">
                            <label>Tags</label>
                            <input name="tags" value={formData.tags || ''} onChange={handleChange} placeholder="new-arrival, bestseller, featured" className="input-field" />
                            <div className="helper-text">Separate tags with a comma. Use: <strong>new-arrival</strong>, <strong>bestseller</strong>, <strong>featured</strong> to show on homepage sections.</div>
                        </div>
                    </div>
                </div>

                {/* === SAVE FOOTER === */}
                <div className="save-bar">
                    {uploading && <span style={{ color: '#fff', alignSelf: 'center' }}>Uploading Images...</span>}
                    <button type="submit" className="btn-primary" disabled={loading || uploading}>
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>

            </form>
        </div>
    );
}

// Suspense wrapper for useSearchParams
export default function AddProductPage() {
    return (
        <Suspense fallback={<div style={{ padding: '50px', textAlign: 'center' }}>Loading form...</div>}>
            <AddProductContent />
        </Suspense>
    );
}