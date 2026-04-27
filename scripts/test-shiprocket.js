const fs = require('fs');
const path = require('path');
const https = require('https');

// Simple .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                let value = match[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[match[1].trim()] = value;
            }
        });
        console.log("Environment loaded.");
    } catch (e) {
        console.error("Failed to load .env", e.message);
    }
}

loadEnv();

const EMAIL = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;

if (!EMAIL || !PASSWORD) {
    console.error("Missing Credentials in .env");
    process.exit(1);
}

console.log(`Testing Auth for: ${EMAIL}`);

function makeRequest(method, path, data, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'apiv2.shiprocket.in',
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function test() {
    try {
        // 1. Login
        console.log("\n1. Attempting Login...");
        const loginRes = await makeRequest('POST', '/v1/external/auth/login', { email: EMAIL, password: PASSWORD });

        if (loginRes.status !== 200) {
            console.error("Login FAILED:", loginRes.status, JSON.stringify(loginRes.data, null, 2));
            return;
        }

        console.log("Login SUCCESS!");
        const token = loginRes.data.token;

        // 3. Test Create Order with Channel ID (Create Endpoint)
        console.log("\n3. Testing Standard Order Creation Endpoint with Channel ID...");
        const payload = {
            // Minimal payload to trigger validation (422) instead of 403
            order_id: "TEST-CH-FINAL-123",
            order_date: "2024-01-01 12:00",
            pickup_location: "Primary",
            channel_id: 5131386, // FORCE CHANNEL ID
            billing_customer_name: "Test",
            billing_last_name: "User",
            billing_address: "Test Address",
            billing_city: "Jaipur",
            billing_pincode: "302001",
            billing_state: "Rajasthan",
            billing_country: "India",
            billing_email: "test@example.com",
            billing_phone: "9999999999",
            shipping_is_billing: true,
            order_items: [{ name: "Item", sku: "123", units: 1, selling_price: 100 }],
            payment_method: "Prepaid",
            sub_total: 100,
            length: 10, breadth: 10, height: 10, weight: 0.5
        };

        // Trying the STANDARD create endpoint (not adhoc)
        let endpoint = '/v1/external/orders/create/adhoc'; // Still trying adhoc first to see if channel helps
        console.log(`Trying Endpoint: ${endpoint} with Channel ID: 5131386`);

        let orderRes = await makeRequest('POST', endpoint, payload, token);
        console.log(`Adhoc Result: ${orderRes.status}`);

        if (orderRes.status === 403) {
            console.log("Adhoc failed 403. Trying /orders/create (Standard mapped)...");
            endpoint = '/v1/external/orders/create';
            orderRes = await makeRequest('POST', endpoint, payload, token);
            console.log(`Standard Create Result: ${orderRes.status}`);
        }

        if (orderRes.status === 403) {
            console.error("\nFATAL: Both endpoints returned 403 Forbidden.");
            console.error("This confirms the Shiprocket Account has API Order Creation disabled or restricted.");
        } else if (orderRes.status === 422) {
            console.log("\nSUCCESS! Validation error (422) means Access is GRANTED.");
            console.log(`Working Endpoint: ${endpoint}`);
        } else {
            console.log("\nResponse:", JSON.stringify(orderRes.data, null, 2));
        }

    } catch (e) {
        console.error("Script Error:", e);
    }
}

test();
