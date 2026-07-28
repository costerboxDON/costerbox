"use client";
import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload as UploadIcon, Save, Image as ImageIcon, X, Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

const emptyBanner = () => ({
  image: '',
  subtitle: '',
  title: '',
  cta: '',
  link: '',
  align: 'center',
  _file: null,
  _preview: '',
});

export default function SuperadminHomePage() {
  const [heroBanners, setHeroBanners] = useState([emptyBanner()]);
  const [homeProducts, setHomeProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

        if (Array.isArray(data.heroBanners) && data.heroBanners.length > 0) {
          // Current multi-banner format
          setHeroBanners(data.heroBanners.map(b => ({ ...emptyBanner(), ...b, _preview: b.image || '' })));
        } else if (data.heroBanner) {
          // Migration from legacy single-banner format
          if (typeof data.heroBanner === 'string') {
            setHeroBanners([{ ...emptyBanner(), image: data.heroBanner, _preview: data.heroBanner }]);
          } else {
            setHeroBanners([{ ...emptyBanner(), ...data.heroBanner, _preview: data.heroBanner.image || '' }]);
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
      const finalBanners = await Promise.all(heroBanners.map(async (banner, index) => {
        let finalImageUrl = banner.image;

        if (banner._file) {
          const imgRef = ref(storage, `home/${Date.now()}_${index}_${banner._file.name}`);
          await uploadBytes(imgRef, banner._file);
          finalImageUrl = await getDownloadURL(imgRef);
        }

        return {
          image: finalImageUrl,
          subtitle: banner.subtitle,
          title: banner.title,
          cta: banner.cta,
          link: banner.link,
          align: banner.align,
        };
      }));

      await setDoc(doc(db, 'siteSettings', 'home'), {
        heroBanners: finalBanners,
        homeProducts
      }, { merge: true });

      setHeroBanners(finalBanners.map(b => ({ ...emptyBanner(), ...b, _preview: b.image })));
      alert("Home page settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    }
    setSaving(false);
  };

  // Per-banner image handlers
  const handleImageSelect = (index, file) => {
    if (!file) return;
    setHeroBanners(prev => prev.map((b, i) => i === index ? { ...b, _file: file, _preview: URL.createObjectURL(file) } : b));
  };

  const removeImage = (index) => {
    setHeroBanners(prev => prev.map((b, i) => i === index ? { ...b, _file: null, _preview: '', image: '' } : b));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (index, e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleImageSelect(index, file);
  };

  const handleBannerChange = (index, field, value) => {
    setHeroBanners(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };

  const addBanner = () => {
    setHeroBanners(prev => [...prev, emptyBanner()]);
  };

  const removeBanner = (index) => {
    setHeroBanners(prev => prev.filter((_, i) => i !== index));
  };

  const moveBanner = (index, direction) => {
    setHeroBanners(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
          <ImageIcon size={20} /> Hero Banners
        </h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          Add one or more banners. On the homepage they rotate automatically every 3 seconds.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {heroBanners.map((banner, index) => (
            <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#666' }}>Banner {index + 1}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => moveBanner(index, -1)}
                    disabled={index === 0}
                    title="Move up"
                    style={iconBtnStyle(index === 0)}
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => moveBanner(index, 1)}
                    disabled={index === heroBanners.length - 1}
                    title="Move down"
                    style={iconBtnStyle(index === heroBanners.length - 1)}
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    onClick={() => removeBanner(index)}
                    disabled={heroBanners.length === 1}
                    title="Remove banner"
                    style={{ ...iconBtnStyle(heroBanners.length === 1), color: '#dc2626' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Drag and Drop Image Uploader */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Banner Image</label>
                {banner._preview ? (
                  <div style={{ position: 'relative', width: '100%', maxWidth: '500px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                    <img src={banner._preview} alt="Hero Preview" style={{ width: '100%', display: 'block' }} />
                    <button
                      onClick={() => removeImage(index)}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: '#fff', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(index, e)}
                    style={{
                      border: '2px dashed #ccc', borderRadius: '8px', padding: '40px',
                      textAlign: 'center', cursor: 'pointer', background: '#fff'
                    }}
                    onClick={() => document.getElementById(`banner-file-${index}`)?.click()}
                  >
                    <UploadIcon size={32} color="#aaa" style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Click or drag to upload image</p>
                    <input
                      id={`banner-file-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageSelect(index, e.target.files[0])}
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
                    value={banner.title}
                    onChange={e => handleBannerChange(index, 'title', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. Tribal Art Reimagined"
                    value={banner.subtitle}
                    onChange={e => handleBannerChange(index, 'subtitle', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Button Text (CTA)</label>
                    <input
                      type="text"
                      placeholder="e.g. Shop Collection"
                      value={banner.cta}
                      onChange={e => handleBannerChange(index, 'cta', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Button Link</label>
                    <input
                      type="text"
                      placeholder="e.g. /products"
                      value={banner.link}
                      onChange={e => handleBannerChange(index, 'link', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Text Alignment</label>
                    <select
                      value={banner.align}
                      onChange={e => handleBannerChange(index, 'align', e.target.value)}
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
          ))}
        </div>

        <button
          onClick={addBanner}
          style={{
            marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px',
            background: '#fff', border: '1px dashed #999', color: '#333',
            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}
        >
          <Plus size={16} /> Add Banner
        </button>
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

const iconBtnStyle = (disabled) => ({
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '5px 7px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
  display: 'flex',
  alignItems: 'center',
});

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' };
