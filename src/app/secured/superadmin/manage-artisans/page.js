"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../../../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Search, Edit, Eye, User, Phone, MapPin, Package, ShoppingBag, X, Check, Save, ShieldAlert } from 'lucide-react';

export default function ManageArtisansPage() {
    const [artisans, setArtisans] = useState([]);
    const [filteredArtisans, setFilteredArtisans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest'); // newest, oldest, name-asc, name-desc

    // Modal States
    const [selectedArtisan, setSelectedArtisan] = useState(null); // For Profile View
    const [editingArtisan, setEditingArtisan] = useState(null); // For Edit View
    const [stats, setStats] = useState({ products: 0, orders: 0 }); // Stats for selected artisan

    // FETCH ARTISANS
    useEffect(() => {
        const fetchArtisans = async () => {
            setLoading(true);
            try {
                // Assuming 'role' field identifies artisans in 'users' collection
                // If you have a separate 'artisans' collection, change "users" to "artisans"
                const q = query(collection(db, "users"), where("role", "==", "artisan"));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Ensure fields exist
                    name: doc.data().name || 'Unknown Artisan',
                    email: doc.data().email || 'No Email',
                    phone: doc.data().phone || 'N/A',
                    address: doc.data().address || 'N/A',
                    joinedAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
                }));
                setArtisans(data);
                setFilteredArtisans(data);
            } catch (error) {
                console.error("Error fetching artisans:", error);
                // Fallback dummy data for UI testing if empty
                if (artisans.length === 0) {
                    // Keep empty or add mock if needed
                }
            } finally {
                setLoading(false);
            }
        };
        fetchArtisans();
    }, []);

    // FILTER & SORT
    useEffect(() => {
        let result = [...artisans];

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.name.toLowerCase().includes(lower) ||
                a.email.toLowerCase().includes(lower) ||
                a.phone.includes(lower)
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

    // FETCH STATS (When viewing profile)
    const loadArtisanStats = async (artisanId) => {
        // Mock stats or real queries
        // 1. Count products
        try {
            // Check if products have 'artisanId' or 'vendor' field matching artisan name/id
            // This depends on schema. I'll search by vendor name as a fallback or artisanId
            // Strategy: Try artisanId first
            let prodQ = query(collection(db, "products"), where("artisanId", "==", artisanId));
            let prodSnap = await getDocs(prodQ);

            // If 0, maybe try vendor name? (Optional, skipping for now to keep it simple)

            // 2. Count orders (This might be complex, verify schema later)
            // For now, let's assume specific order query or placeholder
            const ordersCount = 0; // Placeholder until order schema verified

            setStats({
                products: prodSnap.size,
                orders: ordersCount
            });
        } catch (e) {
            console.error("Error loading stats", e);
            setStats({ products: 0, orders: 0 });
        }
    };

    // HANDLERS
    const handleViewProfile = (artisan) => {
        setSelectedArtisan(artisan);
        loadArtisanStats(artisan.id);
    };

    const handleEdit = (artisan) => {
        setEditingArtisan({ ...artisan });
    };

    const handleSaveEdit = async () => {
        if (!editingArtisan) return;
        try {
            const docRef = doc(db, "users", editingArtisan.id);
            await updateDoc(docRef, {
                phone: editingArtisan.phone,
                address: editingArtisan.address
            });

            // Update local state
            setArtisans(prev => prev.map(a => a.id === editingArtisan.id ? editingArtisan : a));
            setEditingArtisan(null);
            alert("Artisan details updated!");
        } catch (e) {
            console.error("Error updating artisan:", e);
            alert("Failed to update.");
        }
    };

    const handleToggleBlacklist = async (artisan) => {
        const action = artisan.isBlacklisted ? "whitelist" : "blacklist";
        if (!window.confirm(`Are you sure you want to ${action} ${artisan.name}?`)) return;

        try {
            const docRef = doc(db, "users", artisan.id);
            const newState = !artisan.isBlacklisted;
            await updateDoc(docRef, {
                isBlacklisted: newState
            });

            // Update local state
            setArtisans(prev => prev.map(a => a.id === artisan.id ? { ...a, isBlacklisted: newState } : a));
            if (selectedArtisan?.id === artisan.id) {
                setSelectedArtisan(prev => ({ ...prev, isBlacklisted: newState }));
            }
            alert(`Artisan ${action}ed successfully.`);
        } catch (e) {
            console.error(`Error ${action}ing artisan:`, e);
            alert(`Failed to ${action} artisan.`);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>

            {/* HEADER & ACTIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>Manage Artisans</h1>
                    <p style={{ color: '#666' }}>Total Artisans: {artisans.length}</p>
                </div>
            </div>

            {/* FILTERS */}
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

            {/* ARTISANS TABLE */}
            <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #eee' }}>
                            <th style={{ padding: '15px', fontSize: '13px', fontWeight: '600', color: '#444' }}>ARTISAN</th>
                            <th style={{ padding: '15px', fontSize: '13px', fontWeight: '600', color: '#444' }}>CONTACT</th>
                            <th style={{ padding: '15px', fontSize: '13px', fontWeight: '600', color: '#444' }}>LOCATION</th>
                            <th style={{ padding: '15px', fontSize: '13px', fontWeight: '600', color: '#444' }}>JOINED</th>
                            <th style={{ padding: '15px', fontSize: '13px', fontWeight: '600', color: '#444', textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center' }}>Loading artisans...</td></tr>
                        ) : filteredArtisans.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center' }}>No artisans found matching your search.</td></tr>
                        ) : (
                            filteredArtisans.map(artisan => (
                                <tr key={artisan.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {artisan.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {artisan.name}
                                                    {artisan.isBlacklisted && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>BLACKLISTED</span>}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#888' }}>ID: {artisan.id.substring(0, 6)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontSize: '13px' }}>{artisan.email}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{artisan.phone}</div>
                                    </td>
                                    <td style={{ padding: '15px', fontSize: '13px', color: '#555' }}>
                                        {artisan.address || 'N/A'}
                                    </td>
                                    <td style={{ padding: '15px', fontSize: '13px', color: '#555' }}>
                                        {artisan.joinedAt.toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleToggleBlacklist(artisan)}
                                            style={{
                                                padding: '6px',
                                                marginRight: '5px',
                                                background: artisan.isBlacklisted ? '#fee2e2' : '#f3f4f6',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                            title={artisan.isBlacklisted ? "Whitelist Artisan" : "Blacklist Artisan"}
                                        >
                                            <ShieldAlert size={16} color={artisan.isBlacklisted ? "#dc2626" : "#444"} />
                                        </button>
                                        <button onClick={() => handleViewProfile(artisan)} style={{ padding: '6px', marginRight: '5px', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }} title="View Profile">
                                            <Eye size={16} color="#444" />
                                        </button>
                                        <button onClick={() => handleEdit(artisan)} style={{ padding: '6px', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }} title="Edit Details">
                                            <Edit size={16} color="#0066cc" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
                                value={editingArtisan.address}
                                onChange={(e) => setEditingArtisan({ ...editingArtisan, address: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '80px' }}
                            />
                        </div>

                        <button onClick={handleSaveEdit} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* === IDENTITY CARD MODAL (PROFILE) === */}
            {selectedArtisan && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
                    <div style={{ background: '#fff', width: '500px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>

                        {/* ID HEADER */}
                        <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', color: '#fff', padding: '25px', textAlign: 'center', position: 'relative' }}>
                            <button onClick={() => setSelectedArtisan(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} />
                            </button>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', border: '4px solid rgba(255,255,255,0.2)' }}>
                                {selectedArtisan.name.charAt(0).toUpperCase()}
                            </div>
                            <h2 style={{ margin: 0, fontSize: '22px' }}>{selectedArtisan.name}</h2>
                            <span style={{ display: 'inline-block', marginTop: '5px', padding: '3px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Verified Artisan
                            </span>
                        </div>

                        {/* ID BODY */}
                        <div style={{ padding: '25px' }}>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>{stats.products}</div>
                                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Total Products</div>
                                </div>
                                <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>{stats.orders}</div>
                                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Total Orders</div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#888' }}><User size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>Full Name</div>
                                        <div style={{ fontWeight: '500' }}>{selectedArtisan.name}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#888' }}><Check size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>Email Address</div>
                                        <div style={{ fontWeight: '500' }}>{selectedArtisan.email}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#888' }}><Phone size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>Phone Number</div>
                                        <div style={{ fontWeight: '500' }}>{selectedArtisan.phone}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#888' }}><MapPin size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>Address</div>
                                        <div style={{ fontWeight: '500' }}>{selectedArtisan.address || 'No address provided'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: '#f5f5f5', borderRadius: '50%' }}>
                                        <span style={{ color: '#888' }}><ShoppingBag size={16} /></span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>Joined On</div>
                                        <div style={{ fontWeight: '500' }}>{selectedArtisan.joinedAt.toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    onClick={() => handleToggleBlacklist(selectedArtisan)}
                                    style={{
                                        padding: '10px 20px',
                                        background: selectedArtisan.isBlacklisted ? '#10b981' : '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <ShieldAlert size={16} />
                                    {selectedArtisan.isBlacklisted ? 'Whitelist Artisan' : 'Blacklist Artisan'}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingArtisan(selectedArtisan);
                                        setSelectedArtisan(null);
                                    }}
                                    style={{ padding: '10px 20px', background: '#00af50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <Edit size={16} /> Edit Profile
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}