"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, MousePointerClick, Eye, Percent, Target, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';

// GSC typically has a 2-3 day reporting lag — the latest available date is never "today".
const LAG_DAYS = 3;
const toDateStr = (d) => d.toISOString().slice(0, 10);
const latestAvailableDate = () => { const d = new Date(); d.setDate(d.getDate() - LAG_DAYS); return d; };

const RANGE_PRESETS = [
    { key: '7d', label: 'Last 7 Days', days: 7 },
    { key: '28d', label: 'Last 28 Days', days: 28 },
    { key: '3m', label: 'Last 3 Months', days: 90 },
    { key: '6m', label: 'Last 6 Months', days: 180 },
    { key: '12m', label: 'Last 12 Months', days: 365 },
];

const computePreset = (days) => {
    const end = latestAvailableDate();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return { start: toDateStr(start), end: toDateStr(end) };
};

export default function SeoAdminPage() {
    const [statusLoading, setStatusLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [connectedEmail, setConnectedEmail] = useState('');
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [notice, setNotice] = useState(null);

    const [preset, setPreset] = useState('28d');
    const initialRange = computePreset(28);
    const [dateFrom, setDateFrom] = useState(initialRange.start);
    const [dateTo, setDateTo] = useState(initialRange.end);

    const [data, setData] = useState(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [dataError, setDataError] = useState(null);

    const fetchStatus = useCallback(async () => {
        setStatusLoading(true);
        try {
            const res = await fetch('/api/gsc/status');
            const json = await res.json();
            if (json.connected) {
                setConnected(true);
                setConnectedEmail(json.connectedEmail);
                setSites(json.sites);
                setSelectedSite(json.selectedSite);
            } else {
                setConnected(false);
            }
        } catch (err) {
            console.error(err);
        }
        setStatusLoading(false);
    }, []);

    useEffect(() => {
        // Surface redirect result from the OAuth callback, then clean the URL.
        const params = new URLSearchParams(window.location.search);
        if (params.get('connected')) setNotice({ type: 'success', text: 'Google Search Console connected successfully.' });
        else if (params.get('error')) setNotice({ type: 'error', text: `Connection failed: ${params.get('error')}` });
        if (params.toString()) window.history.replaceState({}, '', window.location.pathname);

        fetchStatus();
    }, [fetchStatus]);

    const fetchData = useCallback(async () => {
        if (!connected || !selectedSite) return;
        setDataLoading(true);
        setDataError(null);
        try {
            const res = await fetch(`/api/gsc/data?from=${dateFrom}&to=${dateTo}`);
            const json = await res.json();
            if (!json.success) {
                setDataError(json.error);
                setData(null);
            } else {
                setData(json);
            }
        } catch (err) {
            setDataError(err.message);
        }
        setDataLoading(false);
    }, [connected, selectedSite, dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleConnect = async () => {
        try {
            const res = await fetch('/api/gsc/auth-url');
            const json = await res.json();
            if (json.success) window.location.href = json.url;
            else alert(json.error || 'Failed to start connection.');
        } catch (err) {
            alert('Failed to start connection.');
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect Google Search Console? You can reconnect any time.')) return;
        await fetch('/api/gsc/disconnect', { method: 'POST' });
        setConnected(false);
        setData(null);
    };

    const handleSiteChange = async (siteUrl) => {
        setSelectedSite(siteUrl);
        await fetch('/api/gsc/select-site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl }),
        });
    };

    const applyPreset = (key) => {
        setPreset(key);
        const p = RANGE_PRESETS.find(r => r.key === key);
        if (!p) return;
        const { start, end } = computePreset(p.days);
        setDateFrom(start);
        setDateTo(end);
    };

    const formatPct = (v) => `${(v * 100).toFixed(1)}%`;
    const formatNum = (v) => new Intl.NumberFormat('en-IN').format(Math.round(v));

    const maxDate = toDateStr(latestAvailableDate());

    if (statusLoading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading SEO settings...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>SEO — Search Performance</h1>
                    <span style={{ fontSize: '13px', color: '#888' }}>Live data from Google Search Console</span>
                </div>

                {connected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <select
                            value={preset}
                            onChange={e => applyPreset(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff', cursor: 'pointer' }}
                        >
                            {RANGE_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 10px' }}>
                            <input type="date" value={dateFrom} max={dateTo} onChange={e => { setPreset('custom'); setDateFrom(e.target.value); }} style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#374151' }} />
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>to</span>
                            <input type="date" value={dateTo} min={dateFrom} max={maxDate} onChange={e => { setPreset('custom'); setDateTo(e.target.value); }} style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#374151' }} />
                        </div>
                        <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                )}
            </div>

            {notice && (
                <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2', color: notice.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${notice.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                    {notice.text}
                </div>
            )}

            {!connected ? (
                <div style={{ background: '#fff', padding: '50px', borderRadius: '12px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <Search size={40} color="#9ca3af" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Connect Google Search Console</h3>
                    <p style={{ color: '#666', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px' }}>
                        Sign in with the Google account that has access to Costerbox's Search Console property to see real clicks, impressions, CTR, and ranking data.
                    </p>
                    <button
                        onClick={handleConnect}
                        style={{ background: '#1a1a1a', color: '#fff', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                    >
                        Connect Google Search Console
                    </button>
                </div>
            ) : (
                <>
                    {/* CONNECTION BAR */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '14px 20px', borderRadius: '10px', border: '1px solid #f3f4f6', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ fontSize: '13px', color: '#555' }}>
                            Connected as <strong>{connectedEmail}</strong>
                            {sites.length > 1 ? (
                                <>
                                    {' '}— property{' '}
                                    <select value={selectedSite || ''} onChange={e => handleSiteChange(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                                        {sites.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </>
                            ) : (
                                <> — <strong>{selectedSite}</strong></>
                            )}
                        </div>
                        <button onClick={handleDisconnect} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                            <LogOut size={14} /> Disconnect
                        </button>
                    </div>

                    {dataError === 'reauth_required' ? (
                        <ErrorState
                            title="Reconnect required"
                            text="Google access has expired or was revoked. Reconnect to keep pulling live data."
                            action={<button onClick={handleConnect} style={primaryBtnStyle}>Reconnect</button>}
                        />
                    ) : dataError ? (
                        <ErrorState title="Couldn't load data" text={dataError} action={<button onClick={fetchData} style={primaryBtnStyle}>Try Again</button>} />
                    ) : dataLoading || !data ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>Loading Search Console data...</div>
                    ) : (
                        <SeoDashboard data={data} formatPct={formatPct} formatNum={formatNum} />
                    )}
                </>
            )}
        </div>
    );
}

function ErrorState({ title, text, action }) {
    return (
        <div style={{ background: '#fff', padding: '50px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
            <AlertTriangle size={36} color="#dc2626" style={{ marginBottom: '14px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{title}</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>{text}</p>
            {action}
        </div>
    );
}

const primaryBtnStyle = { background: '#1a1a1a', color: '#fff', padding: '10px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' };

function SeoDashboard({ data, formatPct, formatNum }) {
    const { totals, byDate, topQueries, topPages } = data;

    const statCards = [
        { label: 'Clicks', value: formatNum(totals.clicks), color: '#2563eb', bg: '#dbeafe', icon: MousePointerClick },
        { label: 'Impressions', value: formatNum(totals.impressions), color: '#f59e0b', bg: '#fef3c7', icon: Eye },
        { label: 'Average CTR', value: formatPct(totals.ctr), color: '#10b981', bg: '#d1fae5', icon: Percent },
        { label: 'Average Position', value: totals.position ? totals.position.toFixed(1) : '—', color: '#8b5cf6', bg: '#ede9fe', icon: Target },
    ];

    return (
        <>
            {/* STATS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {statCards.map((s, i) => (
                    <div key={i} style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f3f4f6' }}>
                        <div>
                            <h3 style={{ fontSize: '22px', margin: '0 0 5px 0', fontWeight: 'bold' }}>{s.value}</h3>
                            <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>{s.label}</span>
                        </div>
                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <s.icon size={22} />
                        </div>
                    </div>
                ))}
            </div>

            {/* TREND CHARTS — small multiples, one hue each (different scales, so never shared on one axis) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <TrendCard title="Clicks over time" points={byDate.map(d => ({ x: d.date, y: d.clicks }))} color="#2563eb" />
                <TrendCard title="Impressions over time" points={byDate.map(d => ({ x: d.date, y: d.impressions }))} color="#f59e0b" />
            </div>

            {/* TABLES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <RankTable title="Top Queries" rows={topQueries} keyField="query" formatPct={formatPct} formatNum={formatNum} />
                <RankTable title="Top Pages" rows={topPages} keyField="page" formatPct={formatPct} formatNum={formatNum} />
            </div>
        </>
    );
}

function RankTable({ title, rows, keyField, formatPct, formatNum }) {
    return (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{title}</h3>
            {rows.length === 0 ? (
                <p style={{ color: '#999', margin: 0 }}>No data for this range.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ textAlign: 'left', padding: '8px 6px', color: '#94a3b8', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>{keyField === 'query' ? 'Query' : 'Page'}</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: '#94a3b8', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Clicks</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: '#94a3b8', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Impr.</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: '#94a3b8', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>CTR</th>
                            <th style={{ textAlign: 'right', padding: '8px 6px', color: '#94a3b8', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Pos.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                <td style={{ padding: '8px 6px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r[keyField]}>{r[keyField]}</td>
                                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600' }}>{formatNum(r.clicks)}</td>
                                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6b7280' }}>{formatNum(r.impressions)}</td>
                                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6b7280' }}>{formatPct(r.ctr)}</td>
                                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6b7280' }}>{r.position.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// Lightweight single-series line chart with hover crosshair + tooltip. No external chart library.
function TrendCard({ title, points, color }) {
    const [hoverIdx, setHoverIdx] = useState(null);
    const width = 480, height = 160, padding = 24;

    const { path, areaPath, coords, maxY } = useMemo(() => {
        if (points.length === 0) return { path: '', areaPath: '', coords: [], maxY: 1 };
        const maxY = Math.max(1, ...points.map(p => p.y));
        const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
        const coords = points.map((p, i) => ({
            x: padding + i * stepX,
            y: height - padding - (p.y / maxY) * (height - padding * 2),
            ...p,
        }));
        const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
        const areaPath = coords.length > 0
            ? `${path} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
            : '';
        return { path, areaPath, coords, maxY };
    }, [points]);

    const handleMove = (e) => {
        if (coords.length === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = ((e.clientX - rect.left) / rect.width) * width;
        let closest = 0, closestDist = Infinity;
        coords.forEach((c, i) => {
            const dist = Math.abs(c.x - relX);
            if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        setHoverIdx(closest);
    };

    const active = hoverIdx !== null ? coords[hoverIdx] : null;

    return (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>{title}</h3>
            {points.length === 0 ? (
                <p style={{ color: '#999', margin: 0 }}>No data for this range.</p>
            ) : (
                <div style={{ position: 'relative' }}>
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
                        onMouseMove={handleMove}
                        onMouseLeave={() => setHoverIdx(null)}
                    >
                        <defs>
                            <linearGradient id={`grad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                                <stop offset="100%" stopColor={color} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* baseline */}
                        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="1" />
                        <path d={areaPath} fill={`url(#grad-${title.replace(/\s/g, '')})`} stroke="none" />
                        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {active && (
                            <>
                                <line x1={active.x} y1={padding} x2={active.x} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
                                <circle cx={active.x} cy={active.y} r="4" fill={color} stroke="#fff" strokeWidth="2" />
                            </>
                        )}
                    </svg>
                    {active && (
                        <div style={{
                            position: 'absolute',
                            top: 4,
                            left: `${Math.min(75, Math.max(0, (active.x / width) * 100))}%`,
                            background: '#1e293b',
                            color: '#fff',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                        }}>
                            <div style={{ fontWeight: '700' }}>{new Intl.NumberFormat('en-IN').format(active.y)}</div>
                            <div style={{ opacity: 0.75 }}>{active.x}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
