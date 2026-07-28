/* src/app/api/gsc/data/route.js */
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { refreshAccessToken, querySearchAnalytics } from '../../../../lib/googleSearchConsole';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('from');
        const endDate = searchParams.get('to');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'from and to (YYYY-MM-DD) are required.' }, { status: 400 });
        }

        const snap = await getDoc(doc(db, 'siteSettings', 'googleSearchConsole'));
        if (!snap.exists() || !snap.data().refreshToken) {
            return NextResponse.json({ success: false, error: 'not_connected' }, { status: 400 });
        }
        const { refreshToken, selectedSite } = snap.data();
        if (!selectedSite) {
            return NextResponse.json({ success: false, error: 'no_site_selected' }, { status: 400 });
        }

        let accessToken;
        try {
            accessToken = await refreshAccessToken(refreshToken);
        } catch (err) {
            const reason = err.response?.data?.error;
            if (reason === 'invalid_grant') {
                return NextResponse.json({ success: false, error: 'reauth_required' }, { status: 401 });
            }
            throw err;
        }

        const [dateRows, queryRows, pageRows] = await Promise.all([
            querySearchAnalytics(accessToken, selectedSite, { startDate, endDate, dimensions: ['date'] }),
            querySearchAnalytics(accessToken, selectedSite, { startDate, endDate, dimensions: ['query'], rowLimit: 10 }),
            querySearchAnalytics(accessToken, selectedSite, { startDate, endDate, dimensions: ['page'], rowLimit: 10 }),
        ]);

        let totalClicks = 0, totalImpressions = 0, positionWeighted = 0;
        const byDate = dateRows
            .map(r => ({
                date: r.keys[0],
                clicks: r.clicks,
                impressions: r.impressions,
                ctr: r.ctr,
                position: r.position,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        byDate.forEach(r => {
            totalClicks += r.clicks;
            totalImpressions += r.impressions;
            positionWeighted += r.position * r.impressions;
        });

        const totals = {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
            position: totalImpressions > 0 ? positionWeighted / totalImpressions : 0,
        };

        const mapRow = (keyLabel) => (r) => ({
            [keyLabel]: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position,
        });

        const topQueries = queryRows.map(mapRow('query')).sort((a, b) => b.clicks - a.clicks);
        const topPages = pageRows.map(mapRow('page')).sort((a, b) => b.clicks - a.clicks);

        return NextResponse.json({ success: true, totals, byDate, topQueries, topPages });
    } catch (error) {
        console.error('GSC data fetch error:', error.response?.data || error.message);
        return NextResponse.json({ success: false, error: error.response?.data?.error?.message || error.message }, { status: 500 });
    }
}
