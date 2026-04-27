"use client";
import React, { useEffect } from 'react';
import '../../styles/policy.css';

export default function TermsConditionsPage() {
    useEffect(() => {
        document.title = "Terms & Conditions — Costerbox";
    }, []);

    return (
        <div className="policy-page">
            <h1>Terms & Conditions</h1>
            <p>
                By accessing or using the Costerbox website, you agree to comply with the following terms and conditions.
            </p>

            <h2>General Terms</h2>
            <ul>
                <li>All products are handcrafted; slight variations are natural and expected.</li>
                <li>Product images are for reference purposes only and may differ slightly from the actual product.</li>
                <li>Prices, availability, and product specifications are subject to change without prior notice.</li>
            </ul>

            <h2>Customer Responsibilities</h2>
            <ul>
                <li>Customers must provide accurate and complete shipping and contact details.</li>
                <li>Costerbox is not responsible for delivery failures due to incorrect information provided by the customer.</li>
            </ul>

            <h2>Limitation of Liability</h2>
            <p>
                Costerbox shall not be liable for indirect, incidental, or consequential damages arising from the use of our products or services.
            </p>

            <h2>Governing Law</h2>
            <p>
                All disputes and policies are governed by and interpreted in accordance with the laws of India.
            </p>

            <hr />
            <p style={{ marginTop: '40px' }}>
                For any questions, clarifications, or support, please contact us at: <strong><a href="mailto:info@costerbox.in">info@costerbox.in</a></strong>
            </p>
        </div>
    );
}
