/* src/app/api/razorpay/refund/route.js */
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { paymentId, amount, reason } = body;

        if (!paymentId || paymentId === 'COD') {
            return NextResponse.json({ error: 'Valid Razorpay paymentId is required. Online refund cannot be processed for COD or missing payment IDs.' }, { status: 400 });
        }

        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json({ error: 'Razorpay API credentials (KEY_ID / KEY_SECRET) are missing on the server.' }, { status: 500 });
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const refundPayload = {
            speed: 'normal', // refund to source account (3-5 days)
            notes: {
                reason: reason || 'Admin initiated refund',
            },
        };

        // If amount provided → partial refund; else → full refund
        if (amount && Number(amount) > 0) {
            refundPayload.amount = Math.round(Number(amount) * 100); // ₹ → paise
        }

        const refund = await razorpay.payments.refund(paymentId, refundPayload);

        return NextResponse.json({
            success: true,
            refundId: refund.id,
            amount: refund.amount / 100, // paise → ₹
            status: refund.status,
            speedProcessed: refund.speed_processed,
        });

    } catch (error) {
        console.error('Razorpay refund error:', error);
        const message = error?.error?.description || error?.description || error?.message || 'Refund failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
