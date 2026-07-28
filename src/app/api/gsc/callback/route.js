/* src/app/api/gsc/callback/route.js */
import { NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { exchangeCodeForTokens, getUserEmail, listSites } from '../../../../lib/googleSearchConsole';

const REDIRECT_BASE = '/secured/superadmin/seo';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const cookieState = req.cookies.get('gsc_oauth_state')?.value;

    const fail = (reason) => NextResponse.redirect(new URL(`${REDIRECT_BASE}?error=${encodeURIComponent(reason)}`, req.url));

    if (errorParam) return fail(errorParam);
    if (!code || !state || !cookieState || state !== cookieState) return fail('invalid_state');

    try {
        const tokens = await exchangeCodeForTokens(code);
        if (!tokens.refresh_token) {
            // Happens if the user previously connected without revoking access at
            // https://myaccount.google.com/permissions — prompt=consent should normally prevent this.
            return fail('no_refresh_token');
        }

        const email = await getUserEmail(tokens.access_token);
        const sites = await listSites(tokens.access_token);

        await setDoc(doc(db, 'siteSettings', 'googleSearchConsole'), {
            refreshToken: tokens.refresh_token,
            connectedEmail: email,
            sites,
            selectedSite: sites[0] || null,
            connectedAt: new Date().toISOString(),
        });

        const res = NextResponse.redirect(new URL(`${REDIRECT_BASE}?connected=1`, req.url));
        res.cookies.delete('gsc_oauth_state');
        return res;
    } catch (error) {
        const details = error.response?.data;
        console.error('GSC OAuth callback error:', JSON.stringify(details) || error.message);
        // OAuth2 token errors are flat strings ({error, error_description});
        // Google API errors (userinfo/webmasters calls) nest a message inside {error: {message}}.
        const reason = details?.error_description
            || (typeof details?.error === 'string' ? details.error : details?.error?.message)
            || error.message
            || 'token_exchange_failed';
        return fail(reason);
    }
}
