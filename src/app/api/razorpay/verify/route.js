/* src/app/api/razorpay/verify/route.js */
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // HMAC-SHA256 signature verification
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        const isValid = expectedSignature === razorpay_signature;

        if (!isValid) {
            console.error('Razorpay signature mismatch — possible tampered payment');
            return NextResponse.json({ success: false, error: 'Payment verification failed. Signature mismatch.' }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Verify route error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
