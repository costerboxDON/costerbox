/* src/app/secured/superadmin/categories/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Trash2, Plus, ArrowLeft, Edit2, Check, X, Image as ImageIcon, Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CategoriesPage() {
    const router = useRouter();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [adding, setAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit states
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [uploadingId, setUploadingId] = useState(null);

    // Bulk Select states
    const [selectedIds, setSelectedIds] = useState([]);

    // FETCH CATEGORIES
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const cats = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategories(cats);
        } catch (error) {
            console.error("Error fetching categories: ", error);
        } finally {
            setLoading(false);
        }
    };

    // ADD CATEGORY
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        setAdding(true);
        try {
            await addDoc(collection(db, 'categories'), {
                name: newCategory.trim(),
                createdAt: new Date(),
                imageUrl: '' // Initialize with empty image
            });
            setNewCategory('');
            fetchCategories(); // Refresh list
        } catch (error) {
            console.error("Error adding category: ", error);
            alert("Failed to add category.");
        } finally {
            setAdding(false);
        }
    };

    // DELETE CATEGORY
    const handleDeleteCategory = async (id, name, imageUrl) => {
        if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) {
            return;
        }

        try {
            // Delete image from storage if it exists
            if (imageUrl && imageUrl.includes('firebasestorage')) {
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef).catch(e => console.log("Storage delete error", e));
            }
            await deleteDoc(doc(db, 'categories', id));
            setCategories(prev => prev.filter(cat => cat.id !== id));
            setSelectedIds(prev => prev.filter(sid => sid !== id));
        } catch (error) {
            console.error("Error deleting category: ", error);
            alert("Failed to delete category.");
        }
    };

    // EDIT CATEGORY NAME
    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditName(cat.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEdit = async (id) => {
        if (!editName.trim()) return;
        try {
            await updateDoc(doc(db, 'categories', id), {
                name: editName.trim()
            });
            setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editName.trim() } : c));
            setEditingId(null);
        } catch (error) {
            console.error("Error updating category:", error);
            alert("Failed to update name.");
        }
    };

    // IMAGE UPLOAD
    const handleImageUpload = async (id, file) => {
        if (!file) return;
        setUploadingId(id);
        try {
            const fileRef = ref(storage, `categories/${id}_${Date.now()}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            await updateDoc(doc(db, 'categories', id), {
                imageUrl: downloadUrl
            });

            setCategories(prev => prev.map(c => c.id === id ? { ...c, imageUrl: downloadUrl } : c));
            alert("Feature image updated!");
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload image.");
        } finally {
            setUploadingId(null);
        }
    };

    // BULK ACTIONS
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === categories.length) setSelectedIds([]);
        else setSelectedIds(categories.map(c => c.id));
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Delete ${selectedIds.length} selected categories?`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            for (const id of selectedIds) {
                const cat = categories.find(c => c.id === id);
                if (cat?.imageUrl) {
                    const imageRef = ref(storage, cat.imageUrl);
                    await deleteObject(imageRef).catch(() => { });
                }
                batch.delete(doc(db, 'categories', id));
            }
            await batch.commit();
            setCategories(prev => prev.filter(c => !selectedIds.includes(c.id)));
            setSelectedIds([]);
            alert("Bulk delete successful");
        } catch (error) {
            console.error(error);
            alert("Bulk delete failed");
        } finally {
            setLoading(false);
        }
    };

    // FILTERED CATEGORIES
    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.titleGroup}>
                    <button onClick={() => router.back()} style={styles.backBtn}><ArrowLeft size={20} /></button>
                    <h1 style={styles.title}>Manage Categories</h1>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={styles.searchBox}>
                        <Search size={16} color="#888" />
                        <input
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                    <div style={styles.countBadge}>{filteredCategories.length} Categories</div>
                </div>
            </div>

            <div style={styles.content}>
                {/* ADD NEW FORM */}
                <div style={styles.addSection}>
                    <h3 style={styles.sectionTitle}>Add New Category</h3>
                    <form onSubmit={handleAddCategory} style={styles.form}>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Enter category name (e.g. Sarees)"
                            style={styles.input}
                            disabled={adding}
                        />
                        <button type="submit" style={styles.addBtn} disabled={adding || !newCategory.trim()}>
                            {adding ? 'Adding...' : <><Plus size={18} /> Add Category</>}
                        </button>
                    </form>
                </div>

                {/* BULK ACTIONS BAR */}
                {categories.length > 0 && (
                    <div style={styles.bulkBar}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={selectedIds.length === categories.length && categories.length > 0}
                                onChange={selectAll}
                                style={styles.checkbox}
                            />
                            <span style={{ fontSize: '14px', color: '#666' }}>
                                {selectedIds.length} selected
                            </span>
                        </div>
                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDelete} style={styles.bulkDeleteBtn}>
                                <Trash2 size={16} /> Delete Selected
                            </button>
                        )}
                    </div>
                )}

                {/* CATEGORY LIST */}
                <div style={styles.listSection}>
                    <h3 style={styles.sectionTitle}>All Categories</h3>
                    {loading && categories.length === 0 ? (
                        <p style={{ color: '#666' }}>Loading categories...</p>
                    ) : filteredCategories.length === 0 ? (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No categories found matching "{searchTerm}".</p>
                    ) : (
                        <div style={styles.grid}>
                            {filteredCategories.map((cat) => (
                                <div key={cat.id} style={{
                                    ...styles.card,
                                    border: selectedIds.includes(cat.id) ? '1.5px solid #1a1a1a' : '1px solid #eee',
                                    background: selectedIds.includes(cat.id) ? '#f0f0f0' : '#f9f9f9'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', marginBottom: '10px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(cat.id)}
                                            onChange={() => toggleSelect(cat.id)}
                                            style={styles.checkbox}
                                        />
                                        <div style={styles.imageBox}>
                                            {cat.imageUrl ? (
                                                <img src={cat.imageUrl} style={styles.previewImg} alt="" />
                                            ) : (
                                                <ImageIcon size={20} color="#ccc" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id={`img-${cat.id}`}
                                                style={{ display: 'none' }}
                                                onChange={(e) => handleImageUpload(cat.id, e.target.files[0])}
                                            />
                                            <label htmlFor={`img-${cat.id}`} style={styles.imageOverlay}>
                                                {uploadingId === cat.id ? <Loader2 className="spinner" size={16} /> : <Edit2 size={12} />}
                                            </label>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            {editingId === cat.id ? (
                                                <div style={styles.editRow}>
                                                    <input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        style={styles.editInput}
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveEdit(cat.id)} style={styles.saveBtn}><Check size={16} /></button>
                                                    <button onClick={cancelEdit} style={styles.cancelBtn}><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={styles.catName}>{cat.name}</span>
                                                    <button onClick={() => startEdit(cat)} style={styles.iconBtn} title="Edit Name">
                                                        <Edit2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleDeleteCategory(cat.id, cat.name, cat.imageUrl)}
                                            style={styles.deleteBtn}
                                            title="Delete Category"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

const styles = {
    container: { maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' },
    titleGroup: { display: 'flex', alignItems: 'center', gap: '15px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#333' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 },
    countBadge: { background: '#e0e0e0', padding: '5px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', color: '#555' },
    content: { display: 'flex', flexDirection: 'column', gap: '20px' },
    addSection: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '15px', color: '#333' },
    form: { display: 'flex', gap: '12px' },
    input: { flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', outline: 'none' },
    addBtn: { background: '#1a1a1a', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
    bulkBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' },
    bulkDeleteBtn: { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
    checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
    listSection: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' },
    grid: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' },
    card: { padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' },
    imageBox: { width: '50px', height: '50px', background: '#eee', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
    searchBox: { display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', width: '200px' },
    searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', marginLeft: '8px', width: '100%' },
    imageOverlay: { position: 'absolute', bottom: 0, right: 0, left: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' },
    cardHover: { '&:hover .imageOverlay': { opacity: 1 } }, // Note: CSS-in-JS pseudo-classes don't work like this in inline styles
    editRow: { display: 'flex', gap: '8px', alignItems: 'center' },
    editInput: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' },
    saveBtn: { background: '#dcfce7', color: '#166534', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer' },
    cancelBtn: { background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer' },
    iconBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' },
    catName: { fontWeight: '600', fontSize: '16px', color: '#111' },
    deleteBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }
};

// Add hover styles manually via class or extra logic
// (Using style inject or just making overlay visible on hover is tricky with standard React inline styles)
// Let's add the overlay visibility rule directly
styles.imageBox = { ...styles.imageBox, cursor: 'pointer' };
