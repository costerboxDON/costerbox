/* src/app/secured/superadmin/page.js */
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { IndianRupee, ShoppingBag, Shirt, Plus, TrendingUp, TrendingDown, RotateCcw, Calendar } from 'lucide-react';

const EXCLUDED_FROM_PROFIT = ['cancelled', 'returned', 'refunded'];

const getOrderTime = (t) => {
    if (!t) return 0;
    if (typeof t.toMillis === 'function') return t.toMillis(); // Firestore Timestamp
    if (t instanceof Date) return t.getTime();
    if (typeof t === 'number') return t;
    if (typeof t === 'string') return new Date(t).getTime();
    return 0;
};

const toDateInput = (d) => d.toISOString().slice(0, 10);

const RANGE_PRESETS = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
];

const computePreset = (key) => {
    const now = new Date();
    const end = toDateInput(now);
    let start;
    switch (key) {
        case 'today':
            start = end;
            break;
        case '7d': {
            const d = new Date(now); d.setDate(d.getDate() - 6);
            start = toDateInput(d);
            break;
        }
        case '30d': {
            const d = new Date(now); d.setDate(d.getDate() - 29);
            start = toDateInput(d);
            break;
        }
        case 'year':
            start = toDateInput(new Date(now.getFullYear(), 0, 1));
            break;
        case 'all':
            start = '';
            break;
        case 'month':
        default:
            start = toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
            break;
    }
    return { start, end: key === 'all' ? '' : end };
};

