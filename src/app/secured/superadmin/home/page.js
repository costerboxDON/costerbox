"use client";
import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../../../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload as UploadIcon, Save, Image as ImageIcon, X } from 'lucide-react';

export default function SuperadminHomePage() {
  const [heroBanner, setHeroBanner] = useState({
    image: '',
    subtitle: '',
    title: '',
    cta: '',
    link: '',
    align: 'center'
  });
  const [homeProducts, setHomeProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroImageUrlPreview, setHeroImageUrlPreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Products
      const prodSnap = await getDocs(collection(db, 'products'));
      const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllProducts(prods);

      // Fetch Home Settings
      const siteDoc = await getDoc(doc(db, 'siteSettings', 'home'));
      if (siteDoc.exists()) {
        const data = siteDoc.data();
        if (data.heroBanner) {
          if (typeof data.heroBanner === 'string') {
             // Migration from string
             setHeroBanner(prev => ({ ...prev, image: data.heroBanner }));
             setHeroImageUrlPreview(data.heroBanner);
          } else {
             setHeroBanner(data.heroBanner);
             setHeroImageUrlPreview(data.heroBanner.image);
          }
        }
        if (data.homeProducts) setHomeProducts(data.homeProducts);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load settings.");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalImageUrl = heroBanner.image;

      // Upload if there's a new file selected
      if (heroImageFile) {
        const imgRef = ref(storage, `home/${Date.now()}_${heroImageFile.name}`);
        await uploadBytes(imgRef, heroImageFile);
        finalImageUrl = await getDownloadURL(imgRef);
      }

      const finalBannerData = { ...heroBanner, image: finalImageUrl };

      await setDoc(doc(db, 'siteSettings', 'home'), {
        heroBanner: finalBannerData,
        homeProducts
      }, { merge: true });
      
      setHeroBanner(finalBannerData);
      setHeroImageFile(null); // Clear pending file upload after successful save
      alert("Home page settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    }
    setSaving(false);
  };

  // Image Upload Handlers
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setHeroImageFile(file);
    setHeroImageUrlPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setHeroImageFile(null);
    setHeroImageUrlPreview('');
    setHeroBanner(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setHeroImageFile(file);
    setHeroImageUrlPreview(URL.createObjectURL(file));
  };

  const handleBannerChange = (field, value) => {
    setHeroBanner(prev => ({ ...prev, [field]: value }));
  };

  const toggleProduct = (productId) => {
    if (homeProducts.includes(productId)) {
      setHomeProducts(homeProducts.filter(id => id !== productId));
    } else {
      setHomeProducts([...homeProducts, productId]);
    }
  };

  if (loading) return <div style={{ padding: '50px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Manage Home Page</h1>

      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ImageIcon size={20} /> Hero Banner
        </h2>

        {/* Drag and Drop Image Uploader */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>Banner Image</label>
          {heroImageUrlPreview ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
              <img src={heroImageUrlPreview} alt="Hero Preview" style={{ width: '100%', display: 'block' }} />
              <button 
                onClick={removeImage}
                style={{ position: 'absolute', top: '10px', right: '10px', background: '#fff', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ 
                border: '2px dashed #ccc', borderRadius: '8px', padding: '40px', 
                textAlign: 'center', cursor: 'pointer', background: '#fafafa' 
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon size={32} color="#aaa" style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Click or drag to upload image</p>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                style={{ display: 'none' }} 
              />
            </div>
          )}
        </div>

        {/* Text Fields */}
        <div style={{ display: 'grid', gap: '15px' }}>
           <div>
              <label style={labelStyle}>Title</label>
              <input 
                 type="text" 
                 placeholder="e.g. CRAFTED WITH LOVE" 
                 value={heroBanner.title} 
                 onChange={e => handleBannerChange('title', e.target.value)} 
                 style={inputStyle} 
              />
           </div>
           <div>
              <label style={labelStyle}>Subtitle</label>
              <input 
                 type="text" 
                 placeholder="e.g. Tribal Art Reimagined" 
                 value={heroBanner.subtitle} 
                 onChange={e => handleBannerChange('subtitle', e.target.value)} 
                 style={inputStyle} 
              />
           </div>
           <div style={{ display: 'flex', gap: '15px' }}>
             <div style={{ flex: 1 }}>
                <label style={labelStyle}>Button Text (CTA)</label>
                <input 
                   type="text" 
                   placeholder="e.g. Shop Collection" 
                   value={heroBanner.cta} 
                   onChange={e => handleBannerChange('cta', e.target.value)} 
                   style={inputStyle} 
                />
             </div>
             <div style={{ flex: 1 }}>
                <label style={labelStyle}>Button Link</label>
                <input 
                   type="text" 
                   placeholder="e.g. /products" 
                   value={heroBanner.link} 
                   onChange={e => handleBannerChange('link', e.target.value)} 
                   style={inputStyle} 
                />
             </div>
             <div style={{ flex: 1 }}>
                <label style={labelStyle}>Text Alignment</label>
                <select 
                   value={heroBanner.align} 
                   onChange={e => handleBannerChange('align', e.target.value)} 
                   style={inputStyle}
                >
                   <option value="left">Left</option>
                   <option value="center">Center</option>
                   <option value="right">Right</option>
                </select>
             </div>
           </div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
          Home Page Products Collection
        </h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          Select the products you want to feature on the home page. Note: This will override the default New Arrivals, Bestsellers, and Featured lists.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', maxHeight: '500px', overflowY: 'auto', padding: '10px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px' }}>
          {allProducts.filter(p => p.status === 'Active').map(product => {
            const isSelected = homeProducts.includes(product.id);
            return (
              <div 
                key={product.id}
                onClick={() => toggleProduct(product.id)}
                style={{
                  background: isSelected ? '#e0e7ff' : '#fff',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #ddd',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: '0.2s'
                }}
              >
                <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{product.title || product.name || 'Unnamed Product'}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{product.category || 'No Category'}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '15px', fontSize: '13px', fontWeight: '600', color: '#4f46e5' }}>
          {homeProducts.length} product(s) selected
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background: '#1a1a1a', color: '#fff', padding: '12px 25px', borderRadius: '8px', 
          border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', 
          display: 'flex', alignItems: 'center', gap: '8px'
        }}
      >
        <Save size={18} /> {saving ? 'Saving...' : 'Save Home Settings'}
      </button>

    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' };
