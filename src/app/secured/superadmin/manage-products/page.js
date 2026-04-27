/* src/app/secured/superadmin/inventory/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { Search, Filter, Trash2, Edit, ChevronDown, CheckSquare, Square, Package, AlertCircle } from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Listen to products
    const unsubscribe = onSnapshot(collection(db, "products"),
      (snapshot) => {
        const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productList);

        // Extract unique categories for filter
        const uniqueCats = [...new Set(productList.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCats);

        setLoading(false);
      },
      (error) => { setLoading(false); setErrorMsg(error.message); }
    );
    return () => unsubscribe();
  }, []);

  const getTime = (p) => {
    if (!p.createdAt) return 0;
    if (typeof p.createdAt.toMillis === 'function') return p.createdAt.toMillis();
    return new Date(p.createdAt).getTime() || 0;
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || (p.status || 'Active') === statusFilter;
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  }).sort((a, b) => {
    if (sortOption === 'newest') return getTime(b) - getTime(a);
    if (sortOption === 'oldest') return getTime(a) - getTime(b);
    if (sortOption === 'name-asc') return (a.title || '').localeCompare(b.title || '');
    if (sortOption === 'name-desc') return (b.title || '').localeCompare(a.title || '');
    if (sortOption === 'stock-low') return (a.stock || 0) - (b.stock || 0);
    return 0;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredProducts.length) setSelectedIds([]);
    else setSelectedIds(filteredProducts.map(p => p.id));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} products?`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.delete(doc(db, "products", id)));
      await batch.commit();
      setSelectedIds([]);
      alert("Products deleted successfully");
    } catch (err) { alert("Bulk delete failed"); }
  };

  const handleBulkStatus = async (newStatus) => {
    if (!selectedIds.length) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.update(doc(db, "products", id), { status: newStatus }));
      await batch.commit();
      setSelectedIds([]);
      alert(`Updated status for ${selectedIds.length} products`);
    } catch (err) { alert("Bulk update failed"); }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Inventory...</div>;

  return (
    <div style={{ padding: '25px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>Inventory ({filteredProducts.length})</h1>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={searchBox}>
            <Search size={18} color="#94a3b8" />
            <input
              placeholder="Search by title or SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={searchInput}
            />
          </div>

          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={filterSelect}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={filterSelect}>
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>

          <select value={sortOption} onChange={e => setSortOption(e.target.value)} style={filterSelect}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="stock-low">Low Stock First</option>
          </select>

          <button onClick={() => router.push('/secured/superadmin/add-product')} style={addBtn}>+ Add Product</button>
        </div>
      </div>

      {/* Connection Error */}
      {errorMsg && (
        <div style={errorBanner}><AlertCircle size={18} /> <span>{errorMsg}</span></div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div style={bulkActionBar}>
          <span style={{ fontWeight: '600' }}>{selectedIds.length} items selected</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select onChange={e => handleBulkStatus(e.target.value)} style={bulkSelect}>
              <option value="">Bulk Status...</option>
              <option value="Active">Mark Active</option>
              <option value="Draft">Mark Draft</option>
              <option value="Archived">Archive</option>
            </select>
            <button onClick={handleBulkDelete} style={bulkDeleteBtn}><Trash2 size={16} /> Delete</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={tableHead}>
            <tr>
              <th style={th}><input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={selectAll} /></th>
              <th style={th}>Product</th>
              <th style={th}>SKU</th>
              <th style={th}>Category</th>
              <th style={th}>Price</th>
              <th style={th}>Stock</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr key={p.id} style={{ ...tr, background: selectedIds.includes(p.id) ? '#f1f5f9' : 'transparent' }}>
                <td style={td}><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={p.featuredImage || 'https://via.placeholder.com/50'} style={pImg} alt="" />
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{p.title}</span>
                  </div>
                </td>
                <td style={td}>{p.sku || 'N/A'}</td>
                <td style={td}><span style={catTag}>{p.category}</span></td>
                <td style={td}>₹{p.price}</td>
                <td style={td}>
                  <span style={{ color: (p.stock || 0) < 5 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                    {p.stock || 0}
                  </span>
                </td>
                <td style={td}>
                  <span style={{ ...statusTag, background: p.status === 'Active' ? '#dcfce7' : '#f1f5f9', color: p.status === 'Active' ? '#166534' : '#64748b' }}>
                    {p.status || 'Active'}
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => router.push(`/secured/superadmin/add-product?edit=${p.id}`)} style={iconBtn} title="Edit"><Edit size={16} /></button>
                    <button onClick={async () => { if (confirm("Delete?")) await deleteDoc(doc(db, "products", p.id)) }} style={deleteBtn} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No products found matching filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Styles
const searchBox = { display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px', width: '250px' };
const searchInput = { border: 'none', padding: '10px', outline: 'none', width: '100%', fontSize: '14px' };
const filterSelect = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none', cursor: 'pointer' };
const addBtn = { background: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' };
const errorBanner = { padding: '12px 15px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' };
const bulkActionBar = { background: '#1e293b', color: '#fff', padding: '12px 20px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const bulkSelect = { padding: '6px 10px', borderRadius: '4px', border: 'none', fontSize: '13px' };
const bulkDeleteBtn = { background: '#ef4444', color: '#fff', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' };
const tableWrap = { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const tableHead = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
const th = { padding: '12px 15px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' };
const tr = { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' };
const td = { padding: '12px 15px', fontSize: '14px', color: '#334155' };
const pImg = { width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', background: '#f1f5f9' };
const catTag = { background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' };
const statusTag = { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' };
const iconBtn = { background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' };
const deleteBtn = { background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' };