/* src/app/secured/superadmin/team/page.js */
"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../../../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { Search, Edit, Eye, User, Phone, MapPin, ShoppingBag, X, Check, Filter } from 'lucide-react';

export default function TeamPage() {
    const [artisans, setArtisans] = useState([]);
    const [filteredArtisans, setFilteredArtisans] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'add'
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest'); // 'newest', 'oldest', 'name-asc', 'name-desc'

    // MODAL STATES
    const [selectedArtisan, setSelectedArtisan] = useState(null); // For Profile View
    const [editingArtisan, setEditingArtisan] = useState(null); // For Edit View

    // FORM STATE (ADD NEW)
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', specialty: 'Zari Specialist', address: ''
    });

    // 1. FETCH ARTISANS & ORDERS
    useEffect(() => {
        // Get Users who are 'artisan'
        const qUsers = query(collection(db, "users"), where("role", "==", "artisan"));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                joinedAt: d.data().createdAt ? d.data().createdAt.toDate() : new Date()
            }));
            setArtisans(data);
            setFilteredArtisans(data);
        });

        // Get ALL Orders (to calculate payouts)
        const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubUsers(); unsubOrders(); };
    }, []);

    // 2. FILTER & SORT EFFECT
    useEffect(() => {
        let result = [...artisans];

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.name.toLowerCase().includes(lower) ||
                a.email.toLowerCase().includes(lower) ||
                (a.phone && a.phone.includes(lower))
            );
        }

        // Sort
        if (sortOption === 'newest') {
            result.sort((a, b) => b.joinedAt - a.joinedAt);
        } else if (sortOption === 'oldest') {
            result.sort((a, b) => a.joinedAt - b.joinedAt);
        } else if (sortOption === 'name-asc') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOption === 'name-desc') {
            result.sort((a, b) => b.name.localeCompare(a.name));
        }

        setFilteredArtisans(result);
    }, [searchTerm, sortOption, artisans]);

    // 3. PAYOUT CALCULATOR HELPER
    const calculatePayout = (artisanEmail) => {
        // Find all orders completed by this artisan
        const artisanOrders = orders.filter(o =>
            o.assignedArtisan === artisanEmail &&
            (o.status === 'Done' || o.status === 'Shipped')
        );

        const totalSales = artisanOrders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
        const payout = totalSales * 0.20; // 20% Calculation

        return {
            count: artisanOrders.length,
            sales: totalSales,
            payout: payout
        };
    };

    // 4. ADD ARTISAN FUNCTION
    const handleRegister = async () => {
        if (!formData.email || !formData.name) return alert("Name/Email required");
        try {
            await setDoc(doc(db, "users", formData.email), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                address: formData.address || '',
                role: 'artisan',
                specialty: formData.specialty,
                createdAt: new Date()
            });
            alert("✅ Artisan Added!");
            setFormData({ name: '', email: '', phone: '', specialty: 'Zari Specialist', address: '' });
            setActiveTab('list');
        } catch (err) {
            alert(err.message);
        }
    };

    // 5. EDIT ARTISAN FUNCTION
    const handleSaveEdit = async () => {
        if (!editingArtisan) return;
        try {
            const docRef = doc(db, "users", editingArtisan.id);
            await updateDoc(docRef, {
                phone: editingArtisan.phone,
                address: editingArtisan.address
            });
            setEditingArtisan(null);
            alert("Artisan details updated!");
        } catch (e) {
            console.error("Error updating artisan:", e);
            alert("Failed to update.");
        }
    };

    const getStatsForProfile = (artisan) => {
        const stats = calculatePayout(artisan.email);
        // We can add "Total Products" if available in 'products' collection, 
        // but for now we focus on Payouts/Jobs from orders as that's what we have locally
        return stats;
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>

            {/* HEADER & TABS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Manage Team & Payouts</h1>
                    <p style={{ color: '#666', fontSize: '14px' }}>Total Artisans: {artisans.length}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('list')}
                        style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'list' ? '#1a1a1a' : '#f0f0f0', color: activeTab === 'list' ? '#fff' : '#444' }}
                    >
                        View Team
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'add' ? '#1a1a1a' : '#f0f0f0', color: activeTab === 'add' ? '#fff' : '#444' }}
                    >
                        + Add Artisan
                    </button>
                </div>
            </div>

            {/* VIEW 1: ADD ARTISAN FORM */}
            {activeTab === 'add' && (
                <div style={styles.card}>
                    <h3 style={{ marginBottom: '20px' }}>Register New Artist</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={styles.label}>Name</label>
                            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={styles.input} />
                        </div>
                        <div>
                            <label style={styles.label}>Email (Login ID)</label>
                            <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={styles.input} />
                        </div>
                        <div>
                            <label style={styles.label}>Phone</label>
                            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={styles.input} />
                        </div>
                        <div>
                            <label style={styles.label}>Address</label>
                            <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={styles.input} />
                        </div>
                        <div>
                            <label style={styles.label}>Specialty</label>
                            <select value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} style={styles.input}>
                                <option>Zari Specialist</option>
                                <option>Aari Artist</option>
                                <option>Hand Stitching</option>
                                <option>Finishing</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={handleRegister} style={styles.saveBtn}>Create Account</button>
                </div>
            )}

            {/* VIEW 2: ARTISAN LIST & PAYOUTS */}
            {activeTab === 'list' && (
                <>
                    {/* FILTERS TOOLBAR */}
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                            <input
                                type="text"
                                placeholder="Search by name, email, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #ddd', borderRadius: '6px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Filter size={18} color="#666" />
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minWidth: '150px' }}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                            </select>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8f9fa' }}>
                                <tr style={{ textAlign: 'left' }}>
                                    <th style={styles.th}>Artisan Name</th>
                                    <th style={styles.th}>Specialty</th>
                                    <th style={styles.th}>Completed Jobs</th>
                                    <th style={styles.th}>Total Sales</th>
                                    <th style={styles.th}>Payout (20%)</th>
                                    <th style={styles.th}>Status/Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredArtisans.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No artisans found.</td></tr>
                                ) : (
                                    filteredArtisans.map(art => {
                                        const stats = calculatePayout(art.email);
                                        return (
                                            <tr key={art.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                                            {art.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <strong>{art.name}</strong><br />
                                                            <span style={{ fontSize: '12px', color: '#666' }}>{art.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>{art.specialty}</td>
                                                <td style={styles.td}>
                                                    <span style={{ fontWeight: 'bold' }}>{stats.count}</span>
                                                </td>
                                                <td style={styles.td}>₹{stats.sales.toLocaleString()}</td>
                                                <td style={styles.td}>
                                                    <span style={{ color: 'green', fontWeight: 'bold', background: '#e8f5e9', padding: '5px 10px', borderRadius: '4px' }}>
                                                        ₹{stats.payout.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={() => setSelectedArtisan(art)} style={styles.actionBtn} title="View Identity Card">
                                                            <Eye size={16} />
                                                        </button>
                                                        <button onClick={() => setEditingArtisan({ ...art })} style={styles.actionBtn} title="Edit Details">
                                                            <Edit size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* === EDIT MODAL === */}
            {editingArtisan && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '400px', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Artisan</h2>
                            <button onClick={() => setEditingArtisan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Phone Number</label>
                            <input
                                value={editingArtisan.phone}
                                onChange={(e) => setEditingArtisan({ ...editingArtisan, phone: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Address</label>
                            <textarea
                                value={editingArtisan.address || ''}
                                onChange={(e) => setEditingArtisan({ ...editingArtisan, address: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '80px' }}
                            />
                        </div>

                        <button onClick={handleSaveEdit} style={{ width: '100%', padding: '12px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* === IDENTITY CARD MODAL (PROFILE) === */}
            {selectedArtisan && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
                    <div style={{ background: '#fff', width: '450px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>

                        {/* ID HEADER */}
                        <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', color: '#fff', padding: '25px', textAlign: 'center', position: 'relative' }}>
                            <button onClick={() => setSelectedArtisan(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} />
                            </button>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', border: '4px solid rgba(255,255,255,0.2)' }}>
                                {selectedArtisan.name.charAt(0).toUpperCase()}
                            </div>
                            <h2 style={{ margin: 0, fontSize: '22px' }}>{selectedArtisan.name}</h2>
                            <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '3px' }}>{selectedArtisan.specialty}</div>
                        </div>

                        {/* ID BODY */}
                        <div style={{ padding: '25px' }}>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a' }}>{getStatsForProfile(selectedArtisan).count}</div>
                                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed Jobs</div>
                                </div>
                                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #dcfce7' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>₹{getStatsForProfile(selectedArtisan).payout.toLocaleString()}</div>
                                    <div style={{ fontSize: '10px', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Payout</div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#555' }}><Check size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Email Address</div>
                                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{selectedArtisan.email}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#555' }}><Phone size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Phone Number</div>
                                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{selectedArtisan.phone}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#555' }}><MapPin size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Address</div>
                                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{selectedArtisan.address || 'No address provided'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#555' }}><ShoppingBag size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Joined On</div>
                                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{selectedArtisan.joinedAt.toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Footer Actions */}
                        <div style={{ padding: '15px 25px', borderTop: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    setEditingArtisan(selectedArtisan);
                                    setSelectedArtisan(null);
                                }}
                                style={{ padding: '8px 15px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}
                            >
                                <Edit size={14} /> Edit Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

const styles = {
    card: { background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    label: { display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#555' },
    input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px' },
    saveBtn: { marginTop: '20px', padding: '12px 25px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    th: { padding: '15px', fontSize: '13px', color: '#555', borderBottom: '1px solid #eee' },
    td: { padding: '15px', fontSize: '14px', verticalAlign: 'middle' },
    actionBtn: { padding: '6px', marginRight: '5px', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
};