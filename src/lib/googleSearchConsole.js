/* src/lib/googleSearchConsole.js */
import axios from 'axios';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly openid email profile';

function getOAuthConfig() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth is not configured: set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI in .env.');
    }
    return { clientId, clientSecret, redirectUri };
}

export function buildAuthUrl(state) {
    const { clientId, redirectUri } = getOAuthConfig();
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
    const { clientId, clientSecret, redirectUri } = getOAuthConfig();
    const res = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
    }));
    return res.data; // { access_token, refresh_token, expires_in, ... }
}

export async function refreshAccessToken(refreshToken) {
    const { clientId, clientSecret } = getOAuthConfig();
    const res = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
    }));
    return res.data.access_token;
}

export async function getUserEmail(accessToken) {
    const res = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.data.email;
}

export async function listSites(accessToken) {
    const res = await axios.get('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const entries = res.data.siteEntry || [];
    return entries
        .filter(s => s.permissionLevel && s.permissionLevel !== 'siteUnverifiedUser')
        .map(s => s.siteUrl);
}

export async function querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions, rowLimit = 1000 }) {
    const res = await axios.post(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        { startDate, endDate, dimensions, rowLimit },
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.data.rows || [];
}
