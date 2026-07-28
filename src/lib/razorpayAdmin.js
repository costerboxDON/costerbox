/* src/lib/razorpayAdmin.js */
import axios from 'axios';

const BASE_URL = 'https://api.razorpay.com/v1';

function getAuthHeader() {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials missing: set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.');
    }
    const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    return { Authorization: `Basic ${token}` };
}

async function get(path, params) {
    const res = await axios.get(`${BASE_URL}${path}`, { headers: getAuthHeader(), params });
    return res.data;
}

// from/to are unix timestamps (seconds). count max 100 per Razorpay's API limit.
export async function listPayments({ from, to, count = 100, skip = 0 } = {}) {
    const data = await get('/payments', { from, to, count, skip });
    return { items: data.items || [], count: data.count || 0 };
}

export async function listSettlements({ count = 100, skip = 0 } = {}) {
    const data = await get('/settlements', { count, skip });
    return { items: data.items || [], count: data.count || 0 };
}

export async function listRefunds({ from, to, count = 100, skip = 0 } = {}) {
    const data = await get('/refunds', { from, to, count, skip });
    return { items: data.items || [], count: data.count || 0 };
}
