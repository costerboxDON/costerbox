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
                Due to the handcrafted and customized nature of our products, cancellations are subject to strict conditions.
            </p>

            <h2>Cancellation Terms</h2>
            <ul>
                <li>Orders may be cancelled only until they are accepted by the assigned artisan.</li>
                <li>Once the artisan accepts the order and customization discussion or chat begins, the order is considered confirmed and cannot be cancelled.</li>
                <li>This policy protects artisan labor, time, and material investments.</li>
            </ul>
        </div>
    );
}
