/* src/app/api/razorpay/admin/payments/route.js */
import { NextResponse } from 'next/server';
import { listPayments } from '../../../../../lib/razorpayAdmin';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const skip = Number(searchParams.get('skip') || 0);

        const { items, count } = await listPayments({
            from: from ? Math.floor(new Date(from + 'T00:00:00').getTime() / 1000) : undefined,
            to: to ? Math.floor(new Date(to + 'T23:59:59').getTime() / 1000) : undefined,
            skip,
        });

        return NextResponse.json({ success: true, items, count });
    } catch (error) {
        const msg = error.response?.data?.error?.description || error.message;
        return NextResponse.json({ success: false, error: msg }, { status: error.response?.status || 500 });
    }
}
