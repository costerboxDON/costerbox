"use client";
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Plus, Trash2, Pencil, X, Tag } from 'lucide-react';

const emptyForm = () => ({
    code: '',
    type: 'percentage',
    value: '',
    minOrderValue: '',
    expiryDate: '',
    usageLimit: '',
    active: true,
});

export default function CouponsAdminPage() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null); // null = closed, 'new' = create, else doc id
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'coupons'));
            setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => { fetchCoupons(); }, []);

    const openCreate = () => {
        setForm(emptyForm());
        setFormError('');
        setEditingId('new');
    };

    const openEdit = (coupon) => {
        setForm({
            code: coupon.code,
            type: coupon.type,
            value: String(coupon.value),
            minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue) : '',
            expiryDate: coupon.expiryDate || '',
            usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
            active: coupon.active,
        });
        setFormError('');
        setEditingId(coupon.id);
    };

    const closeForm = () => setEditingId(null);

    const handleSave = async () => {
        setFormError('');
        const code = form.code.trim().toUpperCase();
        const value = Number(form.value);

        if (!code) return setFormError('Coupon code is required.');
        if (!value || value <= 0) return setFormError('Discount value must be greater than 0.');
        if (form.type === 'percentage' && value > 100) return setFormError('Percentage discount cannot exceed 100.');

        setSaving(true);
        try {
            // Enforce unique code (case-insensitive) across other coupons
            const dupSnap = await getDocs(query(collection(db, 'coupons'), where('code', '==', code)));
            const dup = dupSnap.docs.find(d => d.id !== editingId);
            if (dup) {
                setFormError(`Coupon code "${code}" already exists.`);
                setSaving(false);
                return;
            }

            const payload = {
                code,
                type: form.type,
                value,
                minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
                expiryDate: form.expiryDate || null,
                usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
                active: form.active,
            };

            if (editingId === 'new') {
                await addDoc(collection(db, 'coupons'), { ...payload, usageCount: 0, createdAt: serverTimestamp() });
            } else {
                await updateDoc(doc(db, 'coupons', editingId), payload);
            }

            await fetchCoupons();
            closeForm();
        } catch (err) {
            console.error(err);
            setFormError('Failed to save coupon.');
        }
        setSaving(false);
    };

    const handleToggleActive = async (coupon) => {
        await updateDoc(doc(db, 'coupons', coupon.id), { active: !coupon.active });
        setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c));
    };

    const handleDelete = async (coupon) => {
        if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
        await deleteDoc(doc(db, 'coupons', coupon.id));
        setCoupons(prev => prev.filter(c => c.id !== coupon.id));
    };

    const isExpired = (coupon) => coupon.expiryDate && new Date(coupon.expiryDate) < new Date(new Date().toDateString());
    const isExhausted = (coupon) => coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit;

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading coupons...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>Coupons</h1>
                    <span style={{ fontSize: '13px', color: '#888' }}>Discount codes customers can apply at checkout</span>
                </div>
                <button
                    onClick={openCreate}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                    <Plus size={16} /> Create Coupon
                </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            {['Code', 'Discount', 'Min. Order', 'Expiry', 'Usage', 'Status', 'Actions'].map(c => (
                                <th key={c} style={{ padding: '12px 15px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {coupons.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>No coupons yet. Create your first one.</td></tr>
                        ) : coupons.map(coupon => {
                            const expired = isExpired(coupon);
                            const exhausted = isExhausted(coupon);
                            const effectivelyInactive = !coupon.active || expired || exhausted;
                            return (
                                <tr key={coupon.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 15px', fontWeight: '700', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Tag size={13} color="#9ca3af" /> {coupon.code}
                                    </td>
                                    <td style={{ padding: '12px 15px', fontSize: '13px' }}>
                                        {coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`}
                                    </td>
                                    <td style={{ padding: '12px 15px', fontSize: '13px', color: '#6b7280' }}>
                                        {coupon.minOrderValue > 0 ? `₹${coupon.minOrderValue}` : '—'}
                                    </td>
                                    <td style={{ padding: '12px 15px', fontSize: '13px', color: expired ? '#dc2626' : '#6b7280' }}>
                                        {coupon.expiryDate || 'No expiry'}
                                    </td>
                                    <td style={{ padding: '12px 15px', fontSize: '13px', color: exhausted ? '#dc2626' : '#6b7280' }}>
                                        {coupon.usageCount || 0}{coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ''}
                                    </td>
                                    <td style={{ padding: '12px 15px' }}>
                                        <button
                                            onClick={() => handleToggleActive(coupon)}
                                            disabled={expired || exhausted}
                                            style={{
                                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                                border: 'none', cursor: expired || exhausted ? 'not-allowed' : 'pointer',
                                                background: effectivelyInactive ? '#f3f4f6' : '#dcfce7',
                                                color: effectivelyInactive ? '#6b7280' : '#166534',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {expired ? 'Expired' : exhausted ? 'Exhausted' : coupon.active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px 15px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openEdit(coupon)} style={iconBtnStyle}><Pencil size={14} /></button>
                                            <button onClick={() => handleDelete(coupon)} style={{ ...iconBtnStyle, color: '#dc2626' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {editingId && (
                <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>{editingId === 'new' ? 'Create Coupon' : 'Edit Coupon'}</h2>
                            <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                        </div>

                        {formError && (
                            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{formError}</div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>Code</label>
                                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME10" style={inputStyle} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Type</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                                        <option value="percentage">% Percentage</option>
                                        <option value="flat">₹ Flat Amount</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Value</label>
                                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? 'e.g. 10' : 'e.g. 200'} style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Minimum Order Value (₹, optional)</label>
                                <input type="number" value={form.minOrderValue} onChange={e => setForm({ ...form, minOrderValue: e.target.value })} placeholder="0 = no minimum" style={inputStyle} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Expiry Date (optional)</label>
                                    <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Usage Limit (optional)</label>
                                    <input type="number" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} placeholder="Blank = unlimited" style={inputStyle} />
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                                Active
                            </label>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{ marginTop: '22px', width: '100%', background: '#1a1a1a', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}
                        >
                            {saving ? 'Saving...' : editingId === 'new' ? 'Create Coupon' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const iconBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' };
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#374151' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontSize: '13px' };
