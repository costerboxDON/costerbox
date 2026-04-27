/* src/app/contact/page.js */
import React from 'react';
import '../../styles/contact.css'; 

export const metadata = {
  title: 'Contact Costerbox',
  description: 'Partnerships, commissions, or just appreciation for art.',
};

export default function ContactPage() {
  return (
    <>
      {/* 1. Load Fonts specified in your HTML */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      
      <div className="contact-page-wrapper">
        
        <div className="contact-split-layout">
            
            {/* LEFT COLUMN: VISUAL & INFO */}
            <div className="contact-visual-col">
                <div className="contact-bg-image"></div> {/* Image is handled in CSS */}
                
                <div className="contact-info-content">
                    <div className="contact-info-block">
                        <h2>Visit the Studio</h2>
                        <p>
                            Bhamashah Techno Hub,<br />
                            Jaipur, Rajasthan
                        </p>
                    </div>
                    <div className="contact-info-block">
                        <h2>Inquiries</h2>
                        <p><i className="fas fa-envelope"></i> <a href="mailto:contact@costerbox.in">contact@costerbox.in</a></p>
                        <p><i className="fas fa-phone"></i> +91 63775 15507</p>
                    </div>
                    <div className="contact-info-block">
                        <h2>Social</h2>
                        <p>
                            <a href="https://instagram.com/costerbox" target="_blank" rel="noopener noreferrer">Instagram</a>
                             &nbsp;/&nbsp; 
                            <a href="https://wa.me/+916377515507" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: FORM SECTION */}
            <div className="contact-form-col">
                <div className="form-header">
                    <span className="overline">Get in Touch</span>
                    <h1>Start a Conversation</h1>
                    <p>Partnerships, commissions, or just appreciation for art.</p>
                </div>
                
                <form className="editorial-form" action="https://api.web3forms.com/submit" method="POST">
                    
                    {/* Access Key from your HTML */}
                    <input type="hidden" name="access_key" value="c21d689d-b850-4e33-937e-1ee3037204bb" />
                    
                    <div className="input-group">
                        <input type="text" name="name" className="input-editorial" placeholder="Your Name" required />
                    </div>
                    
                    <div className="input-group">
                        <input type="email" name="email" className="input-editorial" placeholder="Email Address" required />
                    </div>

                    <div className="input-group">
                        <input type="text" name="subject" className="input-editorial" placeholder="Subject" />
                    </div>

                    <div className="input-group">
                        <textarea 
                            name="message" 
                            className="input-editorial" 
                            rows="3" 
                            placeholder="Write your message..." 
                            style={{ resize: 'none' }} 
                            required
                        ></textarea>
                    </div>

                    <button type="submit" className="btn-editorial">Send Message</button>
                </form>
            </div>
        </div>

        {/* MAP SECTION */}
        <div className="map-section-container">
            <div className="map-widget-wrapper">
                <a href="https://goo.gl/maps/xyz" target="_blank" title="Open Directions" rel="noopener noreferrer">
                    <iframe 
                        className="map-iframe"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3558.140733596788!2d75.79549307612762!3d26.89886757665545!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x396db4484b917531%3A0x6b776c54784177b9!2sBhamashah%20Techno%20Hub!5e0!3m2!1sen!2sin!4v1709228492000!5m2!1sen!2sin"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                    <button className="map-overlay-btn">
                        <i className="fas fa-location-arrow"></i> Navigate
                    </button>
                </a>
            </div>
        </div>

      </div>
    </>
  );
}