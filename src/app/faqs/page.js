/* src/app/faqs/page.js */
import React from 'react';
import '../../styles/policy.css';

export const metadata = {
    title: 'FAQs — Costerbox',
    description: 'Frequently Asked Questions about Costerbox products, orders, shipping, and customization.',
};

const FAQS = [
    {
        question: "What makes Costerbox products unique?",
        answer: "Every Costerbox product is handcrafted by skilled artisans from Rajasthan using traditional folk and tribal art techniques. Each piece is unique, celebrating India's rich craft heritage."
    },
    {
        question: "How long does delivery take?",
        answer: "Standard delivery takes 5–7 business days within India. For international orders, please allow 10–15 business days. Custom orders may require additional time depending on complexity."
    },
    {
        question: "Can I customise a product?",
        answer: "Yes! Most of our products can be customised. You can choose sizes, add tassels, or request bespoke designs. Customisation requires a 70% advance payment, with the balance due on completion."
    },
    {
        question: "What is your return and refund policy?",
        answer: "We accept returns within 7 days of delivery for non-customised products in unused condition. Customised products cannot be returned unless defective. Please refer to our Refund Policy page for more details."
    },
    {
        question: "How do I track my order?",
        answer: "Once your order is shipped, you will receive a tracking number via email. You can also view your order status by visiting the 'Track Your Order' section in your account."
    },
    {
        question: "Do you ship internationally?",
        answer: "Yes, we ship internationally! International shipping rates and delivery timelines vary by destination. Please check our International Orders Policy page for more details."
    },
    {
        question: "How do I contact Costerbox?",
        answer: "You can reach us at contact@costerbox.in or via WhatsApp at +91 63775 15507. We typically respond within 24 business hours."
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit/debit cards, UPI, net banking, and digital wallets via our secure payment gateway."
    },
    {
        question: "Are the product colours accurate?",
        answer: "We make every effort to display product colours accurately. However, due to variations in screen settings and the handcrafted nature of our products, slight colour differences may occur."
    },
    {
        question: "How do I care for my Costerbox product?",
        answer: "Care instructions vary by product. Generally, we recommend gentle hand washing with mild detergent and air drying. Specific care instructions are provided on each product page."
    },
];

export default function FAQsPage() {
    return (
        <div className="policy-page">
            <h1>Frequently Asked Questions</h1>
            <p style={{ marginBottom: '40px', color: '#666' }}>
                Got questions? We've got answers. If you don't find what you're looking for, feel free to reach out at{' '}
                <a href="mailto:contact@costerbox.in">contact@costerbox.in</a>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {FAQS.map((faq, index) => (
                    <div key={index} style={{
                        borderBottom: '1px solid #eee',
                        paddingBottom: '24px'
                    }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#1a1a1a' }}>
                            {faq.question}
                        </h2>
                        <p style={{ color: '#555', lineHeight: '1.7', margin: 0 }}>
                            {faq.answer}
                        </p>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '50px', padding: '24px', background: '#f9f9f9', borderRadius: '8px' }}>
                <h2 style={{ marginBottom: '10px' }}>Still have questions?</h2>
                <p style={{ color: '#555', marginBottom: '16px' }}>
                    Our team is happy to help. Reach out to us at any time.
                </p>
                <a href="/contact" style={{
                    display: 'inline-block',
                    padding: '12px 28px',
                    background: '#1a1a1a',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    fontSize: '14px'
                }}>
                    Contact Us
                </a>
            </div>
        </div>
    );
}
