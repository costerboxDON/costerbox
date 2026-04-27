/* src/app/api/delhivery/pickups/route.js */
import { NextResponse } from 'next/server';
import { getPickupLocations, registerPickupLocation } from '../../../../lib/delhivery';

// GET /api/delhivery/pickups — list all registered pickup locations
export async function GET() {
    try {
        if (!process.env.DELHIVERY_API_TOKEN) {
            return NextResponse.json(
                { success: false, error: 'DELHIVERY_API_TOKEN not configured.' },
                { status: 500 }
            );
        }
        const locations = await getPickupLocations();
        return NextResponse.json({ success: true, locations });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/delhivery/pickups — register a new custom pickup location
export async function POST(req) {
    try {
        if (!process.env.DELHIVERY_API_TOKEN) {
            return NextResponse.json(
                { success: false, error: 'DELHIVERY_API_TOKEN not configured.' },
                { status: 500 }
            );
        }
        const body = await req.json();
        const { name, email, phone, address, city, state, pin } = body;

        if (!name || !address || !city || !pin) {
            return NextResponse.json(
                { success: false, error: 'name, address, city, and pin are required.' },
                { status: 400 }
            );
        }

        const pinNum = parseInt(pin.toString().replace(/[^0-9]/g, ''));
        const result = await registerPickupLocation({
            name,
            email: email || '',
            phone: (phone || '9999999999').replace(/[^0-9]/g, '').slice(-10),
            address,
            city,
            state: state || 'Rajasthan',
            country: 'India',
            pin: pinNum,
            return_address: address,
            return_city: city,
            return_state: state || 'Rajasthan',
            return_country: 'India',
            return_pin: pinNum
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        const errData = error.response?.data;
        return NextResponse.json(
            { success: false, error: errData?.message || error.message, details: errData },
            { status: 500 }
        );
    }
}
