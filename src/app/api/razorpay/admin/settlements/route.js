/* src/app/api/razorpay/admin/settlements/route.js */
import { NextResponse } from 'next/server';
import { listSettlements } from '../../../../../lib/razorpayAdmin';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const skip = Number(searchParams.get('skip') || 0);

        const { items, count } = await listSettlements({ skip });
        return NextResponse.json({ success: true, items, count });
    } catch (error) {
        const msg = error.response?.data?.error?.description || error.message;
        return NextResponse.json({ success: false, error: msg }, { status: error.response?.status || 500 });
    }
}
