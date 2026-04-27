/* src/app/orders/page.js */
"use client";
import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { Package, Truck, CheckCircle, ExternalLink, MapPin, MessageCircle } from 'lucide-react';
import ChatWindow from '../../components/ChatWindow';
import { useRouter } from 'next/navigation';
import '../../styles/orders.css';

export default function MyOrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedChatOrder, setSelectedChatOrder] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/secured/login');
            return;
        }

        const fetchOrders = async () => {
            if (!user) return;
            setError(null);
            console.log("Fetching orders for user:", user.uid);

            try {
                // Simple query first - no ordering to avoid index issues
                const q = query(
                    collection(db, "orders"),
                    where("userId", "==", user.uid)
                );

                const querySnapshot = await getDocs(q);
                console.log("Orders found:", querySnapshot.size);

                const results = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Sort client-side
                results.sort((a, b) => {
                    const getTime = (t) => {
                        if (!t) return 0;
                        if (typeof t.toMillis === 'function') return t.toMillis(); // Firestore Timestamp
                        if (t instanceof Date) return t.getTime(); // JS Date
                        if (typeof t === 'number') return t; // Timestamp as number
                        if (typeof t === 'string') return new Date(t).getTime(); // ISO String
                        return 0;
                    };
                    return getTime(b.createdAt) - getTime(a.createdAt);
                });

                setOrders(results);
            } catch (err) {
                console.error("Error fetching orders:", err);
                setError("Unable to load your orders. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [user]);

    // Helper for Date Display
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Date unknown';
        try {
            if (typeof timestamp.toDate === 'function') return timestamp.toDate().toLocaleDateString();
            if (timestamp instanceof Date) return timestamp.toLocaleDateString();
            if (typeof timestamp === 'number') return new Date(timestamp).toLocaleDateString();
            if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString();
            return 'Invalid Date';
        } catch (e) {
            return 'Date Error';
        }
    };

    // Helper for Progress Bar
    const getStatusStep = (status) => {
        if (status === 'delivered') return 3;
        if (status === 'shipped') return 2;
        return 1; // 'paid' or 'processing'
    };

    if (loading || authLoading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading history...</div>;
    if (!user) return null; // Let the useEffect redirect handle this cleanly
    if (error) return <div className="orders-container no-orders"><p style={{ color: 'red' }}>{error}</p></div>;

    return (
        <div className="orders-container">
            <h1 className="page-title">My Orders</h1>

            {orders.length === 0 ? (
                <div className="no-orders"><p>No orders yet.</p></div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => {
                        const step = getStatusStep(order.status);

                        return (
                            <div key={order.id} className="order-card">
                                {/* HEADER */}
                                <div className="order-header">
                                    <div className="order-id">
                                        Order #<span>{order.orderId ? order.orderId : order.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="order-date">
                                        {formatDate(order.createdAt)}
                                    </div>
                                </div>

                                {/* TRACKING BAR */}
                                <div style={{ padding: '24px 24px 8px' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '36rem', marginBottom: '8px' }}>
                                        {/* Line Background */}
                                        <div style={{ position: 'absolute', left: 0, top: '50%', width: '100%', height: '4px', background: '#e5e7eb', zIndex: 0, transform: 'translateY(-50%)' }}></div>
                                        {/* Colored Progress Line */}
                                        <div style={{ position: 'absolute', left: 0, top: '50%', height: '4px', background: '#16a34a', zIndex: 0, transform: 'translateY(-50%)', transition: 'width 0.5s', width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>

                                        {/* Steps */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '4px', borderRadius: '50%', position: 'relative', zIndex: 1, color: step >= 1 ? '#16a34a' : '#9ca3af' }}>
                                            <Package size={24} fill={step >= 1 ? "currentColor" : "none"} />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Processing</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '4px', borderRadius: '50%', position: 'relative', zIndex: 1, color: step >= 2 ? '#16a34a' : '#9ca3af' }}>
                                            <Truck size={24} fill={step >= 2 ? "currentColor" : "none"} />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Shipped</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '4px', borderRadius: '50%', position: 'relative', zIndex: 1, color: step >= 3 ? '#16a34a' : '#9ca3af' }}>
                                            <CheckCircle size={24} fill={step >= 3 ? "currentColor" : "none"} />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Delivered</span>
                                        </div>
                                    </div>

                                    {/* TRACKING BOX — always shown */}
                                    <div style={{ marginTop: '16px', padding: '14px 16px', background: order.tracking?.id ? '#eff6ff' : '#f9fafb', border: `1px solid ${order.tracking?.id ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                                {order.tracking?.id ? (
                                                    <>
                                                        <p style={{ fontSize: '13px', color: '#1e40af', fontWeight: 700, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Truck size={14} /> {order.tracking.courier || 'Courier Partner'}
                                                        </p>
                                                        <p style={{ fontSize: '12px', color: '#3b82f6', margin: 0, paddingLeft: '20px' }}>
                                                            AWB: <strong>{order.tracking.id}</strong>
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Truck size={14} />
                                                        {order.status === 'delivered'
                                                            ? 'Order delivered'
                                                            : 'Tracking ID will be assigned once shipped'}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Always-visible Track button */}
                                            {order.tracking?.id ? (
                                                <a
                                                    href={`https://shiprocket.co/tracking/${order.tracking.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '9px 16px', background: '#2563eb', color: '#fff',
                                                        borderRadius: '8px', textDecoration: 'none',
                                                        fontSize: '13px', fontWeight: 700,
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <MapPin size={14} /> Track on Shiprocket <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span
                                                    title="Tracking will be available once your order is shipped"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '9px 16px', background: '#e5e7eb', color: '#9ca3af',
                                                        borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                                        cursor: 'not-allowed', userSelect: 'none',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <MapPin size={14} /> Track on Shiprocket
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* PRODUCT INFO */}
                                <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '16px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {Array.isArray(order.items) && order.items.length > 0 ? (
                                        order.items.map((item, idx) => (
                                            <div key={idx} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '90px 1fr auto',
                                                gap: '16px',
                                                alignItems: 'center',
                                                paddingTop: idx > 0 ? '16px' : '0',
                                                borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none'
                                            }}>
                                                {/* Item image */}
                                                <img
                                                    src={
                                                        item.image ||
                                                        item.featuredImage ||
                                                        (Array.isArray(item.media) && item.media.length > 0 ? item.media[0] : null) ||
                                                        'https://placehold.co/90x90/f5f5f5/aaa?text=Item'
                                                    }
                                                    alt={item.name || 'Product'}
                                                    style={{
                                                        width: '90px', height: '90px',
                                                        objectFit: 'cover', borderRadius: '8px',
                                                        background: '#eee', flexShrink: 0
                                                    }}
                                                    onError={e => { e.target.src = 'https://placehold.co/90x90/f5f5f5/aaa?text=Item'; }}
                                                />

                                                {/* Item info */}
                                                <div>
                                                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>
                                                        {item.name || 'Product'}
                                                    </h3>
                                                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>
                                                        Qty: {item.quantity || 1}
                                                        {item.selectedSize && ` · Size: ${item.selectedSize}`}
                                                    </p>
                                                    <p style={{ fontSize: '14px', color: '#111', fontWeight: 600, margin: '0 0 4px' }}>
                                                        ₹{item.paidPrice || item.price || '—'}
                                                    </p>

                                                    {/* CHAT BUTTON FOR CUSTOM ORDERS — only on first item */}
                                                    {order.isCustomOrder && order.artisanId && idx === 0 && (
                                                        <button
                                                            onClick={() => setSelectedChatOrder(order)}
                                                            style={{
                                                                marginTop: '8px',
                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                padding: '7px 12px',
                                                                background: '#3b82f6', color: '#fff',
                                                                border: 'none', borderRadius: '6px',
                                                                cursor: 'pointer', fontSize: '13px', fontWeight: 500
                                                            }}
                                                        >
                                                            <MessageCircle size={15} /> Chat with Artisan
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Right side badges — only on first item to avoid repetition */}
                                                <div style={{ textAlign: 'right' }}>
                                                    {idx === 0 && order.isCustomOrder && order.payment?.paidAmount && (
                                                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginBottom: '6px' }}>
                                                            Partial Paid: ₹{order.payment.paidAmount}
                                                        </div>
                                                    )}
                                                    {idx === 0 && order.status === 'pending_artisan_acceptance' && (
                                                        <div style={{
                                                            background: '#fffbeb', color: '#92400e',
                                                            padding: '6px 10px', borderRadius: '8px',
                                                            fontSize: '11px', fontWeight: 600,
                                                            border: '1px solid #fde68a',
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }}></div>
                                                            Awaiting artisan
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        /* Fallback: old order shape using order.product */
                                        <div className="order-body" style={{ borderTop: 'none', marginTop: 0 }}>
                                            <img
                                                src={
                                                    order.product?.featuredImage ||
                                                    order.product?.image ||
                                                    (Array.isArray(order.product?.media) && order.product.media.length > 0 ? order.product.media[0] : null) ||
                                                    'https://placehold.co/100x100/f5f5f5/aaa?text=No+Image'
                                                }
                                                alt={order.product?.name || 'Product'}
                                                className="order-img"
                                                style={{ objectFit: 'cover', background: '#f5f5f5' }}
                                                onError={e => { e.target.src = 'https://placehold.co/100x100/f5f5f5/aaa?text=No+Image'; }}
                                            />
                                            <div className="product-info">
                                                <h3>{order.product?.name || 'Product'}</h3>
                                                <p style={{ fontSize: '14px', color: '#6b7280' }}>Qty: 1</p>
                                            </div>
                                            <div className="order-total" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CHAT MODAL */}
            {selectedChatOrder && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '10px' }}>
                    <ChatWindow
                        chatId={`order_${selectedChatOrder.id}`}
                        artisanId={selectedChatOrder.artisanId}
                        artisanName={selectedChatOrder.artisanName}
                        customerId={user.uid}
                        productName={selectedChatOrder.product?.name}
                        onClose={() => setSelectedChatOrder(null)}
                    />
                </div>
            )}
        </div>
    );
}