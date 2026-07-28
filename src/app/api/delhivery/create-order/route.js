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

        // 2. Build shipment payload — single registered warehouse picks up every order
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

            // Single registered warehouse — picks up every order
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
            pickupLocation: masterPickup
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
