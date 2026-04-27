/* src/app/api/delhivery/create-order/route.js */
import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createDelhiveryShipment } from '../../../../lib/delhivery';

export async function POST(req) {
    try {
        if (!process.env.DELHIVERY_API_TOKEN) {
            return NextResponse.json(
                { success: false, error: 'DELHIVERY_API_TOKEN not set in .env.local.' },
                { status: 500 }
            );
        }

        const { orderId } = await req.json();
        if (!orderId) {
            return NextResponse.json({ success: false, error: 'orderId is required.' }, { status: 400 });
        }

        // 1. Fetch order
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) {
            return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 });
        }
        const order = orderSnap.data();

        // 2. Fetch artisan and their pickup address
        const artisanEmail = order.artisanEmail;
        if (!artisanEmail) {
            return NextResponse.json(
                { success: false, error: 'No artisan linked to this order. Cannot determine pickup address.' },
                { status: 400 }
            );
        }

        const artisanSnap = await getDoc(doc(db, 'users', artisanEmail));
        if (!artisanSnap.exists()) {
            return NextResponse.json(
                { success: false, error: `Artisan profile not found for ${artisanEmail}.` },
                { status: 400 }
            );
        }

        const artisan = artisanSnap.data();
        const addr = artisan.pickupAddress;

        if (!addr?.line1 || !addr?.city || !addr?.pincode) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Artisan "${artisan.name || artisanEmail}" has not set a complete pickup address. They need: line1, city, pincode.`
                },
                { status: 400 }
            );
        }

        // 3. Build shipment payload
        // Marketplace model: ONE master pickup location + artisan address in seller_* fields.
        // Delhivery dispatches courier to seller_add for physical pickup — no per-artisan
        // warehouse registration needed. Requires a Marketplace/Aggregator account with Delhivery.
        const masterPickup = process.env.DELHIVERY_MASTER_PICKUP || 'Primary';
        const isCOD = order.payment?.type === 'COD';
        const totalAmount = Number(
            isCOD
                ? (order.payment?.pendingAmount || order.totalAmount || 100)
                : (order.payment?.paidAmount   || order.totalAmount || 100)
        );
        const productDesc = (
            order.items?.map(i => i.name).join(', ') || order.product?.name || 'Product'
        ).substring(0, 100);

        const artisanPin  = addr.pincode.toString().replace(/[^0-9]/g, '');
        const artisanPhone = (addr.phone || artisan.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10);

        const payload = {
            // Delivery (customer) address
            name:    `${order.shipping?.firstName || 'Customer'} ${order.shipping?.lastName || ''}`.trim().substring(0, 60),
            add:     (order.shipping?.address || 'Address').substring(0, 120),
            pin:     (order.shipping?.pincode || order.shipping?.zip || '302001').toString().replace(/[^0-9]/g, '').substring(0, 6),
            city:    order.shipping?.city  || 'Jaipur',
            state:   order.shipping?.state || 'Rajasthan',
            country: 'India',
            phone:   (order.shipping?.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10),

            // Order details
            order:        orderId,
            payment:      isCOD ? 'COD' : 'Prepaid',
            cod_amount:   isCOD ? totalAmount : 0,
            total_amount: totalAmount,
            products_desc:    productDesc,
            hsn_code:         '441112',
            shipment_length:  10,
            shipment_width:   10,
            shipment_height:  10,
            weight:           0.5,
            waybill:          '',
            pieces_in_shipment: 1,

            // Artisan (seller/pickup) address — Delhivery dispatches courier here
            seller_name:    (artisan.name || artisanEmail).substring(0, 60),
            seller_add:     addr.line1.substring(0, 120),
            seller_city:    addr.city,
            seller_state:   addr.state || 'Rajasthan',
            seller_country: 'India',
            seller_pin:     artisanPin.substring(0, 6),
            seller_phone:   artisanPhone,

            // Master pickup location (your platform's single registered warehouse)
            pickup_location: { name: masterPickup }
        };

        console.log('Delhivery payload:', JSON.stringify(payload, null, 2));

        // 4. Create shipment
        const result = await createDelhiveryShipment(payload);
        console.log('Delhivery response:', JSON.stringify(result, null, 2));

        const pkg     = result.packages?.[0];
        const waybill = pkg?.waybill;

        if (!waybill || pkg?.status === 'Fail') {
            const remarks = pkg?.remarks?.join(', ') || result.rmk || 'Delhivery shipment creation failed.';
            return NextResponse.json({ success: false, error: remarks, details: result }, { status: 400 });
        }

        // 5. Update Firestore
        await updateDoc(orderRef, {
            shippingProvider: 'delhivery',
            delhiveryWaybill: waybill,
            awbCode:          waybill,
            courierName:      'Delhivery',
            status:           'shipped'
        });

        return NextResponse.json({
            success: true,
            waybill,
            artisan: artisan.name || artisanEmail,
            pickupAddress: `${addr.line1}, ${addr.city} - ${artisanPin}`
        });

    } catch (error) {
        const errData = error.response?.data;
        console.error('Delhivery create-order error:', errData || error.message);
        return NextResponse.json(
            { success: false, error: errData?.message || error.message, details: errData },
            { status: 500 }
        );
    }
}
