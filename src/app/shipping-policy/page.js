"use client";
import React, { useEffect } from 'react';
import '../../styles/policy.css';

export default function ShippingPolicyPage() {
    useEffect(() => {
        document.title = "Shipping Policy — Costerbox";
    }, []);

    return (
        <div className="policy-page">
            <h1>Shipping Policy</h1>
            <p>
                Costerbox operates as a handcrafted and made-to-order brand. Each product is individually created by artisans, which requires sufficient production time before dispatch.
            </p>

            <h2>Shipping Partner</h2>
            <p>
                We ship all orders using Shiprocket and its authorized courier partners to ensure reliable delivery.
            </p>

            <h2>Order Processing & Dispatch – India</h2>
            <ul>
                <li>All products are made after an order is placed.</li>
                <li>Standard production time is 10–12 working days.</li>
                <li>Orders are dispatched only after completion of the making process.</li>
                <li>Delivery timelines depend on courier service availability and customer location.</li>
            </ul>

            <h2>Delays & Exceptions</h2>
            <p>
                Costerbox is not responsible for delays caused by courier service issues, customs clearance, natural calamities, public holidays, festivals, or circumstances beyond our control.
            </p>
        </div>
    );
}
