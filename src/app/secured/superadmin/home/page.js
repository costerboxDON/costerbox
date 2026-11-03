"use client";
import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload as UploadIcon, Save, Image as ImageIcon, X, Plus, ChevronUp, ChevronDown, Trash2, Smartphone } from 'lucide-react';
import { compressImage } from '../../../../utils/imageCompress';

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

// Mobile banners: image + optional link only (text is baked into the image)
const emptyMobileBanner = () => ({
  image: '',
  link: '',
  _file: null,
  _preview: '',
});

export default function SuperadminHomePage() {
  const [heroBanners, setHeroBanners] = useState([emptyBanner()]);
  const [mobileBanners, setMobileBanners] = useState([]); // empty = mobile uses the normal hero
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

        if (Array.isArray(data.mobileBanners)) {
          setMobileBanners(data.mobileBanners.map(b => ({ ...emptyMobileBanner(), ...b, _preview: b.image || '' })));
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
          // hero banners are wide: allow a larger long edge, still re-encoded to JPEG
          const heroFile = await compressImage(banner._file, { maxEdge: 2400, maxBytes: 600 * 1024 });
          const imgRef = ref(storage, `home/${Date.now()}_${index}_${heroFile.name}`);
          await uploadBytes(imgRef, heroFile);
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

      // Mobile-only banners (portrait images, shown only on phone-width screens)
      const finalMobileBanners = (await Promise.all(mobileBanners.map(async (banner, index) => {
        let finalImageUrl = banner.image;

        if (banner._file) {
          const mFile = await compressImage(banner._file, { maxEdge: 1920, maxBytes: 600 * 1024 });
          const imgRef = ref(storage, `home/mobile_${Date.now()}_${index}_${mFile.name}`);
          await uploadBytes(imgRef, mFile);
          finalImageUrl = await getDownloadURL(imgRef);
        }

        return { image: finalImageUrl, link: (banner.link || '').trim() };
      }))).filter(b => b.image); // drop slots with no image

      await setDoc(doc(db, 'siteSettings', 'home'), {
        heroBanners: finalBanners,
        mobileBanners: finalMobileBanners,
        homeProducts
      }, { merge: true });

      setHeroBanners(finalBanners.map(b => ({ ...emptyBanner(), ...b, _preview: b.image })));
      setMobileBanners(finalMobileBanners.map(b => ({ ...emptyMobileBanner(), ...b, _preview: b.image })));
      alert("Home page settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings: " + (err?.code || err?.message || 'unknown error'));
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

  // Mobile banner handlers
  const addMobileBanner = () => setMobileBanners(prev => [...prev, emptyMobileBanner()]);
  const removeMobileBanner = (index) => setMobileBanners(prev => prev.filter((_, i) => i !== index));
  const handleMobileImageSelect = (index, file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    setMobileBanners(prev => prev.map((b, i) => i === index ? { ...b, _file: file, _preview: URL.createObjectURL(file) } : b));
  };
  const removeMobileImage = (index) => {
    setMobileBanners(prev => prev.map((b, i) => i === index ? { ...b, _file: null, _preview: '', image: '' } : b));
  };
  const handleMobileLinkChange = (index, value) => {
    setMobileBanners(prev => prev.map((b, i) => i === index ? { ...b, link: value } : b));
  };
  const moveMobileBanner = (index, direction) => {
    setMobileBanners(prev => {
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

      {/* ============ MOBILE BANNER SETTINGS ============ */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Smartphone size={20} /> Mobile Banner Settings
        </h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
          These banners are shown <strong>only on mobile screens</strong> (phones, 900px wide or less) and never on desktop.
          If you add none, mobile visitors see the normal hero banners above.
        </p>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          Recommended image: full portrait <strong>1080 x 1920 px (9:16)</strong>. Put any text inside the image itself. Banners rotate every 3 seconds.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {mobileBanners.map((banner, index) => (
            <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#666' }}>Mobile Banner {index + 1}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => moveMobileBanner(index, -1)} disabled={index === 0} title="Move up" style={iconBtnStyle(index === 0)}>
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => moveMobileBanner(index, 1)} disabled={index === mobileBanners.length - 1} title="Move down" style={iconBtnStyle(index === mobileBanners.length - 1)}>
                    <ChevronDown size={15} />
                  </button>
                  <button onClick={() => removeMobileBanner(index)} title="Remove banner" style={{ ...iconBtnStyle(false), color: '#dc2626' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <label style={labelStyle}>Mobile Banner Image</label>
                  {banner._preview ? (
                    <div style={{ position: 'relative', width: '180px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                      <img src={banner._preview} alt="Mobile banner preview" style={{ width: '100%', display: 'block' }} />
                      <button
                        onClick={() => removeMobileImage(index)}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: '#fff', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => { e.preventDefault(); handleMobileImageSelect(index, e.dataTransfer.files[0]); }}
                      onClick={() => document.getElementById(`mobile-banner-file-${index}`)?.click()}
                      style={{ width: '180px', height: '320px', border: '2px dashed #ccc', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer', background: '#fff', padding: '10px', boxSizing: 'border-box' }}
                    >
                      <UploadIcon size={28} color="#aaa" style={{ marginBottom: '8px' }} />
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Click or drag a portrait image</p>
                      <input
                        id={`mobile-banner-file-${index}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleMobileImageSelect(index, e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={labelStyle}>Link when tapped (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. /products or /shop/abc123"
                    value={banner.link}
                    onChange={e => handleMobileLinkChange(index, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {mobileBanners.length === 0 && (
          <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', marginBottom: '0' }}>
            No mobile banners added, so mobile visitors currently see the regular hero banners.
          </p>
        )}

        <button
          onClick={addMobileBanner}
          style={{
            marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px',
            background: '#fff', border: '1px dashed #999', color: '#333',
            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}
        >
          <Plus size={16} /> Add Mobile Banner
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
