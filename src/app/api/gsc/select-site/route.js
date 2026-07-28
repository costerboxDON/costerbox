/* src/app/api/gsc/select-site/route.js */
import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export async function POST(req) {
    try {
        const { siteUrl } = await req.json();
        const ref = doc(db, 'siteSettings', 'googleSearchConsole');
        const snap = await getDoc(ref);

        if (!snap.exists() || !(snap.data().sites || []).includes(siteUrl)) {
            return NextResponse.json({ success: false, error: 'Unknown site.' }, { status: 400 });
        }

        await updateDoc(ref, { selectedSite: siteUrl });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
