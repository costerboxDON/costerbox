/* src/app/secured/superadmin/orders/page.js */
"use client";
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Package, Truck, CheckCircle, MapPin, MessageCircle, Search, Trash2, RefreshCw, RotateCcw, AlertTriangle, X, ChevronRight, ExternalLink, ClipboardList, ShieldCheck, Ban } from 'lucide-react';

// ─── STATUS helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending:                    { label: 'Pending',              bg: '#fef9c3', color: '#854d0e' },
    paid:                       { label: 'Processing (Paid)',    bg: '#e0f2fe', color: '#0369a1' },
    pending_artisan_acceptance: { label: 'Awaiting Artisan',     bg: '#ffedd5', color: '#c2410c' },
    accepted_by_artisan:        { label: 'Accepted by Artisan',  bg: '#d1fae5', color: '#065f46' },
    product_ready_by_artisan:   { label: 'Ready for Dispatch',   bg: '#fef08a', color: '#854d0e' },
    shipped:                    { label: 'Shipped',              bg: '#dbeafe', color: '#1e40af' },
    delivered:                  { label: 'Delivered',            bg: '#dcfce7', color: '#166534' },
    return_requested:           { label: 'Return Requested',     bg: '#fce7f3', color: '#9d174d' },
    returned:                   { label: 'Returned',             bg: '#f3f4f6', color: '#374151' },
    refunded:                   { label: 'Refunded',             bg: '#ede9fe', color: '#5b21b6' },
    cancelled:                  { label: 'Cancelled',            bg: '#fee2e2', color: '#991b1b' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || { label: status || 'Unknown', bg: '#f3f4f6', color: '#374151' };
    return (
        <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
            fontWeight: '700', background: cfg.bg, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap',
        }}>
            {cfg.label}
        </span>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null); // drawer
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedIds, setSelectedIds] = useState([]);

    const getTime = (t) => {
        if (!t) return 0;
        if (typeof t.toMillis === 'function') return t.toMillis();
        if (t instanceof Date) return t.getTime();
        if (typeof t === 'number') return t;
        if (typeof t === 'string') return new Date(t).getTime();
        return 0;
    };

    const formatDate = (t) => {
        const ms = getTime(t);
        return ms ? new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
    };

    const fetchOrders = async () => {
        setLoading(true); setError(null);
        try {
            const snap = await getDocs(collection(db, 'orders'));
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { setError('Unable to load orders.'); }
        setLoading(false);
    };

    useEffect(() => { fetchOrders(); }, []);

    // refresh selected order after updates
    const refreshSelectedOrder = (updatedData) => {
        setSelectedOrder(prev => prev ? { ...prev, ...updatedData } : null);
        setOrders(prev => prev.map(o => o.id === updatedData.id ? { ...o, ...updatedData } : o));
    };

    const processedOrders = orders.filter(o => {
        const q = searchTerm.toLowerCase();
        const matches =
            (o.id?.toLowerCase().includes(q)) ||
            (o.orderId?.toLowerCase().includes(q)) ||
            (o.shipping?.firstName?.toLowerCase().includes(q)) ||
            (o.shipping?.lastName?.toLowerCase().includes(q)) ||
            (o.userEmail?.toLowerCase().includes(q)) ||
            (o.shipping?.phone?.includes(searchTerm));
        const statusOk = statusFilter === 'all' || o.status === statusFilter;
        return matches && statusOk;
    }).sort((a, b) => sortOrder === 'desc' ? getTime(b.createdAt) - getTime(a.createdAt) : getTime(a.createdAt) - getTime(b.createdAt));

    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const selectAll = () => setSelectedIds(selectedIds.length === processedOrders.length ? [] : processedOrders.map(o => o.id));

    const handleBulkDelete = async () => {
        if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} orders?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, 'orders', id)));
        await batch.commit();
        setOrders(prev => prev.filter(o => !selectedIds.includes(o.id)));
        setSelectedIds([]);
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (!selectedIds.length || !newStatus) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.update(doc(db, 'orders', id), { status: newStatus }));
        await batch.commit();
        setOrders(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, status: newStatus } : o));
        setSelectedIds([]);
    };

    const getProductInfo = (order) => {
        const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;
        return {
            img: firstItem
                ? (firstItem.image || firstItem.featuredImage || (Array.isArray(firstItem.media) && firstItem.media[0]) || '')
                : (order.product?.featuredImage || order.product?.image || ''),
            name: firstItem
                ? (firstItem.name || firstItem.title || 'Product')
                : (order.product?.name || order.product?.title || '—'),
            slug: firstItem
                ? (firstItem.seoHandle || firstItem.productId || firstItem.id || '')
                : (order.product?.seoHandle || order.product?.id || ''),
            extra: Array.isArray(order.items) && order.items.length > 1 ? order.items.length - 1 : 0,
            allItems: Array.isArray(order.items) ? order.items : (order.product ? [order.product] : []),
        };
    };

    if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Loading Orders...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: "'Inter', sans-serif" }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                    Manage Orders <span style={{ fontSize: '16px', color: '#888', fontWeight: '400' }}>({processedOrders.length})</span>
                </h1>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={S.searchBox}>
                        <Search size={16} color="#94a3b8" />
                        <input placeholder="Order ID, Name, Phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={S.searchInput} />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.sel}>
                        <option value="all">All Statuses</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={S.sel}>
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                    <button onClick={fetchOrders} style={S.refreshBtn}><RefreshCw size={15} /> Refresh</button>
                </div>
            </div>

            {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '15px' }}>{error}</div>}

            {/* ── Bulk Actions ── */}
            {selectedIds.length > 0 && (
                <div style={S.bulkBar}>
                    <span style={{ fontWeight: '600' }}>{selectedIds.length} selected</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select onChange={e => handleBulkStatusUpdate(e.target.value)} style={S.bulkSel}>
                            <option value="">Update Status...</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={handleBulkDelete} style={S.bulkDelBtn}><Trash2 size={14} /> Delete</button>
                    </div>
                </div>
            )}

            {/* ── Table ── */}
            <div style={S.tableWrap}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={S.th}><input type="checkbox" checked={selectedIds.length === processedOrders.length && processedOrders.length > 0} onChange={selectAll} /></th>
                            <th style={S.th}>Date & ID</th>
                            <th style={S.th}>Customer</th>
                            <th style={S.th}>Contact</th>
                            <th style={S.th}>Product</th>
                            <th style={S.th}>Amount</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedOrders.map(order => {
                            const p = getProductInfo(order);
                            return (
                                <tr
                                    key={order.id}
                                    style={{ ...S.tr, background: selectedIds.includes(order.id) ? '#f0f4ff' : selectedOrder?.id === order.id ? '#f8faff' : 'transparent', cursor: 'pointer' }}
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <td style={S.td} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleSelect(order.id)} />
                                    </td>
                                    <td style={S.td}>
                                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{formatDate(order.createdAt).split(',')[0]}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>#{order.orderId || order.id.slice(0, 12)}</div>
                                    </td>
                                    <td style={S.td}>
                                        <div style={{ fontWeight: '500' }}>{order.shipping?.firstName} {order.shipping?.lastName}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>{order.userEmail}</div>
                                    </td>
                                    <td style={S.td}>
                                        <div>{order.shipping?.phone || 'N/A'}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>{order.shipping?.city}</div>
                                    </td>
                                    <td style={S.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {p.img
                                                ? <img src={p.img} style={S.thumb} alt={p.name} onError={e => e.target.style.display = 'none'} />
                                                : <div style={{ ...S.thumb, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🛍️</div>
                                            }
                                            <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                                {p.slug
                                                    ? <a href={`/shop/${p.slug}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#2563eb', textDecoration: 'none' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>{p.name}</a>
                                                    : p.name
                                                }
                                                {p.extra > 0 && <span style={{ color: '#94a3b8', fontSize: '11px' }}> +{p.extra}</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={S.td}>
                                        <div style={{ fontWeight: '700' }}>₹{order.totalAmount || order.payment?.totalAmount || order.payment?.paidAmount || '—'}</div>
                                        <div style={{ fontSize: '10px', color: order.paymentMethod === 'CD' ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
                                            {order.paymentMethod === 'CD' ? 'COD' : 'PREPAID'}
                                        </div>
                                    </td>
                                    <td style={S.td}><StatusBadge status={order.status} /></td>
                                    <td style={S.td}>
                                        <button
                                            onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}
                                            style={S.manageBtn}
                                        >
                                            Details <ChevronRight size={13} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {processedOrders.length === 0 && (
                            <tr><td colSpan="8" style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>No orders found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Order Detail Drawer ── */}
            {selectedOrder && (
                <OrderDrawer
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={refreshSelectedOrder}
                    formatDate={formatDate}
                    getProductInfo={getProductInfo}
                />
            )}
        </div>
    );
}

// ─── Order Detail Drawer ──────────────────────────────────────────────────────
function OrderDrawer({ order, onClose, onUpdate, formatDate, getProductInfo }) {
    const [activeTab, setActiveTab] = useState('details');
    const [statusLoading, setStatusLoading] = useState(false);
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('Customer requested return');
    const [newStatus, setNewStatus] = useState(order.status || 'paid');
    const [trackingCourier, setTrackingCourier] = useState(order.tracking?.courier || '');
    const [trackingId, setTrackingId] = useState(order.tracking?.id || '');
    const [shipLoading, setShipLoading] = useState(false);
    const [delhiveryLoading, setDelhiveryLoading] = useState(false);
    const [actionMsg, setActionMsg] = useState(null); // { type: 'success'|'error', text }

    const p = getProductInfo(order);
    const isCOD = order.paymentMethod === 'CD';
    const canRefund = !isCOD && order.payment?.razorpayPaymentId && !['refunded', 'cancelled'].includes(order.status);
    const totalAmount = Number(order.totalAmount || order.payment?.totalAmount || order.payment?.paidAmount || 0);

    const showMsg = (type, text) => {
        setActionMsg({ type, text });
        setTimeout(() => setActionMsg(null), 5000);
    };

    const handleStatusUpdate = async () => {
        setStatusLoading(true);
        try {
            await updateDoc(doc(db, 'orders', order.id), {
                status: newStatus,
                tracking: { courier: trackingCourier, id: trackingId, updatedAt: serverTimestamp() },
                updatedAt: serverTimestamp(),
            });
            onUpdate({ id: order.id, status: newStatus, tracking: { courier: trackingCourier, id: trackingId } });
            showMsg('success', 'Order status updated successfully.');
        } catch (e) { showMsg('error', 'Failed to update status.'); }
        setStatusLoading(false);
    };

    const handleRefund = async () => {
        if (!order.payment?.razorpayPaymentId) {
            showMsg('error', 'No Razorpay Payment ID found on this order. Cannot process refund.');
            return;
        }
        const amt = refundAmount ? Number(refundAmount) : totalAmount;
        if (!confirm(`Issue a ₹${amt} refund to the customer's source account?\n\nThis will be refunded via Razorpay (3–5 business days).`)) return;

        setRefundLoading(true);
        try {
            const res = await fetch('/api/razorpay/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: order.payment.razorpayPaymentId,
                    amount: amt,
                    reason: refundReason,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Refund failed');

            // Update Firestore order status
            await updateDoc(doc(db, 'orders', order.id), {
                status: 'refunded',
                refund: {
                    id: data.refundId,
                    amount: data.amount,
                    status: data.status,
                    reason: refundReason,
                    initiatedAt: new Date().toISOString(),
                },
                updatedAt: serverTimestamp(),
            });
            onUpdate({ id: order.id, status: 'refunded', refund: { id: data.refundId, amount: data.amount, status: data.status } });
            showMsg('success', `✅ Refund of ₹${data.amount} initiated! Refund ID: ${data.refundId}. Customer will receive funds in 3–5 business days.`);
        } catch (e) {
            showMsg('error', `Refund failed: ${e.message}`);
        }
        setRefundLoading(false);
    };

    const handleReturnRequest = async () => {
        if (!confirm('Mark this order as Return Requested?')) return;
        await updateDoc(doc(db, 'orders', order.id), { status: 'return_requested', updatedAt: serverTimestamp() });
        onUpdate({ id: order.id, status: 'return_requested' });
        showMsg('success', 'Order marked as Return Requested.');
    };

    const handleCancel = async () => {
        if (!confirm('Cancel this order? This cannot be undone.')) return;
        await updateDoc(doc(db, 'orders', order.id), { status: 'cancelled', updatedAt: serverTimestamp() });
        onUpdate({ id: order.id, status: 'cancelled' });
        showMsg('success', 'Order cancelled.');
    };

    const handleShip = async () => {
        if (!confirm(`Create Shiprocket shipment for order #${order.orderId || order.id}?`)) return;
        setShipLoading(true);
        try {
            const res = await fetch('/api/shiprocket/create-order', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
            });
            const data = await res.json();
            if (data.success) { showMsg('success', 'Shiprocket shipment created!'); onUpdate({ id: order.id, status: 'shipped' }); }
            else showMsg('error', `Shiprocket: ${data.message || data.error}`);
        } catch { showMsg('error', 'Error creating Shiprocket shipment.'); }
        setShipLoading(false);
    };

    const handleDelhivery = async () => {
        if (!order.artisanEmail) { showMsg('error', 'No artisan linked. Assign an artisan first.'); return; }
        if (!confirm(`Create Delhivery consignment? Pickup from artisan: ${order.artisanEmail}`)) return;
        setDelhiveryLoading(true);
        try {
            const res = await fetch('/api/delhivery/create-order', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
            });
            const data = await res.json();
            if (data.success) { showMsg('success', `Delhivery consignment created! Waybill: ${data.waybill}`); }
            else showMsg('error', `Delhivery: ${data.error}`);
        } catch { showMsg('error', 'Error creating Delhivery consignment.'); }
        setDelhiveryLoading(false);
    };

    const tabs = [
        { id: 'details', label: 'Details', icon: ClipboardList },
        { id: 'shipping', label: 'Shipping', icon: Truck },
        { id: 'refund', label: 'Refund / Return', icon: RotateCcw },
    ];

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, backdropFilter: 'blur(2px)' }} />

            {/* Drawer */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', maxWidth: '95vw',
                background: '#fff', zIndex: 201, boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif",
            }}>
                {/* Drawer Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Order Details</h2>
                            <StatusBadge status={order.status} />
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                            #{order.orderId || order.id}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                            {formatDate(order.createdAt)}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#64748b' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Action Message Banner */}
                {actionMsg && (
                    <div style={{
                        margin: '12px 24px 0',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        background: actionMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: actionMsg.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${actionMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                        {actionMsg.text}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: '13px', fontWeight: activeTab === tab.id ? '600' : '400',
                                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                                borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                                marginBottom: '-1px',
                            }}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                    {/* ── TAB: Details ── */}
                    {activeTab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Customer Info */}
                            <Section title="Customer">
                                <Row label="Name" value={`${order.shipping?.firstName || ''} ${order.shipping?.lastName || ''}`} />
                                <Row label="Email" value={order.userEmail || '—'} />
                                <Row label="Phone" value={order.shipping?.phone || '—'} />
                            </Section>

                            {/* Shipping Address */}
                            <Section title="Shipping Address">
                                <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
                                    {order.shipping?.address && <div>{order.shipping.address}</div>}
                                    {order.shipping?.address2 && <div>{order.shipping.address2}</div>}
                                    <div>{[order.shipping?.city, order.shipping?.state, order.shipping?.pincode].filter(Boolean).join(', ')}</div>
                                    {order.shipping?.country && <div>{order.shipping.country}</div>}
                                </div>
                            </Section>

                            {/* Products */}
                            <Section title={`Products (${p.allItems.length})`}>
                                {p.allItems.map((item, i) => {
                                    const slug = item.seoHandle || item.productId || item.id || '';
                                    return (
                                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingBottom: i < p.allItems.length - 1 ? '12px' : 0, borderBottom: i < p.allItems.length - 1 ? '1px solid #f1f5f9' : 'none', marginBottom: i < p.allItems.length - 1 ? '12px' : 0 }}>
                                            {(item.image || item.featuredImage) && (
                                                <img src={item.image || item.featuredImage} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} alt="" onError={e => e.target.style.display = 'none'} />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600' }}>
                                                    {slug ? <a href={`/shop/${slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{item.name || item.title || 'Product'} <ExternalLink size={11} /></a> : (item.name || item.title || 'Product')}
                                                </div>
                                                {item.selectedSize && <div style={{ fontSize: '11px', color: '#64748b' }}>Size: {item.selectedSize}</div>}
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Qty: {item.quantity || 1} · ₹{item.paidPrice || item.price || '—'}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </Section>

                            {/* Payment */}
                            <Section title="Payment">
                                <Row label="Method" value={order.paymentMethod === 'CD' ? 'Cash on Delivery' : 'Prepaid (Razorpay)'} />
                                <Row label="Total Amount" value={`₹${totalAmount}`} bold />
                                {order.payment?.paidAmount && <Row label="Paid Amount" value={`₹${order.payment.paidAmount}`} />}
                                {order.payment?.razorpayPaymentId && <Row label="Razorpay Payment ID" value={order.payment.razorpayPaymentId} mono />}
                                {order.payment?.razorpayOrderId && <Row label="Razorpay Order ID" value={order.payment.razorpayOrderId} mono />}
                                {order.refund && (
                                    <div style={{ marginTop: '10px', padding: '10px', background: '#ede9fe', borderRadius: '8px', border: '1px solid #c4b5fd' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#5b21b6', marginBottom: '4px' }}>Refund Processed</div>
                                        <Row label="Refund ID" value={order.refund.id} mono />
                                        <Row label="Amount" value={`₹${order.refund.amount}`} />
                                        <Row label="Status" value={order.refund.status} />
                                    </div>
                                )}
                            </Section>

                            {/* Artisan */}
                            {order.artisanEmail && (
                                <Section title="Artisan">
                                    <Row label="Email" value={order.artisanEmail} />
                                    {order.artisanName && <Row label="Name" value={order.artisanName} />}
                                </Section>
                            )}

                            {/* 30% Due Notice */}
                            {order.status === 'product_ready_by_artisan' && order.payment?.type === 'PARTIAL_ADVANCE' && (
                                <div style={{ padding: '14px', background: '#fef08a', borderRadius: '10px', border: '1px solid #ca8a04' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#854d0e', marginBottom: '6px' }}>⚠️ 30% Due from Customer</div>
                                    <div style={{ fontSize: '12px', color: '#78350f' }}>Artisan has marked the product as ready. Customer must pay the remaining 30% before dispatch.</div>
                                    <button
                                        style={{ marginTop: '10px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                        onClick={() => alert(`Notice: Payment link sent to ${order.shipping?.phone} & ${order.userEmail}`)}
                                    >
                                        <MessageCircle size={13} style={{ marginRight: '5px' }} /> Notify Customer
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: Shipping ── */}
                    {activeTab === 'shipping' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Tracking Info */}
                            {order.tracking?.id && (
                                <Section title="Current Tracking">
                                    <Row label="Courier" value={order.tracking.courier || '—'} />
                                    <Row label="AWB / Tracking ID" value={order.tracking.id} mono />
                                    {order.tracking.link && (
                                        <a href={order.tracking.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                            <MapPin size={13} /> Track Shipment <ExternalLink size={12} />
                                        </a>
                                    )}
                                </Section>
                            )}

                            {/* Update Status */}
                            <Section title="Update Order Status">
                                <label style={S.label}>Status</label>
                                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={S.input}>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>

                                <label style={{ ...S.label, marginTop: '14px' }}>Courier Name</label>
                                <input value={trackingCourier} onChange={e => setTrackingCourier(e.target.value)} placeholder="e.g. Delhivery, Shiprocket" style={S.input} />

                                <label style={{ ...S.label, marginTop: '10px' }}>Tracking Number</label>
                                <input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="AWB / Tracking ID" style={S.input} />

                                <button onClick={handleStatusUpdate} disabled={statusLoading} style={{ ...S.primaryBtn, marginTop: '16px' }}>
                                    {statusLoading ? 'Saving...' : '💾 Save Changes'}
                                </button>
                            </Section>

                            {/* Shiprocket */}
                            <Section title="Auto-Ship via Shiprocket">
                                <button onClick={handleShip} disabled={shipLoading} style={{ ...S.primaryBtn, background: '#7c3aed' }}>
                                    <Truck size={15} /> {shipLoading ? 'Creating...' : 'Create Shiprocket Shipment'}
                                </button>
                            </Section>

                            {/* Delhivery */}
                            <Section title="Auto-Ship via Delhivery (Artisan Pickup)">
                                {!order.artisanEmail && (
                                    <div style={{ fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}>
                                        No artisan linked. Assign an artisan to this order first.
                                    </div>
                                )}
                                {order.artisanEmail && <Row label="Pickup From" value={order.artisanEmail} />}
                                <button onClick={handleDelhivery} disabled={delhiveryLoading || !order.artisanEmail} style={{ ...S.primaryBtn, background: order.artisanEmail ? '#059669' : '#9ca3af', marginTop: '10px' }}>
                                    <Truck size={15} /> {delhiveryLoading ? 'Creating...' : 'Create Delhivery Consignment'}
                                </button>
                            </Section>
                        </div>
                    )}

                    {/* ── TAB: Refund / Return ── */}
                    {activeTab === 'refund' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Return Request */}
                            <Section title="Mark as Return Requested">
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
                                    Use this to log that the customer has requested a return. You can then process the refund below.
                                </p>
                                <button
                                    onClick={handleReturnRequest}
                                    disabled={['return_requested', 'returned', 'refunded', 'cancelled'].includes(order.status)}
                                    style={{ ...S.primaryBtn, background: '#db2777' }}
                                >
                                    <RotateCcw size={15} /> Mark Return Requested
                                </button>
                            </Section>

                            {/* Refund */}
                            <Section title="Issue Refund (Razorpay)">
                                {isCOD ? (
                                    <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', color: '#78350f' }}>
                                        ⚠️ This is a <strong>COD order</strong>. Razorpay refunds are not applicable. Process a manual refund or bank transfer directly.
                                    </div>
                                ) : !order.payment?.razorpayPaymentId ? (
                                    <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', color: '#991b1b' }}>
                                        ❌ No Razorpay Payment ID found on this order. Cannot initiate an online refund.
                                    </div>
                                ) : order.status === 'refunded' ? (
                                    <div style={{ padding: '12px', background: '#ede9fe', borderRadius: '8px', border: '1px solid #c4b5fd', fontSize: '13px', color: '#5b21b6' }}>
                                        ✅ This order has already been refunded.
                                        {order.refund && <div style={{ marginTop: '6px' }}>Refund ID: <code>{order.refund.id}</code> · ₹{order.refund.amount}</div>}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534', marginBottom: '14px' }}>
                                            <ShieldCheck size={13} style={{ marginRight: '4px' }} />
                                            Refund will be sent to the customer's original payment method (card/UPI/wallet). Typically takes <strong>3–5 business days</strong>.
                                        </div>

                                        <Row label="Razorpay Payment ID" value={order.payment.razorpayPaymentId} mono />
                                        <Row label="Total Order Amount" value={`₹${totalAmount}`} bold />

                                        <label style={{ ...S.label, marginTop: '14px' }}>Refund Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={refundAmount}
                                            onChange={e => setRefundAmount(e.target.value)}
                                            placeholder={`Full refund: ₹${totalAmount}`}
                                            style={S.input}
                                            min="1"
                                            max={totalAmount}
                                        />
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Leave blank to issue a full refund of ₹{totalAmount}</div>

                                        <label style={{ ...S.label, marginTop: '12px' }}>Reason</label>
                                        <select value={refundReason} onChange={e => setRefundReason(e.target.value)} style={S.input}>
                                            <option>Customer requested return</option>
                                            <option>Product damaged / defective</option>
                                            <option>Wrong item delivered</option>
                                            <option>Order cancelled by admin</option>
                                            <option>Duplicate order</option>
                                            <option>Customer changed mind</option>
                                        </select>

                                        <button
                                            onClick={handleRefund}
                                            disabled={refundLoading}
                                            style={{ ...S.primaryBtn, background: refundLoading ? '#9ca3af' : '#dc2626', marginTop: '16px' }}
                                        >
                                            <RotateCcw size={15} />
                                            {refundLoading ? 'Processing Refund...' : `Initiate Refund · ₹${refundAmount || totalAmount}`}
                                        </button>
                                    </>
                                )}
                            </Section>

                            {/* Cancel Order */}
                            <Section title="Cancel Order">
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
                                    This will mark the order as cancelled. Issue a refund separately if payment was collected.
                                </p>
                                <button
                                    onClick={handleCancel}
                                    disabled={['refunded', 'cancelled', 'delivered'].includes(order.status)}
                                    style={{ ...S.primaryBtn, background: '#374151' }}
                                >
                                    <Ban size={15} /> Cancel Order
                                </button>
                            </Section>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Small Helpers ────────────────────────────────────────────────────────────
function Section({ title, children }) {
    return (
        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.6px', marginBottom: '12px' }}>{title}</div>
            {children}
        </div>
    );
}

function Row({ label, value, bold, mono }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: '13px', color: '#1e293b', textAlign: 'right', fontWeight: bold ? '700' : '500', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value || '—'}</span>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    searchBox: { display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', width: '260px' },
    searchInput: { border: 'none', outline: 'none', fontSize: '13px', width: '100%' },
    sel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer', outline: 'none' },
    refreshBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    bulkBar: { background: '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    bulkSel: { padding: '6px 10px', borderRadius: '4px', border: 'none', fontSize: '13px', outline: 'none' },
    bulkDelBtn: { display: 'flex', alignItems: 'center', gap: '5px', background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    tableWrap: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    th: { padding: '12px 15px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
    td: { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', verticalAlign: 'middle' },
    tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
    thumb: { width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 },
    manageBtn: { display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', border: '1px solid #bfdbfe', background: '#eff6ff', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px' },
    input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    primaryBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
};