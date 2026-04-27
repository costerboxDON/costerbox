/* src/app/page.js */
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useWishlist } from '../context/WishlistContext';
import { Heart } from 'lucide-react';
import '@/styles/home.css';
import HomeCustomServices from '@/components/HomeCustomServices';

export default function HomePage() {
  // ========= STATE =========
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Dynamic data from Firestore
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState({ state: 'idle', message: '' });
  const [homeSettings, setHomeSettings] = useState(null);
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Import addDoc and serverTimestamp from firebase/firestore if not already there
  // (Adding them via separate chunk or checking imports)


  // ========= FETCH DATA FROM FIRESTORE =========
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const catSnap = await getDocs(collection(db, 'categories'));
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.name);
        setCategories(cats);

        // Fetch products
        const prodSnap = await getDocs(collection(db, 'products'));
        const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllProducts(prods);

        // Fetch home settings
        const siteDoc = await getDoc(doc(db, 'siteSettings', 'home'));
        if (siteDoc.exists()) {
          setHomeSettings(siteDoc.data());
        }
      } catch (err) {
        console.error('Error fetching homepage data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ========= DERIVE PRODUCT SECTIONS FROM TAGS =========
  const hasManagedProducts = homeSettings?.homeProducts?.length > 0;
  const managedProducts = hasManagedProducts 
    ? allProducts.filter(p => homeSettings.homeProducts.includes(p.id) && String(p.status || "").toLowerCase() === 'active')
    : [];
  const newArrivals = allProducts.filter(p =>
    Array.isArray(p.tags) && p.tags.includes('new-arrival') && p.status === 'Active'
  ).slice(0, 8);

  const bestsellers = allProducts.filter(p =>
    Array.isArray(p.tags) && p.tags.includes('bestseller') && p.status === 'Active'
  ).slice(0, 8);

  // Featured products (fallback to latest if no tags)
  const featuredProducts = allProducts.filter(p =>
    Array.isArray(p.tags) && p.tags.includes('featured') && p.status === 'Active'
  ).slice(0, 8);

  // Get product image
  const getProductImage = (product, index = 0) => {
    if (index === 0) {
      return product.featuredImage || (product.media && product.media[0]) || 'https://via.placeholder.com/400x600?text=No+Image';
    }
    // Second image for hover
    if (product.media && product.media.length > 1) return product.media[1];
    return product.featuredImage || (product.media && product.media[0]) || '';
  };

  // ========= HERO SLIDER =========
  const defaultHeroSlides = [

    {
      image: '/img14.jpg',
      subtitle: 'Tribal Art Reimagined',
      title: 'CRAFTED WITH LOVE\nFOR YOU',
      cta: 'Shop Collection',
      link: '/products',
      align: 'left'
    },
    {
      image: '/heroimage.png',
      subtitle: 'Est. 2024 • Jaipur, India',
      title: 'TRIBAL ART,\nREIMAGINED.',
      cta: 'Shop Now',
      link: '/products',
      align: 'center'
    }
  ];

  let heroSlides = defaultHeroSlides;
  if (homeSettings?.heroBanner) {
    if (typeof homeSettings.heroBanner === 'string') {
      heroSlides = [{ image: homeSettings.heroBanner, subtitle: 'Welcome to Costerbox', title: 'CRAFTED WITH LOVE\nFOR YOU', cta: 'Shop Collection', link: '/products', align: 'center' }];
    } else if (homeSettings.heroBanner.image) {
      heroSlides = [{
        image: homeSettings.heroBanner.image,
        subtitle: homeSettings.heroBanner.subtitle || 'Welcome to Costerbox',
        title: homeSettings.heroBanner.title || 'CRAFTED WITH LOVE\nFOR YOU',
        cta: homeSettings.heroBanner.cta || 'Shop Collection',
        link: homeSettings.heroBanner.link || '/products',
        align: homeSettings.heroBanner.align || 'center'
      }];
    }
  }

  const goToSlide = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 800);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % heroSlides.length);
  }, [currentSlide, heroSlides.length, goToSlide]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  // ========= TESTIMONIALS =========
  const testimonials = [
    { text: "Thanks team, I have received the order. For sure. I am definitely going to recommend you guys for your quick service.", author: "Aanisah", location: "Spain" },
    { text: "I got my outfit and I'm just blown by how beautiful the outfit and packaging is. Amazing fit! Will definitely be ordering again very soon.", author: "Priya K.", location: "Mumbai" },

    { text: "Hi thank you, your products are very nice! I have shared the links with some friends too and love that you have plus sizes!", author: "Sarah M.", location: "London" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  // ========= Product Card Component =========
  const ProductCard = ({ product }) => {
    const img1 = getProductImage(product, 0);
    const img2 = getProductImage(product, 1);
    const name = product.title || product.name || 'Product';
    const price = product.price ? `₹${Number(product.price).toLocaleString('en-IN')}` : '';
    const comparePrice = product.comparePrice ? `₹${Number(product.comparePrice).toLocaleString('en-IN')}` : '';

    // Determine tag to show
    let tag = null;
    if (Array.isArray(product.tags)) {
      if (product.tags.includes('new-arrival')) tag = 'New';
      else if (product.tags.includes('bestseller')) tag = 'Bestseller';
      else if (product.tags.includes('sale')) tag = 'Sale';
    }
    if (product.badge) tag = product.badge;

    return (
      <Link href={`/shop/${product.seoHandle || product.id}`} className="pc-card">
        <div className="pc-image-box">
          <Image
            src={img1}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="pc-img pc-img-primary"
          />
          {img2 && img2 !== img1 && (
            <Image
              src={img2}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="pc-img pc-img-hover"
            />
          )}
          {tag && (
            <span className={`pc-tag ${tag === 'Sale' ? 'pc-tag-sale' : tag === 'Bestseller' ? 'pc-tag-best' : ''}`}>
              {tag}
            </span>
          )}

          {/* Wishlist Button Overlay */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product);
            }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
            title={isInWishlist(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart
              size={16}
              fill={isInWishlist(product.id) ? "#e53935" : "none"}
              color={isInWishlist(product.id) ? "#e53935" : "#1a1a1a"}
            />
          </button>

          <button className="pc-quick-add" onClick={(e) => { e.preventDefault(); }}>
            Quick View
          </button>
        </div>
        <div className="pc-details">
          <h3 className="pc-name">{name}</h3>
          <div className="pc-pricing">
            <span className="pc-price">{price}</span>
            {comparePrice && <span className="pc-compare">{comparePrice}</span>}
          </div>
        </div>
      </Link>
    );
  };

  // ========= CATEGORY IMAGE (use first product image from that category) =========
  const getCategoryImage = (catName) => {
      // First, check if the category itself has a feature image uploaded via admin
      const catObj = categories.find(c => c.name === catName);
      if (catObj && catObj.imageUrl) return catObj.imageUrl;
  
      // Fallback: use the first product image from that category
    const safeCatName = String(catName).trim().toLowerCase();
    const normCatName = safeCatName.replace(/s$/, '');

    const product = allProducts.find(p => {
      const pCat = String(p.category || "").trim().toLowerCase();
      const matches = pCat === safeCatName || pCat.replace(/s$/, '') === normCatName;
      const isActive = String(p.status || "").toLowerCase() === 'active';
      return matches && isActive && (p.featuredImage || (p.media && p.media.length > 0));
    });

    if (product) return product.featuredImage || product.media[0];
    return 'https://via.placeholder.com/400x600?text=' + encodeURIComponent(catName);
  };

  const getCategoryCount = (catName) => {
    const safeCatName = String(catName).trim().toLowerCase();
    const normCatName = safeCatName.replace(/s$/, '');

    return allProducts.filter(p => {
      const pCat = String(p.category || "").trim().toLowerCase();
      const matches = pCat === safeCatName || pCat.replace(/s$/, '') === normCatName;
      const isActive = String(p.status || "").toLowerCase() === 'active';
      return matches && isActive;
    }).length;
  };

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;

    setNewsletterStatus({ state: 'loading', message: '' });
    try {
      await addDoc(collection(db, 'newsletter_subscribers'), {
        email: newsletterEmail.trim(),
        subscribedAt: serverTimestamp()
      });
      setNewsletterEmail('');
      setNewsletterStatus({ state: 'success', message: 'Successfully subscribed!' });
      setTimeout(() => setNewsletterStatus({ state: 'idle', message: '' }), 5000);
    } catch (err) {
      console.error('Newsletter error:', err);
      setNewsletterStatus({ state: 'error', message: 'Failed to subscribe. Please try again.' });
    }
  };

  // ========= RENDER =========

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#888' }}>
        Loading...
      </div>
    );
  }

  return (
    <>


      {/* ============ 2. HERO SLIDER ============ */}
      <section className="hero-slider">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
          >
            <Image
              src={slide.image}
              alt={slide.subtitle || 'Hero Banner'}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              priority={index === 0}
              sizes="100vw"
            />
            <div className="hero-overlay" />
            <div className={`hero-content hero-${slide.align}`}>
              <span className="hero-subtitle">{slide.subtitle}</span>
              <h1 className="hero-heading">{slide.title}</h1>
              <Link href={slide.link} className="hero-cta">{slide.cta}</Link>
            </div>
          </div>
        ))}

        {heroSlides.length > 1 && (
          <>
            <div className="hero-dots">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
            <button className="hero-arrow hero-arrow-left" onClick={() => goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length)}>‹</button>
            <button className="hero-arrow hero-arrow-right" onClick={() => goToSlide((currentSlide + 1) % heroSlides.length)}>›</button>
          </>
        )}
      </section>

      {/* ============ MANAGED PRODUCTS ============ */}
      {hasManagedProducts && managedProducts.length > 0 ? (
        <section className="section-products">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">✨ Featured Collection</h2>
              <Link href="/products" className="section-link">Shop All →</Link>
            </div>
            <div className="products-grid">
              {managedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
      {/* ============ 3. NEW ARRIVALS (from Firestore tags) ============ */}
      {newArrivals.length > 0 && (
        <section className="section-products">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">New Arrivals</h2>
              <Link href="/products?cat=new-arrival" className="section-link">Shop All →</Link>
            </div>
            <div className="products-grid">
              {newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 4. BESTSELLERS (from Firestore tags) ============ */}
      {bestsellers.length > 0 && (
        <section className="section-products section-alt">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Bestsellers</h2>
              <Link href="/products?cat=bestseller" className="section-link">Shop All →</Link>
            </div>
            <div className="products-grid">
              {bestsellers.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 5. FEATURED (from Firestore tags) ============ */}
      {featuredProducts.length > 0 && (
        <section className="section-products">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Featured</h2>
              <Link href="/products?cat=featured" className="section-link">Shop All →</Link>
            </div>
            <div className="products-grid">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ FALLBACK: ALL PRODUCTS if no tags exist ============ */}
      {newArrivals.length === 0 && bestsellers.length === 0 && featuredProducts.length === 0 && allProducts.length > 0 && (
        <section className="section-products">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Our Products</h2>
              <Link href="/products" className="section-link">Shop All →</Link>
            </div>
            <div className="products-grid">
              {allProducts.filter(p => p.status === 'Active').slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
      </>
      )}

      {/* ============ CUSTOM SERVICES ============ */}
      <HomeCustomServices />

      {/* ============ 6. SHOP BY CATEGORY (Dynamic from Firestore) ============ */}
      {categories.length > 0 && (
        <section className="section-category">
          <div className="container">
            <h2 className="section-title-center">Shop By Category</h2>
            <div className="cat-round-grid">
              {categories.map((cat) => (
                <Link href={`/products?cat=${encodeURIComponent(cat.name)}`} key={cat.id} className="cat-round-item">
                  <div className="cat-round-img-wrap">
                    <Image
                      src={getCategoryImage(cat.name)}
                      alt={cat.name}
                      fill
                      sizes="140px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <h3 className="cat-round-name">{cat.name}</h3>
                  <span className="cat-round-count">{getCategoryCount(cat.name)} Items</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 7. ABOUT US ============ */}
      <section className="section-about">
        <div className="about-image-side" style={{ position: 'relative' }}>
          <Image
            src="/img14.jpg"
            alt="Our Story"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="about-text-side">
          <span className="about-label">About Us</span>
          <h2 className="about-heading">A Story From The Roots</h2>
          <p>
            We know some things are special when they tell a story, something that comes from the roots of a culture creating a dialect between the user and provider.
          </p>
          <p>
            Costerbox proudly represents this vernacular story from the great state of Rajasthan which talks about the clothes that are made by the experienced hand of local craftsmanship passed down through generations, their great knowledge of sustainable fabric and hand-worked details that outline beautiful minimalistic design.
          </p>
          <Link href="/about" className="about-cta">Read More</Link>
        </div>
      </section>


      {/* ============ 9. TESTIMONIALS ============ */}
      <section className="section-testimonials">
        <div className="container">
          <span className="testi-overline">From The People</span>
          <div className="testi-slider">
            {testimonials.map((t, i) => (
              <div key={i} className={`testi-item ${i === currentTestimonial ? 'active' : ''}`}>
                <p className="testi-text">"{t.text}"</p>
                <h5 className="testi-author">— {t.author} ({t.location})</h5>
              </div>
            ))}
          </div>
          <div className="testi-dots">
            {testimonials.map((_, i) => (
              <button
                key={i}
                className={`testi-dot ${i === currentTestimonial ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ 10. NEWSLETTER ============ */}
      <section className="section-newsletter">
        <div className="container">
          <h3 className="nl-heading">Subscribe to Offers & Newsletters</h3>
          <p className="nl-text">Be the first to know about new collections, exclusive offers, and more.</p>
          <form className="nl-form" onSubmit={handleNewsletter}>
            <input
              type="email"
              placeholder="Enter your email address"
              className="nl-input"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
              disabled={newsletterStatus.state === 'loading'}
            />
            <button
              type="submit"
              className="nl-btn"
              disabled={newsletterStatus.state === 'loading'}
            >
              {newsletterStatus.state === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {newsletterStatus.message && (
            <p style={{
              marginTop: '15px',
              fontSize: '14px',
              color: newsletterStatus.state === 'success' ? '#2e7d32' : '#d32f2f',
              fontWeight: '600'
            }}>
              {newsletterStatus.message}
            </p>
          )}
          <p className="nl-disclaimer">*By completing this form you're signing up to receive our emails and can unsubscribe at any time.</p>
        </div>
      </section>

    </>
  );
}