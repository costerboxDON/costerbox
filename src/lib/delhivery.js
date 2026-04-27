/* src/lib/delhivery.js */
import axios from 'axios';

const BASE_URL = 'https://track.delhivery.com';

function getHeaders() {
    const token = process.env.DELHIVERY_API_TOKEN;
    if (!token) throw new Error('DELHIVERY_API_TOKEN is not set in environment variables.');
    return {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
}

// Create a shipment (Marketplace model)
// payload.seller_* = artisan's pickup address (courier dispatched here)
// payload.pickup_location.name = your ONE master registered warehouse
export async function createDelhiveryShipment(payload) {
    const res = await axios.post(
        `${BASE_URL}/api/cmu/create.json`,
        {
            format: 'json',
            data: JSON.stringify({ shipments: [payload] })
        },
        { headers: getHeaders() }
    );
    return res.data;
}

// Register or update your master pickup location (run ONCE during initial setup)
// Under the Marketplace model you only ever need one of these for your whole platform
export async function registerPickupLocation(warehouseData) {
    const headers = getHeaders();
    try {
        const res = await axios.post(
            `${BASE_URL}/api/backend/clientwarehouse/create/`,
            warehouseData,
            { headers }
        );
        return res.data;
    } catch (createErr) {
        const errStr = JSON.stringify(createErr.response?.data || createErr.message).toLowerCase();
        if (errStr.includes('already') || errStr.includes('exist') || errStr.includes('unique')) {
            // Already exists — try to update address
            try {
                const res = await axios.put(
                    `${BASE_URL}/api/backend/clientwarehouse/update/`,
                    warehouseData,
                    { headers }
                );
                return res.data;
            } catch {
                return { existing: true };
            }
        }
        throw createErr;
    }
}

// List all registered pickup locations
export async function getPickupLocations() {
    try {
        const res = await axios.get(
            `${BASE_URL}/api/backend/clientwarehouse/get/`,
            { headers: getHeaders() }
        );
        return res.data?.results || (Array.isArray(res.data) ? res.data : []);
    } catch (error) {
        console.error('Delhivery getPickupLocations error:', error.response?.data || error.message);
        return [];
    }
}

// Track a shipment by waybill
export async function trackShipment(waybill) {
    const res = await axios.get(
        `${BASE_URL}/api/v1/packages/json/`,
        { params: { waybill }, headers: getHeaders() }
    );
    return res.data;
}
