/* src/app/api/gsc/disconnect/route.js */
import { NextResponse } from 'next/server';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export async function POST() {
    try {
        await deleteDoc(doc(db, 'siteSettings', 'googleSearchConsole'));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
