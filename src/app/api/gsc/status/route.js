/* src/app/api/gsc/status/route.js */
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export async function GET() {
    try {
        const snap = await getDoc(doc(db, 'siteSettings', 'googleSearchConsole'));
        if (!snap.exists() || !snap.data().refreshToken) {
            return NextResponse.json({ success: true, connected: false });
        }
        const { connectedEmail, sites, selectedSite } = snap.data();
        return NextResponse.json({ success: true, connected: true, connectedEmail, sites: sites || [], selectedSite: selectedSite || null });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
