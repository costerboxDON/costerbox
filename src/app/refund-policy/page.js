"use client";
import React, { useEffect } from 'react';
import '../../styles/policy.css';

export default function RefundPolicyPage() {
    useEffect(() => {
        document.title = "Returns & Refund Policy — Costerbox";
    }, []);

    return (
        <div className="policy-page">
            <h1>Returns & Refund Policy</h1>
            <p>
                Costerbox follows a transparent yet strict return and refund policy aligned with the nature of handmade products.
            </p>

            <h2>Non-Returnable Products</h2>
            <ul>
                <li>Customized or made-to-order products.</li>
                <li>Personalized items or artisan-crafted goods.</li>
            </ul>

            <h2>Eligible Scenarios for Refund or Replacement</h2>
            <p>Refunds or replacements are considered only in the following cases:</p>
            <ul>
                <li>Product received is damaged during transit.</li>
                <li>Incorrect product delivered.</li>
            </ul>
            <p>Customers must notify us within 48 hours of delivery with supporting photos or videos.</p>

            <h2>Refund Processing</h2>
            <ul>
                <li>Approved refunds are processed to the original payment method used during purchase.</li>
                <li>Refund timelines typically range from 7–10 working days, depending on banking partners.</li>
            </ul>
        </div>
    );
}
