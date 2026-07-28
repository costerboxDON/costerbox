"use client";
import React, { useEffect } from 'react';
import '../../styles/policy.css';

export default function CancellationPolicyPage() {
    useEffect(() => {
        document.title = "Cancellation Policy — Costerbox";
    }, []);

    return (
        <div className="policy-page">
            <h1>Cancellation Policy</h1>
            <p>
                Due to the handcrafted nature of our products, cancellations are subject to strict conditions.
            </p>

            <h2>Cancellation Terms</h2>
            <ul>
                <li>Orders may be cancelled only before they are shipped.</li>
                <li>Once an order has been shipped, it is considered confirmed and cannot be cancelled.</li>
                <li>This policy protects our production and material investments.</li>
            </ul>
        </div>
    );
}
