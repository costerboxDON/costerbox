/* src/app/secured/superadmin/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { IndianRupee, ShoppingBag, Shirt, Users, Plus, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalSales: 0,
        totalOrders: 0,
        activeProducts: 0,
        activeArtisans: 0,
        totalProfit: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Orders & Products in Parallel
                const [orderSnap, productSnap, artisanSnap] = await Promise.all([
                    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))),
                    getDocs(collection(db, "products")),
                    getDocs(query(collection(db, "users"), where("role", "==", "artisan")))
                ]);

                // Create Product Cost Map (ID -> Cost)
                const productCosts = {};
                productSnap.docs.forEach(doc => {
                    const d = doc.data();
                    productCosts[doc.id] = Number(d.costPerItem) || 0;
                });

                let sales = 0; // Cash Collected
                let totalRevenue = 0; // Full Order Value (Projected)
                let totalCost = 0; // Cost of Goods

                const orders = orderSnap.docs.map(doc => {
                    const data = doc.data();

                    // Sales (Cash Collected)
                    if (data.payment?.paidAmount) {
                        sales += Number(data.payment.paidAmount);
                    } else if (data.totalAmount && ['paid', 'shipped', 'delivered'].includes(data.status)) {
                        sales += Number(data.totalAmount); // Legacy/Full
                    }

                    // Revenue (Full Value) & Cost (For Profit)
                    // Only count for valid orders (not cancelled)
                    if (!['cancelled', 'returned'].includes(data.status)) {
                        const orderValue = Number(data.payment?.totalAmount || data.totalAmount || 0);
                        totalRevenue += orderValue;

                        // Cost Calculation
                        let itemCost = 0;
                        // Use cost snapshot in order if available (Historical accuracy)
                        if (data.product?.costPerItem) {
                            itemCost = Number(data.product.costPerItem);
                        }
                        // Fallback to current product cost
                        else if (data.product?.id && productCosts[data.product.id]) {
                            itemCost = productCosts[data.product.id];
                        }
                        totalCost += itemCost;
                    }

                    return { id: doc.id, ...data };
                });

                const profit = totalRevenue - totalCost;

                setStats({
                    totalSales: sales,
                    totalOrders: orders.length,
                    activeProducts: productSnap.size,
                    activeArtisans: artisanSnap.size,
                    totalProfit: profit
                });

                setRecentOrders(orders.slice(0, 5));

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Analytics...</div>;

    const statCards = [
        { label: 'Total Sales', value: formatCurrency(stats.totalSales), color: '#10b981', bg: '#d1fae5', icon: IndianRupee },
        { label: 'Est. Profit', value: formatCurrency(stats.totalProfit), color: '#8b5cf6', bg: '#ede9fe', icon: TrendingUp },
        { label: 'Total Orders', value: stats.totalOrders, color: '#3b82f6', bg: '#dbeafe', icon: ShoppingBag },
        { label: 'Active Products', value: stats.activeProducts, color: '#f59e0b', bg: '#fef3c7', icon: Shirt },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', margin: 0 }}>Dashboard Overview</h1>
                <span style={{ fontSize: '13px', color: '#666' }}>Real-time updates</span>
            </div>

            {/* STATS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                {statCards.map((stat, i) => (
                    <div key={i} style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f3f4f6' }}>
                        <div>
                            <h3 style={{ fontSize: '28px', margin: '0 0 5px 0', fontWeight: 'bold' }}>{stat.value}</h3>
                            <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>{stat.label}</span>
                        </div>
                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <stat.icon size={24} />
                        </div>
                    </div>
                ))}
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
                        {recentOrders.length === 0 ? <p style={{ color: '#999' }}>No orders yet.</p> : recentOrders.map((order, i) => (
                            <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: i !== recentOrders.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px' }}>
                                        <ShoppingBag size={18} color="#6b7280" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{order.product?.name || 'Unknown Item'}</div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                            {order.shipping?.firstName} • {new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}
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
                                        background: order.status === 'paid' ? '#dcfce7' : order.status === 'pending_artisan_acceptance' ? '#ffedd5' : '#f3f4f6',
                                        color: order.status === 'paid' ? '#166534' : order.status === 'pending_artisan_acceptance' ? '#c2410c' : '#374151',
                                        fontWeight: '600'
                                    }}>
                                        {order.status === 'pending_artisan_acceptance' ? 'Pending Artisan' : order.status}
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
                            <Link href="/secured/superadmin/team" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '10px', color: '#333', textDecoration: 'none', transition: 'background 0.2s', background: '#fff' }}>
                                <div style={{ background: '#fce7f3', color: '#be185d', padding: '10px', borderRadius: '8px' }}><Users size={20} /></div>
                                <span style={{ fontWeight: '500' }}>Register Artisan</span>
                            </Link>
                        </div>
                    </div>

                    <div style={{ background: '#4f46e5', padding: '25px', borderRadius: '12px', color: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>Growth</h3>
                            <TrendingUp size={20} />
                        </div>
                        <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '20px' }}>
                            Sales are tracking well. Active customizations have increased.
                        </p>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>+12% <span style={{ fontSize: '14px', fontWeight: 'normal', opacity: 0.8 }}>this month</span></div>
                    </div>
                </div>

            </div>
        </div>
    );
}