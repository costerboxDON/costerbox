"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Landmark, RotateCcw, RefreshCw } from 'lucide-react';

const toDateStr = (d) => d.toISOString().slice(0, 10);

const RANGE_PRESETS = [
    { key: '7d', label: 'Last 7 Days', days: 7 },
    { key: '30d', label: 'Last 30 Days', days: 30 },
    { key: '90d', label: 'Last 90 Days', days: 90 },
];

const computePreset = (days) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return { start: toDateStr(start), end: toDateStr(end) };
};

const formatCurrency = (paise) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100);
const formatDate = (unixSeconds) => unixSeconds ? new Date(unixSeconds * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_COLORS = {
    captured: { bg: '#dcfce7', color: '#166534' },
    authorized: { bg: '#dbeafe', color: '#1e40af' },
    failed: { bg: '#fee2e2', color: '#991b1b' },
    refunded: { bg: '#ede9fe', color: '#5b21b6' },
    created: { bg: '#f3f4f6', color: '#374151' },
    processed: { bg: '#dcfce7', color: '#166534' },
    pending: { bg: '#fef9c3', color: '#854d0e' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: cfg.bg, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
            {status}
        </span>
    );
}

const TABS = [
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settlements', label: 'Settlements', icon: Landmark },
    { id: 'refunds', label: 'Refunds', icon: RotateCcw },
];

export default function RazorpayAdminPage() {
    const [activeTab, setActiveTab] = useState('payments');

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>Razorpay</h1>
                <span style={{ fontSize: '13px', color: '#888' }}>Live data from your Razorpay account</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', borderBottom: '1px solid #e5e7eb' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '13px', fontWeight: activeTab === tab.id ? '700' : '500',
                            color: activeTab === tab.id ? '#1a1a1a' : '#6b7280',
                            borderBottom: activeTab === tab.id ? '2px solid #1a1a1a' : '2px solid transparent',
                            marginBottom: '-1px',
                        }}
                    >
                        <tab.icon size={15} /> {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'payments' && <PaymentsTab />}
            {activeTab === 'settlements' && <SettlementsTab />}
            {activeTab === 'refunds' && <RefundsTab />}
        </div>
    );
}

function DateRangeBar({ preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo, onRefresh }) {
    const applyPreset = (key) => {
        setPreset(key);
        const p = RANGE_PRESETS.find(r => r.key === key);
        if (!p) return;
        const { start, end } = computePreset(p.days);
        setDateFrom(start);
        setDateTo(end);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <select value={preset} onChange={e => applyPreset(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff', cursor: 'pointer' }}>
                {RANGE_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 10px' }}>
                <input type="date" value={dateFrom} max={dateTo} onChange={e => { setPreset('custom'); setDateFrom(e.target.value); }} style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#374151' }} />
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>to</span>
                <input type="date" value={dateTo} min={dateFrom} onChange={e => { setPreset('custom'); setDateTo(e.target.value); }} style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#374151' }} />
            </div>
            <button onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <RefreshCw size={14} /> Refresh
            </button>
        </div>
    );
}

function StatCard({ label, value, color, bg, icon: Icon }) {
    return (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f3f4f6' }}>
            <div>
                <h3 style={{ fontSize: '20px', margin: '0 0 5px 0', fontWeight: 'bold' }}>{value}</h3>
                <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>{label}</span>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} />
            </div>
        </div>
    );
}

function PaymentsTab() {
    const [preset, setPreset] = useState('30d');
    const init = computePreset(30);
    const [dateFrom, setDateFrom] = useState(init.start);
    const [dateTo, setDateTo] = useState(init.end);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/razorpay/admin/payments?from=${dateFrom}&to=${dateTo}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setItems(json.items);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }, [dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const captured = items.filter(p => p.status === 'captured');
    const totalCaptured = captured.reduce((s, p) => s + p.amount, 0);
    const totalRefunded = items.reduce((s, p) => s + (p.amount_refunded || 0), 0);
    const failedCount = items.filter(p => p.status === 'failed').length;

    return (
        <div>
            <DateRangeBar preset={preset} setPreset={setPreset} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} onRefresh={fetchData} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '25px' }}>
                <StatCard label="Captured Amount" value={formatCurrency(totalCaptured)} color="#10b981" bg="#d1fae5" icon={CreditCard} />
                <StatCard label="Payments" value={items.length} color="#3b82f6" bg="#dbeafe" icon={CreditCard} />
                <StatCard label="Refunded Amount" value={formatCurrency(totalRefunded)} color="#8b5cf6" bg="#ede9fe" icon={RotateCcw} />
                <StatCard label="Failed" value={failedCount} color="#dc2626" bg="#fee2e2" icon={CreditCard} />
            </div>

            {error ? (
                <ErrorBox error={error} onRetry={fetchData} />
            ) : loading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: '#999' }}>Loading payments...</div>
            ) : (
                <DataTable
                    columns={['Date', 'Amount', 'Method', 'Status', 'Contact', 'Order ID']}
                    rows={items.map(p => [
                        formatDate(p.created_at),
                        formatCurrency(p.amount),
                        (p.method || '—').toUpperCase(),
                        <StatusBadge key="s" status={p.amount_refunded > 0 ? 'refunded' : p.status} />,
                        p.contact || p.email || '—',
                        p.order_id || '—',
                    ])}
                    emptyText="No payments in this date range."
                />
            )}
        </div>
    );
}

function SettlementsTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/razorpay/admin/settlements');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setItems(json.items);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalSettled = items.reduce((s, x) => s + x.amount, 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '25px' }}>
                <StatCard label="Total Settled (recent)" value={formatCurrency(totalSettled)} color="#10b981" bg="#d1fae5" icon={Landmark} />
                <StatCard label="Settlements" value={items.length} color="#3b82f6" bg="#dbeafe" icon={Landmark} />
            </div>

            {error ? (
                <ErrorBox error={error} onRetry={fetchData} />
            ) : loading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: '#999' }}>Loading settlements...</div>
            ) : (
                <DataTable
                    columns={['Date', 'Amount', 'Fees', 'Tax', 'UTR', 'Status']}
                    rows={items.map(s => [
                        formatDate(s.created_at),
                        formatCurrency(s.amount),
                        formatCurrency(s.fees),
                        formatCurrency(s.tax),
                        s.utr || '—',
                        <StatusBadge key="s" status={s.status} />,
                    ])}
                    emptyText="No settlements found."
                />
            )}
        </div>
    );
}

function RefundsTab() {
    const [preset, setPreset] = useState('30d');
    const init = computePreset(30);
    const [dateFrom, setDateFrom] = useState(init.start);
    const [dateTo, setDateTo] = useState(init.end);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/razorpay/admin/refunds?from=${dateFrom}&to=${dateTo}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setItems(json.items);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }, [dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalRefunded = items.reduce((s, r) => s + r.amount, 0);

    return (
        <div>
            <DateRangeBar preset={preset} setPreset={setPreset} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} onRefresh={fetchData} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '25px' }}>
                <StatCard label="Total Refunded" value={formatCurrency(totalRefunded)} color="#8b5cf6" bg="#ede9fe" icon={RotateCcw} />
                <StatCard label="Refunds" value={items.length} color="#3b82f6" bg="#dbeafe" icon={RotateCcw} />
            </div>

            {error ? (
                <ErrorBox error={error} onRetry={fetchData} />
            ) : loading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: '#999' }}>Loading refunds...</div>
            ) : (
                <DataTable
                    columns={['Date', 'Amount', 'Payment ID', 'Speed', 'Status']}
                    rows={items.map(r => [
                        formatDate(r.created_at),
                        formatCurrency(r.amount),
                        r.payment_id || '—',
                        r.speed_processed || '—',
                        <StatusBadge key="s" status={r.status} />,
                    ])}
                    emptyText="No refunds in this date range."
                />
            )}
        </div>
    );
}

function ErrorBox({ error, onRetry }) {
    return (
        <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '13px' }}>
            <div style={{ marginBottom: '10px' }}>{error}</div>
            <button onClick={onRetry} style={{ background: '#1a1a1a', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Try Again</button>
        </div>
    );
}

function DataTable({ columns, rows, emptyText }) {
    return (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {columns.map(c => (
                            <th key={c} style={{ padding: '12px 15px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr><td colSpan={columns.length} style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>{emptyText}</td></tr>
                    ) : rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {row.map((cell, j) => (
                                <td key={j} style={{ padding: '12px 15px', fontSize: '13px' }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
