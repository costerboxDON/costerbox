/* src/app/search/page.js */
"use client";
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore'; 
import '../../styles/search.css';

// --- STATIC PAGES (Instant Results) ---
const STATIC_PAGES = [
  { id: 'page-about', name: "Our Story & Philosophy", link: "/about", description: "Read about the roots of Costerbox.", type: "page", keywords: "about story history founders who brand" },
  { id: 'page-contact', name: "Contact Us", link: "/contact", description: "Visit our studio in Jaipur.", type: "page", keywords: "contact email phone address map location help" },
  { id: 'page-sale', name: "Clearance Sale", link: "/#products", description: "Shop our latest deals.", type: "page", keywords: "sale discount offer cheap clearance" }
];

function SearchContent() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get('q') || '';
  
  // --- STATE ---
  const [allProducts, setAllProducts] = useState([]); // Store ALL products here
  const [dataLoaded, setDataLoaded] = useState(false); // Have we fetched DB yet?
  
  // --- 1. FETCH ALL DATA ONCE (On Mount) ---
  useEffect(() => {
    const fetchAllData = async () => {
      // Check if we already have data in memory to avoid re-fetching
      if (allProducts.length > 0) return;

      try {
        // Fetch ALL products. 
        // NOTE: For < 2000 items, fetching all is FASTER than multiple individual queries.
        // It creates only 1 DB read session.
        const querySnapshot = await getDocs(collection(db, "products"));
        
        const products = [];
        querySnapshot.forEach((doc) => {
           // We process data once here to make search faster later
           const data = doc.data();
           products.push({
             id: doc.id,
             ...data,
             type: 'product',
             // Create a "search string" for super fast checking
             // Combines name, category, and keywords into one lowercase string
             searchStr: `${data.name} ${data.category} ${(data.keywords || []).join(" ")}`.toLowerCase()
           });
        });

        setAllProducts(products);
        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };

    fetchAllData();
  }, []); // Empty dependency array = Run only once on load


  // --- 2. INSTANT FILTERING (0ms latency) ---
  // This runs instantly whenever 'rawQuery' or 'allProducts' changes
  const results = useMemo(() => {
    if (!rawQuery) return [];
    
    const term = rawQuery.toLowerCase().trim();
    if (term.length < 1) return [];

    // Filter Products (In Memory)
    const productMatches = allProducts.filter(product => 
      product.searchStr.includes(term)
    );

    // Filter Pages (In Memory)
    const pageMatches = STATIC_PAGES.filter(page => 
      page.name.toLowerCase().includes(term) || 
      page.keywords.includes(term)
    );

    return [...pageMatches, ...productMatches];
  }, [rawQuery, allProducts]);


  return (
    <div className="search-page-container">
      <div className="container">
        
        {/* Header */}
        <div className="search-header">
          <span className="overline">Search Results</span>
          <h1>{rawQuery ? `Results for "${rawQuery}"` : "Start Searching"}</h1>
          <p>
            {!dataLoaded ? "Loading" : `${results.length} results found`}
          </p>
        </div>

        {/* Grid */}
        <div className="search-grid">
          
          {/* LOAD STATE */}
          {!dataLoaded && (
             <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i> Loading...
             </div>
          )}

          {/* RESULTS STATE */}
          {dataLoaded && results.length > 0 && results.map(item => (
            item.type === 'product' ? (
              <div key={item.id} className="search-card product">
                <div className="s-image">
                  <img src={item.image || "https://placehold.co/600x400"} alt={item.name} />
                </div>
                <div className="s-details">
                  <h3>{item.name}</h3>
                  <span className="s-cat">{item.category}</span>
                  <p className="s-price">{item.price}</p>
                  <button className="btn-add">View Product</button>
                </div>
              </div>
            ) : (
              <Link href={item.link} key={item.id} className="search-card page-link">
                 <div className="s-details">
                    <span className="overline">Page</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="read-more">Go to Page <i className="fas fa-arrow-right"></i></span>
                 </div>
              </Link>
            )
          ))}

          {/* EMPTY STATE */}
          {dataLoaded && results.length === 0 && rawQuery && (
             <div className="no-results">
                <h3>No matches found.</h3>
                <p>Try "Anarkali", "Yellow", or "About".</p>
                <Link href="/" className="btn-editorial">Back to Shop</Link>
             </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}