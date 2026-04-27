/* src/app/api/shiprocket/create-order/route.js */
import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createShiprocketOrder, addPickupLocation, getPickupLocations, assignAWB } from '../../../../lib/shiprocket';

export async function POST(req) {
    try {
        console.log("Checking Shiprocket Credentials in Env...");
        console.log("SHIPROCKET_EMAIL present:", !!process.env.SHIPROCKET_EMAIL);
        console.log("SHIPROCKET_PASSWORD present:", !!process.env.SHIPROCKET_PASSWORD);

        // Validate Credentials Presence on every request
        if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
            console.error("FATAL: Shiprocket Credentials Missing in Environment Variables.");
            return NextResponse.json({ success: false, error: "Server Configuration Error: Shiprocket Credentials Missing." }, { status: 500 });
        }

        const body = await req.json();
        const { orderId } = body;
        console.log("CreateOrder API called with ID:", orderId);

        // 1. Fetch Order Details
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
        }

        const order = orderSnap.data();
        console.log("Order Data Found:", JSON.stringify(order, null, 2));
        let pickup_location_id = 'Primary';

        // 2. If Custom Order, Ensure Artisan Pickup Location Exists
        if (order.isCustomOrder && order.artisanId) {
            const artisanEmail = order.artisanEmail;
            if (!artisanEmail) throw new Error("Artisan email missing in order.");

            const artisanRef = doc(db, "users", artisanEmail);
            const artisanSnap = await getDoc(artisanRef);

            if (!artisanSnap.exists()) throw new Error("Artisan profile not found.");

            const artisan = artisanSnap.data();
            const address = artisan.pickupAddress;

            if (!address || !address.line1 || !address.city) {
                return NextResponse.json({
                    success: false,
                    message: `Artisan ${artisan.name} has not set a COMPLETE pickup address.`
                }, { status: 400 });
            }

            // Create unique pickup code for artisan
            // Shiprocket Pickup Location Code must be less than 50 chars.
            // Use sanitized email or ID.
            const pickupCode = `artisan_${artisanEmail.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;

            try {
                await addPickupLocation({
                    pickup_location: pickupCode,
                    name: (artisan.name || "Artisan").substring(0, 50),
                    email: artisan.email,
                    phone: (address.phone || "9999999999").replace(/[^0-9]/g, '').slice(-10),
                    address: (address.line1 || "Address").substring(0, 80),
                    city: address.city,
                    state: address.state || "Rajasthan",
                    country: 'India',
                    pin_code: (address.pincode || "302001").toString().substring(0, 6)
                });
            } catch (e) {
                const apiError = e.response?.data;
                const errorStr = JSON.stringify(apiError || e.message);
                
                // If it already exists, Shiprocket usually returns a validation error on 'pickup_location'
                // We can ignore it.
                if (errorStr.toLowerCase().includes("exists") || errorStr.toLowerCase().includes("already") || errorStr.toLowerCase().includes("taken")) {
                    console.log(`Pickup location ${pickupCode} already exists or handled by Shiprocket. continuing...`);
                } else {
                    console.error("Pickup location add FATAL error:", errorStr);
                    // It's safer to attempt to proceed anyway because the location MIGHT exist,
                    // but if it doesn't, createShiprocketOrder will now safely fail and return 400.
                }
            }
            pickup_location_id = pickupCode;
        } else {
            // For standard orders, ensure we have a valid pickup location
            try {
                const locations = await getPickupLocations();
                if (locations && locations.length > 0) {
                    const hasPrimary = locations.some(l => l.pickup_location === 'Primary');
                    if (!hasPrimary) {
                        pickup_location_id = locations[0].pickup_location;
                        console.log(`'Primary' location not found. Defaulting to: ${pickup_location_id}`);
                    }
                } else {
                    console.log("No pickup locations found in Shiprocket account. Attempting 'Primary'...");
                }
            } catch (e) {
                // If it's a configuration error, don't swallow it. Stop here.
                if (e.message.includes("Credentials") || e.message.includes("Invalid Email") || e.message.includes("Login Failed")) {
                    return NextResponse.json({ success: false, error: e.message }, { status: 401 });
                }
                console.warn("Failed to fetch pickup locations, defaulting to 'Primary':", e.message);
            }
        }

        // 3. Create Order Payload
        // Shiprocket requires specific fields.
        console.log(`Creating Shiprocket Order for ${orderId} with Pickup Location: ${pickup_location_id}`);

        const isCOD = order.payment?.type === "COD";

        const payload = {
            order_id: orderId,
            order_date: new Date().toISOString().split('T')[0] + " 12:00", // Format YYYY-MM-DD HH:MM
            pickup_location: pickup_location_id,
            billing_customer_name: (order.shipping?.firstName || "Guest").substring(0, 50),
            billing_last_name: (order.shipping?.lastName || "").substring(0, 50),
            billing_address: (order.shipping?.address || "No Address").substring(0, 50),
            billing_city: (order.shipping?.city || "Jaipur"),
            billing_pincode: parseInt((order.shipping?.pincode || order.shipping?.zip || "302001").replace(/[^0-9]/g, '')),
            billing_state: (order.shipping?.state || "Rajasthan"),
            billing_country: "India",
            billing_email: order.shipping?.email || "customer@example.com",
            billing_phone: (order.shipping?.phone || "9999999999").replace(/[^0-9]/g, '').slice(-10),
            shipping_is_billing: true,
            order_items: order.items?.length > 0 ? order.items.map(item => ({
                name: (item.name || "Product").substring(0, 50),
                sku: (item.sku || item.id || "SKU123").substring(0, 20),
                units: item.quantity || 1,
                selling_price: Number(item.paidPrice || item.price || 100),
                discount: 0,
                tax: 0,
                hsn: 441112
            })) : [
                {
                    name: (order.product?.name || "Product").substring(0, 50),
                    sku: (order.product?.id || "SKU123").substring(0, 20),
                    units: 1,
                    selling_price: Number(order.payment?.paidAmount || order.totalAmount || 100),
                    discount: 0,
                    tax: 0,
                    hsn: 441112 // Dummy HSN
                }
            ],
            payment_method: isCOD ? "COD" : "Prepaid",
            sub_total: Number(isCOD ? order.payment?.pendingAmount || order.totalAmount : order.payment?.paidAmount || order.totalAmount || 100),
            length: 10, breadth: 10, height: 10, weight: 0.5
        };

        console.log("Final Payload:", JSON.stringify(payload, null, 2));

        const shipResponse = await createShiprocketOrder(payload);

        // EXTRACTION: shipment_id can be in various places depending on response type
        let shipmentId = shipResponse.shipment_id || shipResponse.payload?.shipment_id || shipResponse.order_id;
        console.log("Order Created. Shipment ID:", shipmentId);

        // Shiprocket might return 200 OK but with status_code = 0 or 400 inside the body on logical errors
        if (!shipmentId || shipResponse.status_code === 0 || shipResponse.status_code === 400) {
            console.error("Shiprocket API failed quietly. Response:", JSON.stringify(shipResponse));
            return NextResponse.json({
                success: false,
                error: shipResponse.message || shipResponse.error || "Failed to create shipment at Shiprocket. Check pickup location or payload.",
                details: shipResponse
            }, { status: 400 });
        }

        // 5. Generate AWB (Assign Courier) - NEW STEP
        let awbData = null;
        try {
            // Ensure shipmentId is valid before calling AWB API
            if (shipmentId) {
                console.log("Attempting to Assign AWB for Shipment:", shipmentId);
                const awbRes = await assignAWB(shipmentId);
                console.log("AWB Result:", JSON.stringify(awbRes, null, 2));

                if (awbRes.awb_assign_status === 1) {
                    awbData = awbRes.response.data;
                }
            }
        } catch (awbError) {
            console.error("AWB Assignment Failed (Order was created though):", awbError.message);
        }

        // 4. Update Order in Firestore
        await updateDoc(orderRef, {
            shipmentId: shipmentId || null,
            awbCode: awbData?.awb_code || null,
            courierName: awbData?.courier_name || null,
            status: 'shipped',
            shiprocketOrderId: shipResponse.order_id || null
        });

        return NextResponse.json({ success: true, data: { ...shipResponse, awb: awbData } });

    } catch (error) {
        console.error("Shipping API Error:", error);

        if (error.response) {
            const status = error.response.status;
            let message = error.response.data?.message || "Shiprocket API Error";

            // Shiprocket validation errors (422) often have details
            if (error.response.data?.errors) {
                message += ": " + JSON.stringify(error.response.data.errors);
            }

            console.error("Shiprocket Detailed Error:", JSON.stringify(error.response.data, null, 2));

            return NextResponse.json({
                success: false,
                error: message,
                details: error.response.data
            }, { status });
        }

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
