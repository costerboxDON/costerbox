import pincodePkg from "india-pincode-lookup";
import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');

    if (!pin || pin.length !== 6) {
        return NextResponse.json({ success: false, message: "Invalid pincode provided" }, { status: 400 });
    }

    try {
        const data = pincodePkg.lookup(pin);
        if (data && data.length > 0) {
            return NextResponse.json({ success: true, data });
        }
        return NextResponse.json({ success: false, message: "Invalid pincode" }, { status: 404 });
    } catch (err) {
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
