"use client";
import React, { useEffect } from 'react';
import '../../styles/policy.css';

export default function InternationalOrdersPolicyPage() {
    useEffect(() => {
        document.title = "International Orders Policy — Costerbox";
    }, []);

    return (
        <div className="policy-page">
            <h1>International Orders Policy</h1>
            <p>
                All international orders are considered final once confirmed.
            </p>
            <ul>
                <li>Cancellations or returns are not permitted for international shipments unless the product is damaged or incorrect.</li>
                <li>Customers are responsible for customs duties, import taxes, and clearance charges.</li>
                <li>Costerbox is not liable for delays caused by customs authorities or international courier services.</li>
            </ul>

            <hr />

            <h2>International Shipping Timelines</h2>
            <ul>
                <li>International delivery timelines vary based on destination country, customs processing, and courier services.</li>
                <li>Estimated delivery timelines are communicated after order confirmation.</li>
                <li>Customs duties, import taxes, or additional charges are the responsibility of the customer.</li>
            </ul>
        </div>
    );
}
