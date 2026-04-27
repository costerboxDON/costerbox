/* src/lib/shiprocket.js */
import axios from 'axios';

let tokenObj = { token: null, expiresAt: null };

// 1. Authenticate and get Token
export async function getShiprocketToken(forceRefresh = false) {
    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
        throw new Error("Shiprocket Credentials Missing: SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD is not set in .env.");
    }

    const now = new Date().getTime();
    if (tokenObj.token && tokenObj.expiresAt && now < tokenObj.expiresAt && !forceRefresh) {
        return tokenObj.token;
    }

    try {
        console.log(`Authenticating Shiprocket with User: ${email}`);
        const res = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: email,
            password: password
        });
        tokenObj.token = res.data.token;
        // Set expiry to 9 days from now (9 * 24 * 60 * 60 * 1000 ms)
        tokenObj.expiresAt = now + 777600000;
        return tokenObj.token;
    } catch (error) {
        const msg = error.response?.data?.message || "Unknown Auth Error";
        console.error("Shiprocket Login Failed:", msg);
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error("Shiprocket Login Failed: Invalid Email or Password (401/403).");
        }
        throw new Error(`Shiprocket Auth Error: ${msg}`);
    }
}

// Helper to retry on auth error
async function withRetry(fn) {
    try {
        return await fn();
    } catch (error) {
        // Only retry if it's a 401 (Unauthorized) from a non-login endpoint
        const status = error.response?.status;
        if (status === 401 || status === 403) {
            console.log("Shiprocket API returned 401/403. Refreshing token and retrying...");
            try {
                await getShiprocketToken(true); // Force refresh
                return await fn(); // Retry action
            } catch (retryError) {
                console.error("Retry failed:", retryError.message);
                throw new Error(retryError.message); // Throw the login error
            }
        }

        // Return original error for other codes (like 422, 500)
        throw error;
    }
}

// 2. Create Order
export async function createShiprocketOrder(orderData) {
    return withRetry(async () => {
        const authToken = await getShiprocketToken();
        // Use standard 'create/adhoc' endpoint. Previous 403s were due to credentials/pickup location.
        // NOTE: If this fails with 403, permissions on Shiprocket account need to be checked.
        const res = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', orderData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        return res.data;
    });
}

// 3. Add Pickup Location (For Artisan)
export async function addPickupLocation(locationData) {
    return withRetry(async () => {
        const authToken = await getShiprocketToken();
        const res = await axios.post('https://apiv2.shiprocket.in/v1/external/settings/company/add-pickup', locationData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        return res.data;
    });
}

// 4. Get Pickup Locations
export async function getPickupLocations() {
    try {
        return await withRetry(async () => {
            const authToken = await getShiprocketToken();
            const res = await axios.get('https://apiv2.shiprocket.in/v1/external/settings/company/pickup', {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            return res.data.data.shipping_address;
        });
    } catch (error) {
        console.error("Shiprocket Get Pickup Locations Error:", error.response?.data || error.message);
        // Don't swallow auth errors, rethrow them so we know if config is bad
        if (error.message.includes("Invalid Email") || error.message.includes("Credentials Missing")) {
            throw error;
        }
        return [];
    }
}

// 5. Assign AWB (Courier)
export async function assignAWB(shipmentId) {
    return withRetry(async () => {
        const authToken = await getShiprocketToken();
        const res = await axios.post('https://apiv2.shiprocket.in/v1/external/courier/assign/awb',
            { shipment_id: shipmentId },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        return res.data;
    });
}
