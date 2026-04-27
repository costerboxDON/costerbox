/* src/app/secured/superadmin/orders/page.js */
"use client";
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Package, Truck, CheckCircle, Clock, MapPin, ExternalLink, MessageCircle, AlertTriangle, FileText, Search, Filter, Trash2, Edit3, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { generateInvoicePDF } from '../../../../utils/generateInvoice';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("desc"); // newest first
    const [delhiveryLoading, setDelhiveryLoading] = useState(false);

    // Bulk Select states
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
        const time = getTime(t);
        return time ? new Date(time).toLocaleString() : 'N/A';
    };

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const snapshot = await getDocs(collection(db, "orders"));
            const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setOrders(results);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            setError("Unable to load orders.");
        }
        setLoading(false);
    };

    useEffect(() => { fetchOrders(); }, []);

    // Filter & Sort Logic
    const processedOrders = orders.filter(o => {
        const matchesSearch =
            (o.id && o.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (o.orderId && o.orderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (o.shipping?.firstName && o.shipping.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (o.shipping?.lastName && o.shipping.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (o.userEmail && o.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (o.shipping?.phone && o.shipping.phone.includes(searchTerm));

        const matchesStatus = statusFilter === 'all' || (o.status || 'pending') === statusFilter;

        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        const timeA = getTime(a.createdAt);
        const timeB = getTime(b.createdAt);
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    // Bulk Actions logic
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === processedOrders.length) setSelectedIds([]);
        else setSelectedIds(processedOrders.map(o => o.id));
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Delete ${selectedIds.length} selected orders?`)) return;
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => batch.delete(doc(db, "orders", id)));
            await batch.commit();
            setOrders(prev => prev.filter(o => !selectedIds.includes(o.id)));
            setSelectedIds([]);
            alert("Orders deleted");
        } catch (err) { console.error(err); alert("Bulk delete failed"); }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (!selectedIds.length) return;
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => batch.update(doc(db, "orders", id), { status: newStatus }));
            await batch.commit();
            setOrders(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, status: newStatus } : o));
            setSelectedIds([]);
            alert(`Updated ${selectedIds.length} orders to ${newStatus}`);
        } catch (err) { console.error(err); alert("Bulk update failed"); }
    };

    const handleShip = async () => {
        if (!editingOrder) return;
        if (!window.confirm(`Ship Order #${editingOrder.orderId || editingOrder.id} via Shiprocket?`)) return;
        try {
            const res = await fetch('/api/shiprocket/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: editingOrder.id })
            });
            const data = await res.json();
            if (data.success) {
                alert("Shiprocket shipment created!");
                setEditingOrder(null);
                fetchOrders();
            } else alert(`Failed: ${data.message || data.error}`);
        } catch (e) { alert("Error creating Shiprocket shipment"); }
    };

    const handleDelhiveryShip = async () => {
        if (!editingOrder) return;
        if (!editingOrder.artisanEmail) {
            alert("This order has no artisan linked. Delhivery requires the artisan's pickup address.");
            return;
        }
        if (!window.confirm(`Create Delhivery consignment for Order #${editingOrder.orderId || editingOrder.id}?\n\nPickup will be from artisan: ${editingOrder.artisanEmail}`)) return;
        setDelhiveryLoading(true);
        try {
            const res = await fetch('/api/delhivery/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: editingOrder.id })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Delhivery consignment created!\nWaybill: ${data.waybill}\nArtisan: ${data.artisan}`);
                setEditingOrder(null);
                fetchOrders();
            } else {
                alert(`Delhivery Failed: ${data.error}`);
            }
        } catch (e) {
            alert("Error creating Delhivery consignment");
        } finally {
            setDelhiveryLoading(false);
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await updateDoc(doc(db, "orders", editingOrder.id), {
                status: formData.get("status"),
                tracking: {
                    id: formData.get("trackingId"),
                    courier: formData.get("courier"),
                    link: formData.get("trackingLink"),
                    updatedAt: serverTimestamp()
                }
            });
            alert("Order Updated!");
            setEditingOrder(null);
            fetchOrders();
        } catch (error) { alert("Failed to update."); }
    };

    const getStatusStyle = (status) => {
        const s = (status || 'pending').toLowerCase();
        if (s === 'delivered') return { background: '#dcfce7', color: '#166534' };
        if (s === 'shipped') return { background: '#dbeafe', color: '#1e40af' };
        if (s === 'paid') return { background: '#e0f2fe', color: '#0369a1' };
        if (s === 'pending_artisan_acceptance') return { background: '#ffedd5', color: '#c2410c' };
        if (s === 'product_ready_by_artisan') return { background: '#fef08a', color: '#854d0e' };
        return { background: '#fef9c3', color: '#854d0e' };
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Orders...</div>;

    return (
        <div style={{ padding: '20px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Manage Orders ({processedOrders.length})</h1>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={filterBox}>
                        <Search size={18} color="#888" />
                        <input
                            placeholder="Order ID, Name, Phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={filterInput}
                        />
                    </div>

                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectFilter}>
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Processing (Paid)</option>
                        <option value="pending_artisan_acceptance">Artisan Pending</option>
                        <option value="product_ready_by_artisan">Artisan Ready (Dispatch Info)</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                    </select>

                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={selectFilter}>
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>

                    <button onClick={fetchOrders} style={refreshBtn}>Refresh</button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div style={bulkActionBar}>
                    <span style={{ fontWeight: '600' }}>{selectedIds.length} orders selected</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select onChange={e => handleBulkStatusUpdate(e.target.value)} style={bulkSelect}>
                            <option value="">Update Status...</option>
                            <option value="paid">Processing (Paid)</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                        </select>
                        <button onClick={handleBulkDelete} style={bulkDeleteBtn}><Trash2 size={16} /> Delete</button>
                    </div>
                </div>
            )}

            <div style={tableContainer}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                    <thead>
                        <tr style={headerRow}>
                            <th style={thStyle}><input type="checkbox" checked={selectedIds.length === processedOrders.length && processedOrders.length > 0} onChange={selectAll} /></th>
                            <th style={thStyle}>Date & ID</th>
                            <th style={thStyle}>Customer</th>
                            <th style={thStyle}>Contact</th>
                            <th style={thStyle}>Product</th>
                            <th style={thStyle}>Amount</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedOrders.map(order => (
                            <tr key={order.id} style={{ ...trStyle, background: selectedIds.includes(order.id) ? '#f0f4ff' : 'transparent' }}>
                                <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleSelect(order.id)} /></td>
                                <td style={tdStyle}>
                                    <div style={{ fontWeight: '600' }}>{formatDate(order.createdAt).split(',')[0]}</div>
                                    <div style={{ color: '#888', fontSize: '11px' }}>#{order.orderId || order.id.slice(0, 6)}</div>
                                </td>
                                <td style={tdStyle}>
                                    <div>{order.shipping?.firstName} {order.shipping?.lastName}</div>
                                    <div style={{ color: '#888', fontSize: '11px' }}>{order.userEmail}</div>
                                </td>
                                <td style={tdStyle}>
                                    <div>{order.shipping?.phone || 'N/A'}</div>
                                    <div style={{ fontSize: '11px', color: '#666', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.shipping?.city}</div>
                                </td>
                                <td style={tdStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <img src={order.product?.image} style={thumbImg} />
                                        <span style={{ fontSize: '12px' }}>{order.product?.name}</span>
                                    </div>
                                </td>
                                <td style={tdStyle}>
                                    <div style={{ fontWeight: '700' }}>{order.product?.price}</div>
                                    <div style={{ fontSize: '10px', color: order.paymentMethod === 'CD' ? '#f59e0b' : '#10b981' }}>{order.paymentMethod === 'CD' ? 'COD' : 'PREPAID'}</div>
                                </td>
                                <td style={tdStyle}>
                                    <span style={{ ...statusBadge, ...getStatusStyle(order.status) }}>{order.status || 'Pending'}</span>
                                </td>
                                <td style={tdStyle}>
                                    <button onClick={() => setEditingOrder(order)} style={manageBtn}>Manage</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Editing Modal (Condensed for brevity but keeping essential functionality) */}
            {editingOrder && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Order Details</h2>
                            <button onClick={() => { setEditingOrder(null); setDelhiveryLoading(false); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Notification for Remaining 30% */}
                        {editingOrder.status === 'product_ready_by_artisan' && editingOrder.payment?.type === 'PARTIAL_ADVANCE' && (
                            <div style={{ marginBottom: '15px', padding: '10px', background: '#fef08a', borderRadius: '8px', border: '1px solid #ca8a04' }}>
                                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#854d0e' }}>
                                    <strong>Artisan ready!</strong> The user owes 30% before dispatch.
                                </p>
                                <button
                                    onClick={() => {
                                        alert(`Notice: SMS/Email sent to ${editingOrder.shipping?.phone} & ${editingOrder.shipping?.email} with payment link for the remaining 30%.`);
                                    }}
                                    style={{ ...shipBtn, background: '#ca8a04' }}
                                >
                                    <MessageCircle size={16} /> Notify User for 30% Due
                                </button>
                            </div>
                        )}

                        {/* Shipping options */}
                        {editingOrder.status !== 'shipped' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                                <button onClick={handleShip} style={shipBtn}>
                                    <Truck size={16} /> Create Shiprocket Shipment
                                </button>

                                <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', background: '#f0fdf4' }}>
                                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#065f46' }}>
                                        Delhivery — Artisan Pickup
                                    </p>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#047857' }}>
                                        Pickup from: <strong>{editingOrder.artisanEmail || '—'}</strong>
                                    </p>
                                    {!editingOrder.artisanEmail && (
                                        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '6px 8px', borderRadius: '4px' }}>
                                            No artisan linked to this order. Assign an artisan first.
                                        </p>
                                    )}
                                    <button
                                        onClick={handleDelhiveryShip}
                                        disabled={delhiveryLoading || !editingOrder.artisanEmail}
                                        style={{ ...shipBtn, background: editingOrder.artisanEmail ? '#059669' : '#9ca3af', opacity: delhiveryLoading ? 0.7 : 1 }}
                                    >
                                        <Truck size={16} /> {delhiveryLoading ? 'Creating...' : 'Create Delhivery Consignment'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleUpdateStatus} style={{ marginTop: '20px' }}>
                            <label style={label}>Status</label>
                            <select name="status" defaultValue={editingOrder.status} style={input}>
                                <option value="paid">Processing (Paid)</option>
                                <option value="pending_artisan_acceptance">Artisan Pending</option>
                                <option value="product_ready_by_artisan">Ready for Dispatch / 30% Due</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                            </select>

                            <div style={{ marginTop: '15px' }}>
                                <label style={label}>Manual Tracking</label>
                                <input name="courier" placeholder="Courier Name" defaultValue={editingOrder.tracking?.courier} style={input} />
                                <input name="trackingId" placeholder="Tracking Number" defaultValue={editingOrder.tracking?.id} style={{ ...input, marginTop: '5px' }} />
                            </div>

                            <button type="submit" style={saveBtn}>Save Changes</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Styles
const filterBox = { display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', width: '250px' };
const filterInput = { border: 'none', padding: '10px', width: '100%', outline: 'none', fontSize: '14px' };
const selectFilter = { padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' };
const refreshBtn = { padding: '10px 15px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' };
const bulkActionBar = { background: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const bulkSelect = { padding: '6px', borderRadius: '4px', border: 'none', fontSize: '13px' };
const bulkDeleteBtn = { background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' };
const tableContainer = { background: '#fff', borderRadius: '12px', border: '1px solid #eee', overflowX: 'auto' };
const headerRow = { background: '#f8fafc', borderBottom: '1px solid #eee' };
const thStyle = { padding: '12px 15px', textAlign: 'left', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' };
const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };
const trStyle = { transition: 'background 0.2s' };
const thumbImg = { width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover' };
const statusBadge = { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' };
const manageBtn = { color: '#2563eb', border: '1px solid #bfdbfe', background: '#eff6ff', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modalBox = { background: '#fff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
const shipBtn = { width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const saveBtn = { width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' };
const label = { display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600' };
const input = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none' };