export default function AdminDashboard() {
    const [allOrders, setAllOrders] = useState([]);
    const [productCosts, setProductCosts] = useState({});
    const [activeProducts, setActiveProducts] = useState(0);
    const [loading, setLoading] = useState(true);

    const [preset, setPreset] = useState('month');
    const initialRange = computePreset('month');
    const [dateFrom, setDateFrom] = useState(initialRange.start);
    const [dateTo, setDateTo] = useState(initialRange.end);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orderSnap, productSnap] = await Promise.all([
                    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))),
                    getDocs(collection(db, "products")),
                ]);

                const costs = {};
                productSnap.docs.forEach(doc => {
                    const d = doc.data();
                    costs[doc.id] = Number(d.costPerItem) || 0;
                });

                setProductCosts(costs);
                setActiveProducts(productSnap.size);
                setAllOrders(orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const applyPreset = (key) => {
        setPreset(key);
        const { start, end } = computePreset(key);
        setDateFrom(start);
        setDateTo(end);
    };

    // Refunded amount for an order — prefer the recorded refund object, fall back to paid amount.
    const refundAmountOf = (order) => Number(order.refund?.amount ?? order.payment?.paidAmount ?? order.totalAmount ?? 0);

    const costOf = (order) => {
        let itemCost = 0;
        if (Array.isArray(order.items) && order.items.length > 0) {
            itemCost = order.items.reduce((sum, item) => {
                const c = productCosts[item.id] || 0;
                return sum + c * (item.quantity || 1);
            }, 0);
        } else if (order.product?.costPerItem) {
            itemCost = Number(order.product.costPerItem);
        } else if (order.product?.id && productCosts[order.product.id]) {
            itemCost = productCosts[order.product.id];
        }
        return itemCost;
    };

    const computeStatsFor = (orders) => {
        let netSales = 0;      // cash actually retained (collected minus refunded)
        let totalRevenue = 0;  // full order value, excluding cancelled/returned/refunded
        let totalCost = 0;
        let totalRefunded = 0;
        let refundedCount = 0;

        orders.forEach(order => {
            const isRefunded = order.status === 'refunded';

            // Cash collected
            let collected = 0;
            if (order.payment?.paidAmount) collected = Number(order.payment.paidAmount);
            else if (order.totalAmount && ['paid', 'shipped', 'delivered'].includes(order.status)) collected = Number(order.totalAmount);

            if (isRefunded) {
                totalRefunded += refundAmountOf(order);
                refundedCount += 1;
            } else {
                netSales += collected;
            }

            if (!EXCLUDED_FROM_PROFIT.includes(order.status)) {
                totalRevenue += Number(order.payment?.totalAmount || order.totalAmount || 0);
                totalCost += costOf(order);
            }
        });

        return {
            netSales,
            totalRevenue,
            totalCost,
            netProfit: totalRevenue - totalCost,
            totalRefunded,
            refundedCount,
            totalOrders: orders.length,
        };
    };

    const { filteredOrders, stats, monthly, growthPct } = useMemo(() => {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;

        const inRange = (order) => {
            const t = getOrderTime(order.createdAt);
            if (!t) return false;
            if (from !== null && t < from) return false;
            if (to !== null && t > to) return false;
            return true;
        };

        const filtered = allOrders.filter(inRange);
        const currentStats = computeStatsFor(filtered);

        // Monthly breakdown across the filtered range
        const buckets = {};
        filtered.forEach(order => {
            const t = getOrderTime(order.createdAt);
            if (!t) return;
            const d = new Date(t);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!buckets[key]) buckets[key] = { key, label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), orders: [] };
            buckets[key].orders.push(order);
        });
        const monthlyBuckets = Object.values(buckets)
            .sort((a, b) => a.key.localeCompare(b.key))
            .map(b => ({ ...b, ...computeStatsFor(b.orders) }));

        // Growth vs. the immediately preceding period of equal length (only when a bounded range is set)
        let growth = null;
        if (from !== null && to !== null) {
            const spanMs = to - from;
            const prevTo = from - 1;
            const prevFrom = prevTo - spanMs;
            const prevOrders = allOrders.filter(order => {
                const t = getOrderTime(order.createdAt);
                return t && t >= prevFrom && t <= prevTo;
            });
            const prevStats = computeStatsFor(prevOrders);
            if (prevStats.netSales > 0) {
                growth = ((currentStats.netSales - prevStats.netSales) / prevStats.netSales) * 100;
            } else if (currentStats.netSales > 0) {
                growth = 100;
            } else {
                growth = 0;
            }
        }

        return { filteredOrders: filtered, stats: currentStats, monthly: monthlyBuckets, growthPct: growth };
    }, [allOrders, dateFrom, dateTo, productCosts]);

    const recentOrders = useMemo(() => (
        [...filteredOrders].sort((a, b) => getOrderTime(b.createdAt) - getOrderTime(a.createdAt)).slice(0, 5)
    ), [filteredOrders]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Analytics...</div>;

    const statCards = [
        { label: 'Net Sales', value: formatCurrency(stats.netSales), color: '#10b981', bg: '#d1fae5', icon: IndianRupee },
        { label: 'Net Profit', value: formatCurrency(stats.netProfit), color: '#8b5cf6', bg: '#ede9fe', icon: TrendingUp },
        { label: 'Refunded', value: `${formatCurrency(stats.totalRefunded)} (${stats.refundedCount})`, color: '#dc2626', bg: '#fee2e2', icon: RotateCcw },
        { label: 'Orders', value: stats.totalOrders, color: '#3b82f6', bg: '#dbeafe', icon: ShoppingBag },
        { label: 'Active Products', value: activeProducts, color: '#f59e0b', bg: '#fef3c7', icon: Shirt },
    ];

    const maxMonthlySales = Math.max(1, ...monthly.map(m => m.netSales));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <h1 style={{ fontSize: '24px', margin: 0 }}>Dashboard Overview</h1>

                {/* DATE RANGE FILTER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <select
                        value={preset}
                        onChange={e => applyPreset(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff', cursor: 'pointer' }}
                    >
                        {RANGE_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 10px' }}>
                        <Calendar size={14} color="#9ca3af" />
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={e => { setPreset('custom'); setDateFrom(e.target.value); }}
                            style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#374151' }}
                        />
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>to</span>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={e => { setPreset('custom'); setDateTo(e.target.value); }}
                            style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#374151' }}
                        />
                    </div>
                </div>
            </div>

            {/* STATS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {statCards.map((stat, i) => (
                    <div key={i} style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f3f4f6' }}>
                        <div>
                            <h3 style={{ fontSize: '22px', margin: '0 0 5px 0', fontWeight: 'bold' }}>{stat.value}</h3>
                            <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>{stat.label}</span>
                        </div>
                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <stat.icon size={22} />
                        </div>
                    </div>
                ))}
            </div>

            {/* MONTHLY SALES CHART */}
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Monthly Sales</h3>
                {monthly.length === 0 ? (
                    <p style={{ color: '#999', margin: 0 }}>No orders in this date range.</p>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', height: '180px', padding: '0 4px' }}>
                        {monthly.map((m) => {
                            const heightPct = Math.max(4, (m.netSales / maxMonthlySales) * 100);
                            return (
                                <div key={m.key} title={`${m.label}: ${formatCurrency(m.netSales)} across ${m.totalOrders} order(s)`}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'default' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                                        {m.netSales >= 1000 ? `₹${(m.netSales / 1000).toFixed(1)}k` : `₹${m.netSales}`}
                                    </span>
                                    <div style={{
                                        width: '100%',
                                        maxWidth: '48px',
                                        height: `${heightPct}%`,
                                        background: '#10b981',
                                        borderRadius: '4px 4px 2px 2px',
                                        transition: 'height 0.3s ease',
                                    }} />
                                    <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', fontWeight: '600' }}>{m.label}</span>
                                    {m.totalRefunded > 0 && (
                                        <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px' }}>-{formatCurrency(m.totalRefunded)}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* LOWER SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>

                {/* Recent Orders */}
                <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Recent Orders</h3>
                        <Link href="/secured/superadmin/orders" style={{ fontSize: '13px', color: '#2563eb', fontWeight: '500' }}>View All</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {recentOrders.length === 0 ? <p style={{ color: '#999' }}>No orders in this date range.</p> : recentOrders.map((order, i) => (
                            <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: i !== recentOrders.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px' }}>
                                        <ShoppingBag size={18} color="#6b7280" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                            {(() => {
                                                const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;
                                                return firstItem
                                                    ? (firstItem.name || firstItem.title || 'Product')
                                                    : (order.product?.name || order.product?.title || 'Unknown Item');
                                            })()}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                            {order.shipping?.firstName} • {new Date(getOrderTime(order.createdAt)).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                        {formatCurrency(order.payment?.paidAmount || order.totalAmount || 0)}
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: order.status === 'paid' ? '#dcfce7' : order.status === 'refunded' ? '#fee2e2' : '#f3f4f6',
                                        color: order.status === 'paid' ? '#166534' : order.status === 'refunded' ? '#991b1b' : '#374151',
                                        fontWeight: '600'
                                    }}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Quick Actions</h3>
                        <div style={{ display: 'grid', gap: '15px' }}>
                            <Link href="/secured/superadmin/add-product" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '10px', color: '#333', textDecoration: 'none', transition: 'background 0.2s', background: '#fff' }}>
                                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '10px', borderRadius: '8px' }}><Plus size={20} /></div>
                                <span style={{ fontWeight: '500' }}>Add New Product</span>
                            </Link>
                        </div>
                    </div>

                    <div style={{ background: '#4f46e5', padding: '25px', borderRadius: '12px', color: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>Growth</h3>
                            {growthPct === null || growthPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '20px' }}>
                            {growthPct === null
                                ? 'Select a bounded date range to compare against the previous period.'
                                : 'Net sales vs. the previous period of equal length.'}
                        </p>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                            {growthPct === null ? '—' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
