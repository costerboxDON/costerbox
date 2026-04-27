/* src/app/layout.js */
import '../styles/globals.css';
import { Suspense } from 'react';
import { AuthProvider } from '../context/AuthContext';
import Header from '../components/Header';
import ConditionalFooter from '../components/ConditionalFooter';
import PromoStrip from '../components/PromoStrip';
import ConditionalInstagramReels from '../components/ConditionalInstagramReels';
import PageLoader from '../components/PageLoader';

export const metadata = {
  title: 'Costerbox | Handcrafted Artistry',
  description: 'Celebrating Handcrafted Artistry & Timeless Design',
};

import { CartProvider } from '../context/CartContext';

import { WishlistProvider } from '../context/WishlistContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              {/* 0. Promo Strip — above header */}


              {/* Page loader — shows GIF on every navigation */}
              <Suspense fallback={null}>
                <PageLoader />
              </Suspense>

              {/* 1. Header is now global */}
              <Header />

              {/* 2. Main Content */}
              <div style={{ minHeight: '80vh' }}>
                {children}
              </div>

              {/* 3. Instagram Reels (only on Home & About) */}
              <ConditionalInstagramReels />

              {/* 4. Footer — hidden on admin/secured pages */}
              <ConditionalFooter />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}