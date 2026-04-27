"use client";
import React, { useEffect } from 'react';
import '../../styles/policy.css';

export default function PrivacyPolicyPage() {
    useEffect(() => {
        document.title = "Privacy Policy — Costerbox";
    }, []);

    return (
        <div className="policy-page">
            <h1>Privacy Policy</h1>
            <p>
                This Privacy Policy describes how Costerbox (<strong><a href="https://costerbox.in">https://costerbox.in</a></strong>) collects, uses, stores, and protects your personal information when you visit, interact with, or make a purchase from our website. By accessing or using our services, you agree to the terms outlined in this policy.
            </p>

            <h2>Information We Collect</h2>
            <p>When you browse or place an order on Costerbox, we may collect the following types of information:</p>
            <ul>
                <li>Personal details such as your full name, billing address, shipping address, email address, and mobile number.</li>
                <li>Order-related information including products purchased, customization details, order history, and communication records.</li>
                <li>Payment-related information necessary to process transactions securely through third-party payment gateways (we do not store card or banking details).</li>
                <li>Technical data such as IP address, browser type, device information, and cookies for analytics and website optimization.</li>
            </ul>

            <h2>How We Use Collected Information</h2>
            <p>We use the collected information strictly for legitimate business purposes, including but not limited to:</p>
            <ul>
                <li>Processing, confirming, and fulfilling customer orders.</li>
                <li>Communicating order updates, shipping information, and support queries.</li>
                <li>Managing customer accounts and improving overall user experience.</li>
                <li>Ensuring website security, fraud prevention, and compliance with legal obligations.</li>
                <li>Internal analysis to enhance our products, services, and platform performance.</li>
            </ul>

            <h2>Data Sharing & Disclosure</h2>
            <p>
                Costerbox does not sell, rent, or trade customer data. Information may be shared only with trusted third-party service providers such as payment gateways, logistics partners, and technology providers, strictly for the purpose of order fulfillment and service delivery.
            </p>

            <h2>Data Security</h2>
            <p>
                We implement reasonable administrative, technical, and physical security measures to safeguard personal data. While we take strong precautions, users acknowledge that no online transmission is entirely secure.
            </p>

            <h2>User Rights</h2>
            <p>
                Customers may request access, correction, or deletion of their personal information by contacting us directly, subject to applicable legal and regulatory requirements.
            </p>

            <h2>Contact Information</h2>
            <p>
                For privacy-related concerns or requests, contact us at: <strong><a href="mailto:info@costerbox.in">info@costerbox.in</a></strong>
            </p>
        </div>
    );
}
