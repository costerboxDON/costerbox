/* src/app/api/gsc/auth-url/route.js */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildAuthUrl } from '../../../../lib/googleSearchConsole';

export async function GET() {
    try {
        const state = crypto.randomBytes(16).toString('hex');
        const url = buildAuthUrl(state);

        const res = NextResponse.json({ success: true, url });
        res.cookies.set('gsc_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600,
            path: '/',
        });
        return res;
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
