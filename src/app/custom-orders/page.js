"use client";
import React, { useEffect } from 'react';
import '../../styles/policy.css';

export default function CustomOrdersPolicyPage() {
    useEffect(() => {
        document.title = "Custom Orders Policy — Costerbox";
    }, []);

    return (
        <div className="policy-page">
            <h1>Custom Orders Policy</h1>
            <p>
                Custom orders are created based on customer specifications, approvals, and inputs.
            </p>
            <ul>
                <li>Production begins only after order confirmation.</li>
                <li>Once production starts, orders cannot be cancelled, returned, or refunded.</li>
                <li>Minor variations in color, embroidery, texture, or finish are inherent to handmade products and do not constitute defects.</li>
            </ul>
        </div>
    );
}
