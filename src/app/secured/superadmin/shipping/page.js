/* src/app/secured/superadmin/shipping/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../../../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Truck, Package, Clock, CheckCircle } from 'lucide-react';

export default function ShippingPage() {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShipments = async () => {
            try {
                // Fetch orders that have shipmentId or status 'shipped'/'delivered'
                // Firestore OR queries are tricky, let's just fetch all orders and filter client side for now (assuming low volume)
                // Or filtered query: status 'in' ['shipped', 'delivered']
                const q = query(
                    collection(db, "orders"),
                    where("status", "in", ["shipped", "delivered", "ready_for_shipping"])
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Sort by date (desc)
                list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setShipments(list);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchShipments();
    }, []);

    const getStatusColor = (status) => {
        if (status === 'delivered') return '#10b981';
        if (status === 'shipped') return '#3b82f6';
        return '#f59e0b';
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Shipping Data...</div>;

    return (
        <div>
            <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>Shipping & Logistics</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '50%', color: '#0369a1' }}><Truck size={24} /></div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{shipments.filter(s => s.status === 'shipped').length}</div>
                        <div style={{ color: '#666', fontSize: '14px' }}>In Transit</div>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '50%', color: '#166534' }}><CheckCircle size={24} /></div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{shipments.filter(s => s.status === 'delivered').length}</div>
                        <div style={{ color: '#666', fontSize: '14px' }}>Delivered</div>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '50%', color: '#b45309' }}><Clock size={24} /></div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{shipments.length}</div>
                        <div style={{ color: '#666', fontSize: '14px' }}>Total Shipments</div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Order ID</th>
                            <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Customer</th>
                            <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', color: '#666' }}>AWB / Tracking</th>
                            <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Status</th>
                            <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', color: '#666' }}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipments.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No active shipments found.</td></tr>
                        ) : shipments.map(ship => (
                            <tr key={ship.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '15px', fontWeight: '500' }}>#{ship.id.slice(-6)}</td>
                                <td style={{ padding: '15px' }}>
                                    <div>{ship.shipping?.firstName}</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>{ship.shipping?.city}</div>
                                </td>
                                <td style={{ padding: '15px' }}>
                                    {ship.awbCode ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Package size={14} /> {ship.awbCode}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#999' }}>-</span>
                                    )}
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                        background: `${getStatusColor(ship.status)}20`, color: getStatusColor(ship.status)
                                    }}>
                                        {ship.status?.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>
                                    {new Date(ship.createdAt?.seconds * 1000).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}